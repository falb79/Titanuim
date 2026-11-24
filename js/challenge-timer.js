// مؤقت الجلسة: يمشي مع العضوة تمرين تمرين (إحماء ← تمرين/راحة × جولتين ← تهدئة).
// • السيرفر يسجل وقت البداية (challenge_start) ويرفض الإنهاء قبل ما تمر المدة كاملة.
// • المؤقت يحسب من الوقت الفعلي، فلو قفلت الشاشة أو طلعت من الصفحة يكمل صح.
// • الجلسة الشغالة تنحفظ في هذا الجهاز، فلو حدّثت الصفحة ترجع لها.
(function () {
  var C = window.Challenge;
  var sb = window.sb;
  if (!C || !sb) return;

  var h = C.h, t = h.t, fmt = h.fmt, el = h.el, svg = h.svg;
  var STORE_KEY = 'challengeRun';

  var ICON_PAUSE = '<path d="M9 5v14M15 5v14"/>';
  var ICON_PLAY = '<path d="M8 5.5v13l10-6.5-10-6.5z"/>';
  var ICON_SOUND = '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>';
  var ICON_MUTE = '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>';
  var ICON_X = '<path d="M6 6l12 12M18 6L6 18"/>';
  var ICON_CHECK = '<path d="M5 13l4 4L19 7"/>';

  /* =====================================================================
     الحالة
     ===================================================================== */
  var run = null;       // { logId, sessionId, startedAt, pausedMs, pausedAt, uid }
  var plan = null;      // { session, segments: [...], total }
  var ui = {};          // عناصر الشاشة
  var tick = null;
  var lastSeg = -1;
  var lastSec = -1;
  var muted = false;
  var audio = null;
  var wakeLock = null;
  var finishing = false;

  function save() {
    try {
      if (run) localStorage.setItem(STORE_KEY, JSON.stringify(run));
      else localStorage.removeItem(STORE_KEY);
    } catch (e) { /* التخزين غير متاح */ }
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
  }

  /* =====================================================================
     بناء خطة الجلسة (قائمة المقاطع بالترتيب)
     ===================================================================== */
  function buildPlan(session) {
    var steps = C.state.steps.filter(function (x) { return x.session_id === session.id; });
    function phase(p) {
      return steps.filter(function (x) { return x.phase === p; })
                  .sort(function (a, b) { return a.sort_order - b.sort_order; });
    }
    var segs = [];
    phase('warmup').forEach(function (x) { segs.push({ kind: 'warmup', step: x, sec: x.seconds }); });
    var main = phase('main');
    for (var r = 1; r <= session.rounds; r++) {
      main.forEach(function (x, i) {
        segs.push({ kind: 'work', step: x, sec: session.work_sec, round: r, idx: i + 1, of: main.length });
        if (session.rest_sec > 0) {
          segs.push({ kind: 'rest', step: x, sec: session.rest_sec, round: r });
        }
      });
    }
    phase('cooldown').forEach(function (x) { segs.push({ kind: 'cooldown', step: x, sec: x.seconds }); });

    var at = 0;
    segs.forEach(function (s) { s.from = at; at += s.sec; });

    // الراحة تعرض اسم التمرين اللي بعدها
    segs.forEach(function (s, i) { if (s.kind === 'rest') s.next = segs[i + 1] ? segs[i + 1].step : null; });

    // المدة لازم تساوي مدة الجلسة (السيرفر يقيسها كذا)
    var total = Math.max(at, session.duration_min * 60);
    return { session: session, segments: segs, total: total };
  }

  function elapsedSec() {
    if (!run) return 0;
    var now = run.pausedAt || Date.now();
    return Math.max(0, (now - run.startedAt - run.pausedMs) / 1000);
  }

  function segmentAt(sec) {
    var s = plan.segments;
    for (var i = 0; i < s.length; i++) if (sec < s[i].from + s[i].sec) return i;
    return s.length;   // خلصت
  }

  function clock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* =====================================================================
     الصوت والاهتزاز وإبقاء الشاشة شغالة
     ===================================================================== */
  function beep(freq, ms) {
    if (muted) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      var o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + ms / 1000 + 0.02);
    } catch (e) { /* الصوت غير متاح */ }
  }

  function buzz(pattern) {
    if (!muted && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* */ } }
  }

  function keepAwake() {
    if (!('wakeLock' in navigator) || wakeLock || !run || run.pausedAt) return;
    navigator.wakeLock.request('screen').then(function (l) {
      wakeLock = l;
      l.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () { /* غير مدعوم أو البطارية منخفضة */ });
  }

  function letSleep() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) { /* */ } wakeLock = null; }
  }

  /* =====================================================================
     الشاشة
     ===================================================================== */
  function iconBtn(cls, icon, labelKey) {
    var b = el('button', cls);
    b.type = 'button';
    b.appendChild(svg(icon, 22));
    b.setAttribute('aria-label', t(labelKey));
    return b;
  }

  function buildUI() {
    var root = h.$('c-timer');
    root.textContent = '';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'c-t-name');

    var box = el('div', 'c-t-box');

    // الشريط العلوي: الجلسة + الصوت + إغلاق
    var top = el('div', 'c-t-top');
    var title = el('div', 'c-t-title');
    title.appendChild(el('strong', null, fmt('ch.t.sessionTitle', {
      n: plan.session.duration_min, level: t('ch.level.' + plan.session.level) })));
    ui.remaining = el('span', 'c-t-remaining');
    title.appendChild(ui.remaining);
    top.appendChild(title);
    ui.sound = iconBtn('c-t-icon', muted ? ICON_MUTE : ICON_SOUND, muted ? 'ch.t.soundOn' : 'ch.t.soundOff');
    ui.sound.addEventListener('click', toggleSound);
    top.appendChild(ui.sound);
    ui.close = iconBtn('c-t-icon', ICON_X, 'ch.t.cancel');
    ui.close.addEventListener('click', askCancel);
    top.appendChild(ui.close);
    box.appendChild(top);

    // شريط التقدم الكلي
    ui.bar = el('div', 'c-t-bar');
    ui.barFill = el('span');
    ui.bar.appendChild(ui.barFill);
    ui.bar.setAttribute('role', 'progressbar');
    ui.bar.setAttribute('aria-valuemin', '0');
    ui.bar.setAttribute('aria-valuemax', '100');
    ui.bar.setAttribute('aria-label', t('ch.t.progress'));
    box.appendChild(ui.bar);

    // المرحلة + الجولة
    var chips = el('div', 'c-t-chips');
    ui.phase = el('span', 'c-t-phase');
    ui.round = el('span', 'c-t-round');
    chips.appendChild(ui.phase);
    chips.appendChild(ui.round);
    box.appendChild(chips);

    // الدائرة والعد التنازلي
    var ring = el('div', 'c-t-ring');
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 120 120');
    s.setAttribute('aria-hidden', 'true');
    var bg = document.createElementNS(ns, 'circle');
    bg.setAttribute('cx', '60'); bg.setAttribute('cy', '60'); bg.setAttribute('r', '54');
    bg.setAttribute('class', 'c-t-ring-bg');
    ui.arc = document.createElementNS(ns, 'circle');
    ui.arc.setAttribute('cx', '60'); ui.arc.setAttribute('cy', '60'); ui.arc.setAttribute('r', '54');
    ui.arc.setAttribute('class', 'c-t-ring-fg');
    ui.arc.setAttribute('pathLength', '100');
    s.appendChild(bg); s.appendChild(ui.arc);
    ring.appendChild(s);
    ui.count = el('span', 'c-t-count');
    ui.count.setAttribute('aria-hidden', 'true');
    ring.appendChild(ui.count);
    box.appendChild(ring);

    // اسم التمرين
    ui.name = el('h2', 'c-t-name');
    ui.name.id = 'c-t-name';
    ui.name.setAttribute('aria-live', 'polite');
    box.appendChild(ui.name);
    ui.alt = el('p', 'c-t-alt');
    box.appendChild(ui.alt);
    ui.watch = el('a', 'c-watch c-t-watch');
    ui.watch.target = '_blank';
    ui.watch.rel = 'noopener noreferrer';
    box.appendChild(ui.watch);

    // التالي
    ui.next = el('p', 'c-t-next');
    box.appendChild(ui.next);

    // الأزرار
    var actions = el('div', 'c-t-actions');
    ui.pause = el('button', 'btn-secondary c-t-pause');
    ui.pause.type = 'button';
    ui.pause.addEventListener('click', togglePause);
    actions.appendChild(ui.pause);

    ui.finish = el('button', 'btn-primary c-t-finish');
    ui.finish.type = 'button';
    ui.finish.addEventListener('click', finish);
    actions.appendChild(ui.finish);
    ui.finishHint = el('p', 'c-t-hint');
    actions.appendChild(ui.finishHint);
    ui.msg = el('p', 'c-form-msg');
    ui.msg.setAttribute('aria-live', 'assertive');
    ui.msg.hidden = true;
    actions.appendChild(ui.msg);
    box.appendChild(actions);

    // تأكيد الإلغاء (داخل الصفحة، مو نافذة المتصفح)
    ui.confirm = el('div', 'c-t-confirm');
    ui.confirm.hidden = true;
    ui.confirm.appendChild(el('p', null, t('ch.t.cancelQ')));
    var row = el('div', 'c-t-confirm-row');
    var yes = el('button', 'btn-secondary c-t-danger', t('ch.t.cancelYes'));
    yes.type = 'button';
    yes.addEventListener('click', cancelRun);
    var no = el('button', 'btn-primary', t('ch.t.cancelNo'));
    no.type = 'button';
    no.addEventListener('click', function () { ui.confirm.hidden = true; ui.close.focus(); });
    row.appendChild(no); row.appendChild(yes);
    ui.confirm.appendChild(row);
    box.appendChild(ui.confirm);

    root.appendChild(box);
    lastSeg = -1; lastSec = -1;
  }

  function phaseLabel(seg) {
    if (seg.kind === 'warmup') return t('ch.phase.warmup');
    if (seg.kind === 'cooldown') return t('ch.phase.cooldown');
    if (seg.kind === 'rest') return t('ch.t.rest');
    return t('ch.phase.main');
  }

  function stepName(step) { return step ? step['name_' + h.lang()] : ''; }
  function stepAlt(step) { return step ? step['name_' + (h.lang() === 'ar' ? 'en' : 'ar')] : ''; }

  function update() {
    if (!run || !plan) return;
    var sec = elapsedSec();
    var total = plan.total;
    var done = sec >= total;
    var i = segmentAt(sec);
    var seg = plan.segments[i];

    ui.barFill.style.width = Math.min(100, sec / total * 100).toFixed(2) + '%';
    ui.bar.setAttribute('aria-valuenow', String(Math.round(Math.min(100, sec / total * 100))));
    ui.remaining.textContent = done ? t('ch.t.doneShort') : fmt('ch.t.left', { time: clock(total - sec) });

    var root = h.$('c-timer');
    root.classList.toggle('is-paused', !!run.pausedAt);
    root.classList.toggle('is-done', done);

    if (done) {
      if (lastSeg !== 'done') {
        lastSeg = 'done';
        root.setAttribute('data-kind', 'done');
        ui.phase.textContent = t('ch.t.doneShort');
        ui.round.hidden = true;
        ui.count.textContent = '';
        ui.count.appendChild(svg(ICON_CHECK, 64));
        ui.arc.style.strokeDashoffset = '0';
        ui.name.textContent = t('ch.t.doneTitle');
        ui.alt.textContent = t('ch.t.doneText');
        ui.watch.hidden = true;
        ui.next.hidden = true;
        ui.pause.hidden = true;
        ui.finish.disabled = finishing;
        ui.finish.textContent = t('ch.t.finish');
        ui.finishHint.hidden = true;
        beep(988, 220); setTimeout(function () { beep(1318, 320); }, 240);
        buzz([120, 80, 220]);
        letSleep();
      }
      return;
    }

    var segLeft = seg.from + seg.sec - sec;

    if (i !== lastSeg) {
      lastSeg = i;
      root.setAttribute('data-kind', seg.kind);
      ui.phase.textContent = phaseLabel(seg);
      if (seg.round) {
        ui.round.hidden = false;
        ui.round.textContent = seg.kind === 'work'
          ? fmt('ch.t.roundEx', { r: seg.round, rr: plan.session.rounds, i: seg.idx, n: seg.of })
          : fmt('ch.t.round', { r: seg.round, rr: plan.session.rounds });
      } else {
        ui.round.hidden = true;
      }

      if (seg.kind === 'rest') {
        ui.name.textContent = t('ch.t.restTitle');
        ui.alt.textContent = seg.next ? fmt('ch.t.getReady', { name: stepName(seg.next) }) : '';
        ui.watch.hidden = true;
      } else {
        ui.name.textContent = stepName(seg.step);
        ui.alt.textContent = stepAlt(seg.step);
        ui.alt.lang = h.lang() === 'ar' ? 'en' : 'ar';
        var url = seg.step && seg.step.video_url;
        if (url && /^https:\/\//.test(url)) {
          ui.watch.hidden = false;
          ui.watch.href = url;
          ui.watch.textContent = '';
          ui.watch.appendChild(svg(ICON_PLAY, 14));
          ui.watch.appendChild(document.createTextNode(t('ch.watch')));
          ui.watch.setAttribute('aria-label', fmt('ch.watchLabel', { name: stepName(seg.step) }));
        } else {
          ui.watch.hidden = true;
        }
      }

      // التالي
      var nxt = plan.segments[i + 1];
      if (nxt && nxt.kind === 'rest') nxt = plan.segments[i + 2];
      if (nxt && seg.kind !== 'rest') {
        ui.next.hidden = false;
        ui.next.textContent = fmt('ch.t.next', { name: stepName(nxt.step) });
      } else {
        ui.next.hidden = true;
      }

      ui.finish.disabled = true;
      ui.finish.textContent = t('ch.t.finish');
      ui.finishHint.hidden = false;

      if (lastSec !== -1) {   // ما نصفّر عند فتح الشاشة أول مرة
        beep(seg.kind === 'rest' ? 523 : 880, 180);
        buzz(seg.kind === 'rest' ? 80 : [60, 60, 60]);
      }
    }

    var whole = Math.ceil(segLeft);
    ui.count.textContent = clock(segLeft);
    ui.arc.style.strokeDashoffset = String((1 - segLeft / seg.sec) * 100);
    ui.finishHint.textContent = fmt('ch.t.finishHint', { time: clock(total - sec) });
    ui.pause.hidden = false;
    ui.pause.textContent = '';
    ui.pause.appendChild(svg(run.pausedAt ? ICON_PLAY : ICON_PAUSE, 20));
    ui.pause.appendChild(document.createTextNode(t(run.pausedAt ? 'ch.t.resume' : 'ch.t.pause')));

    // تنبيه آخر 3 ثواني
    if (!run.pausedAt && whole !== lastSec && whole <= 3 && whole >= 1) beep(660, 90);
    lastSec = whole;
  }

  /* =====================================================================
     التحكم
     ===================================================================== */
  function open() {
    var root = h.$('c-timer');
    buildUI();
    root.hidden = false;
    document.body.classList.add('c-no-scroll');
    update();
    if (tick) clearInterval(tick);
    tick = setInterval(update, 250);
    keepAwake();
    setTimeout(function () { ui.pause.focus(); }, 50);
  }

  function close() {
    var root = h.$('c-timer');
    if (tick) { clearInterval(tick); tick = null; }
    letSleep();
    root.hidden = true;
    root.textContent = '';
    document.body.classList.remove('c-no-scroll');
    var startBtn = document.getElementById('c-start');
    if (startBtn) startBtn.focus();
  }

  function togglePause() {
    if (!run) return;
    if (run.pausedAt) {
      run.pausedMs += Date.now() - run.pausedAt;
      run.pausedAt = null;
      keepAwake();
    } else {
      run.pausedAt = Date.now();
      letSleep();
    }
    save();
    update();
  }

  function toggleSound() {
    muted = !muted;
    try { localStorage.setItem('challengeMuted', muted ? '1' : '0'); } catch (e) { /* */ }
    ui.sound.textContent = '';
    ui.sound.appendChild(svg(muted ? ICON_MUTE : ICON_SOUND, 22));
    ui.sound.setAttribute('aria-label', t(muted ? 'ch.t.soundOn' : 'ch.t.soundOff'));
  }

  function askCancel() {
    ui.confirm.hidden = false;
    ui.confirm.querySelector('.btn-primary').focus();
  }

  function cancelRun() {
    run = null; plan = null;
    save();
    close();
  }

  function showMsg(text, ok) {
    ui.msg.hidden = false;
    ui.msg.className = 'c-form-msg ' + (ok ? 'is-ok' : 'is-bad');
    ui.msg.textContent = text;
  }

  function finish() {
    if (!run || finishing) return;
    finishing = true;
    ui.finish.disabled = true;
    ui.finish.textContent = t('ch.sending');
    sb.rpc('challenge_finish', { p_log: run.logId }).then(function (r) {
      if (r.error) throw r.error;
      var res = r.data || {};
      run = null; save();
      finishing = false;
      showSuccess(res);
      C.refresh().catch(function () { /* تتحدث لاحقاً */ });
    }).catch(function (err) {
      finishing = false;
      var m = err && err.message ? err.message : '';
      if (m.indexOf('too_early') !== -1) {
        // فرق بسيط في الوقت بين الجهاز والسيرفر: نحاول بعد ثواني
        showMsg(t('ch.err.too_early'), false);
        ui.finish.textContent = t('ch.t.finish');
        setTimeout(function () { ui.finish.disabled = false; }, 5000);
        return;
      }
      if (m.indexOf('bad_log') !== -1 || m.indexOf('expired') !== -1) { run = null; save(); }
      showMsg(C.errorText(err), false);
      ui.finish.textContent = t('ch.t.finish');
      ui.finish.disabled = !run;
      if (!run) { ui.close.focus(); }
    });
  }

  function showSuccess(res) {
    ui.finish.hidden = true;
    ui.finishHint.hidden = true;
    ui.name.textContent = fmt('ch.t.gotPoints', { n: res.points });
    ui.alt.textContent = res.day_points > res.points
      ? fmt('ch.t.keptHigher', { n: res.day_points })
      : t('ch.t.thanks');
    var back = el('button', 'btn-primary c-t-back', t('ch.t.back'));
    back.type = 'button';
    back.addEventListener('click', close);
    ui.finish.parentNode.insertBefore(back, ui.finish);
    ui.close.onclick = null;
    ui.close.removeEventListener('click', askCancel);
    ui.close.addEventListener('click', close);
    back.focus();
  }

  function start(session) {
    var btn = document.getElementById('c-start');
    if (btn) { btn.disabled = true; btn.textContent = t('ch.sending'); }
    // نجهّز الصوت داخل الضغطة (المتصفحات تمنعه بدون ضغطة)
    try { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* */ }

    sb.rpc('challenge_start', { p_session: session.id }).then(function (r) {
      if (r.error) throw r.error;
      run = { logId: r.data, sessionId: session.id, startedAt: Date.now(), pausedMs: 0, pausedAt: null, uid: C.state.uid };
      save();
      plan = buildPlan(session);
      C.refresh().catch(function () { /* */ });   // يرجّع الزر لحالته
      open();
    }).catch(function (err) {
      C.refresh().catch(function () { /* */ });
      var host = document.querySelector('.c-start-bar');
      if (host) {
        var p = host.querySelector('.c-form-msg') || el('p', 'c-form-msg is-bad');
        p.setAttribute('role', 'alert');
        p.textContent = C.errorText(err);
        host.appendChild(p);
      }
    });
  }

  /* =====================================================================
     الأحداث
     ===================================================================== */
  try { muted = localStorage.getItem('challengeMuted') === '1'; } catch (e) { /* */ }

  document.addEventListener('challenge:start', function (e) { start(e.detail.session); });

  // بعد تحميل الصفحة: لو فيه جلسة شغالة في هذا الجهاز نرجع لها
  function tryRestore() {
    if (run || !C.state.me) return;
    var saved = loadSaved();
    if (!saved || saved.uid !== C.state.uid) return;
    // الجلسات الأقدم من 4 ساعات ما يقبلها السيرفر
    if (Date.now() - saved.startedAt > 4 * 3600 * 1000) { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* */ } return; }
    var session = C.state.sessions.filter(function (s) { return s.id === saved.sessionId; })[0];
    if (!session) return;
    run = saved;
    plan = buildPlan(session);
    open();
  }

  document.addEventListener('challenge:loaded', tryRestore);
  tryRestore();   // لو الصفحة تحمّلت قبل هذا الملف

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && run) { keepAwake(); update(); }
  });

  document.addEventListener('keydown', function (e) {
    var root = h.$('c-timer');
    if (!root || root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); if (run) askCancel(); else close(); }
    // نبقي التنقل بالـ Tab داخل الشاشة
    if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(root.querySelectorAll('button, a[href]'), function (n) {
        return !n.disabled && !n.hidden && n.offsetParent !== null;
      });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener('langchange', function () {
    if (run && plan && !h.$('c-timer').hidden) { buildUI(); update(); }
  });
})();
