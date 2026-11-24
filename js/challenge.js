// صفحة التحدي: تقدّم العضوة + اختيار الجلسة (المدة والمستوى) + معاينة التمارين.
// كل القواعد (النقاط، 3 أيام بالأسبوع، المؤقت) محمية داخل قاعدة البيانات،
// وهذا الملف فقط يعرضها ويستدعي الدوال.
(function () {
  var sb = window.sb;

  /* =====================================================================
     إعدادات
     ===================================================================== */
  var POINTS = { 15: 10, 20: 15, 30: 20 };   // للعرض فقط. الحساب الحقيقي في challenge_points()
  var DURATIONS = [15, 20, 30];
  var LEVELS = ['beginner', 'intermediate', 'advanced'];
  var PHASES = ['warmup', 'main', 'cooldown'];

  /* =====================================================================
     أدوات
     ===================================================================== */
  function $(id) { return document.getElementById(id); }
  function t(key) { return I18N.t(key); }
  function lang() { return I18N.getLang(); }
  function L(row, base) { return row[base + '_' + lang()] || row[base + '_ar'] || ''; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmt(key, vars) {
    var s = t(key);
    Object.keys(vars || {}).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  function svg(paths, size) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    n.setAttribute('viewBox', '0 0 24 24');
    n.setAttribute('width', String(size || 18));
    n.setAttribute('height', String(size || 18));
    n.setAttribute('fill', 'none');
    n.setAttribute('stroke', 'currentColor');
    n.setAttribute('stroke-width', '2');
    n.setAttribute('stroke-linecap', 'round');
    n.setAttribute('stroke-linejoin', 'round');
    n.setAttribute('aria-hidden', 'true');
    n.setAttribute('focusable', 'false');
    n.innerHTML = paths;   // نصوص ثابتة من الكود، مو من المستخدم
    return n;
  }

  var ICON_INFO = '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>';
  var ICON_PLAY = '<path d="M8 5.5v13l10-6.5-10-6.5z"/>';

  // التاريخ يجي من قاعدة البيانات بصيغة 2026-11-29. نعرضه بالتقويم الميلادي وبأرقام إنجليزية.
  function parseDate(s) {
    var p = String(s).split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }

  function formatDate(s, withWeekday) {
    var opts = { day: 'numeric', month: 'long', timeZone: 'UTC' };
    if (withWeekday) opts.weekday = 'long';
    var loc = lang() === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-GB';
    try { return new Intl.DateTimeFormat(loc, opts).format(parseDate(s)).replace('،', ''); }
    catch (e) { return s; }
  }

  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }

  // «باقي 3 أيام» / «باقي 11 يوماً» (العدد في العربي يتغير حسب الرقم)
  function daysText(n) {
    if (n === 2) return t('ch.days2');
    if (lang() === 'ar' && n >= 11) return fmt('ch.days11', { n: n });
    return fmt('ch.days3', { n: n });
  }

  function minutesText(sec) {
    var m = Math.round(sec / 60);
    if (m === 1) return t('ch.phaseMin1');
    if (m === 2) return t('ch.phaseMin2');
    return fmt('ch.phaseMin', { n: m });
  }

  /* =====================================================================
     الحالة
     ===================================================================== */
  var state = {
    me: null,          // ناتج get_my_challenge
    sessions: [],      // الجلسات التسع
    steps: [],         // كل التمارين
    duration: 15,
    level: 'beginner',
    uid: null,         // رقم الحساب (لحفظ الجلسة الشغالة على هذا الجهاز)
    classMsg: null     // رسالة نموذج الكلاس { ok: true/false, text }
  };

  /* =====================================================================
     رسائل الأخطاء (الدوال في قاعدة البيانات ترجع كلمة مثل week_full)
     ===================================================================== */
  var ERRORS = ['not_member', 'not_started', 'ended', 'week_full', 'bad_session',
                'too_many', 'too_early', 'expired', 'bad_log', 'bad_names'];

  function errorText(err) {
    var m = err && err.message ? String(err.message) : '';
    for (var i = 0; i < ERRORS.length; i++) {
      if (m.indexOf(ERRORS[i]) !== -1) return t('ch.err.' + ERRORS[i]);
    }
    return t('ch.err.generic');
  }

  function currentSession() {
    for (var i = 0; i < state.sessions.length; i++) {
      var s = state.sessions[i];
      if (s.duration_min === state.duration && s.level === state.level) return s;
    }
    return null;
  }

  /* =====================================================================
     بطاقة التقدّم
     ===================================================================== */
  function renderProgress() {
    var host = $('c-progress');
    host.textContent = '';
    var me = state.me || {};
    var week = me.week || [];

    var top = el('div', 'c-progress-top');
    var title = el('h2', 'c-card-title', t('ch.progressTitle'));
    title.id = 'c-progress-title';
    top.appendChild(title);
    var score = el('div', 'c-score');
    var num = el('strong', null, String(me.total_points || 0));
    score.appendChild(num);
    score.appendChild(document.createTextNode(t('ch.myPoints')));
    top.appendChild(score);
    host.appendChild(top);

    // ترتيبي (يعبّيه ملف لوحة الترتيب js/challenge-board.js)
    var rank = el('a', 'c-myrank');
    rank.id = 'c-myrank';
    rank.href = '#c-board';
    rank.hidden = true;
    host.appendChild(rank);

    // أيام الأسبوع الثلاثة
    var wk = el('div', 'c-week');
    var head = el('div', 'c-week-head');
    head.appendChild(el('span', null, t('ch.thisWeek')));
    head.appendChild(el('span', null, fmt('ch.weekCount', { n: Math.min(week.length, 3) })));
    wk.appendChild(head);

    var slots = el('ol', 'c-slots');
    for (var i = 0; i < 3; i++) {
      var d = week[i];
      var li = el('li', 'c-slot');
      if (!d) {
        li.appendChild(el('span', 'c-slot-icon', '○'));
        li.appendChild(el('span', null, t('ch.slotEmpty')));
      } else {
        var dayName = new Intl.DateTimeFormat(lang() === 'ar' ? 'ar' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(parseDate(d.log_date));
        if (d.points > 0) {
          li.className += ' is-done';
          li.appendChild(el('span', 'c-slot-icon', '✓'));
          li.appendChild(el('strong', null, dayName));
          li.appendChild(el('span', null, fmt('ch.pointsN', { n: d.points })));
        } else {
          li.className += ' is-pending';
          li.appendChild(el('span', 'c-slot-icon', '⏳'));
          li.appendChild(el('strong', null, dayName));
          li.appendChild(el('span', null, t('ch.slotPending')));
        }
      }
      slots.appendChild(li);
    }
    wk.appendChild(slots);
    host.appendChild(wk);

    // رسالة الحالة
    var msg = el('p', 'c-state');
    var st = me.state;
    var todayCounted = week.some(function (w) { return w.log_date === me.today; });
    if (st === 'ok') {
      msg.textContent = t(todayCounted ? 'ch.state.okToday' : 'ch.state.ok');
      if (todayCounted) msg.className += ' is-good';
    } else if (st === 'not_started' && me.season) {
      var left = daysBetween(me.today, me.season.start_date);
      msg.textContent = left <= 1 ? t('ch.state.not_started1')
        : fmt('ch.state.not_started', { date: formatDate(me.season.start_date, true), days: daysText(left) });
      msg.className += ' is-wait';
    } else if (st === 'week_full') {
      msg.textContent = t('ch.state.week_full');
      msg.className += ' is-good';
    } else {
      msg.textContent = t('ch.state.ended');
    }
    host.appendChild(msg);
  }

  /* =====================================================================
     اختيار الجلسة
     ===================================================================== */
  // مجموعة أزرار اختيار (radio) يتنقل فيها بالأسهم
  function radioGroup(cls, labelKey, items, isOn, onPick, build) {
    var group = el('div', cls);
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', t(labelKey));
    items.forEach(function (item) {
      var b = el('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      var on = isOn(item);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      build(b, item);
      b.addEventListener('click', function () { onPick(item); });
      group.appendChild(b);
    });
    group.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: -1, ArrowLeft: 1, ArrowDown: 1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      var dir = keys[e.key];
      if (document.documentElement.dir === 'ltr' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) dir = -dir;
      var idx = items.findIndex(isOn);
      var next = items[(idx + dir + items.length) % items.length];
      onPick(next, true);
    });
    return group;
  }

  function focusChecked(cls) {
    var b = document.querySelector('.' + cls + ' [aria-checked="true"]');
    if (b) b.focus();
  }

  function renderPicker() {
    var host = $('c-picker');
    host.textContent = '';
    var title = el('h2', 'c-card-title', t('ch.pickTitle'));
    title.id = 'c-picker-title';
    host.appendChild(title);

    // 1) المدة
    host.appendChild(el('span', 'c-step-label', '1. ' + t('ch.step1')));
    host.appendChild(radioGroup('c-durations', 'ch.step1', DURATIONS,
      function (d) { return d === state.duration; },
      function (d, viaKey) { state.duration = d; renderPicker(); if (viaKey) focusChecked('c-durations'); },
      function (b, d) {
        b.className = 'c-dur';
        b.appendChild(el('span', 'c-dur-num', String(d)));
        b.appendChild(el('span', 'c-dur-unit', t('ch.min')));
        b.appendChild(el('span', 'c-dur-pts', fmt('ch.pointsN', { n: POINTS[d] })));
      }));

    // 2) المستوى
    var lbl = el('span', 'c-step-label', '2. ' + t('ch.step2'));
    lbl.style.marginBlockStart = '16px';
    host.appendChild(lbl);
    host.appendChild(radioGroup('c-levels', 'ch.step2', LEVELS,
      function (l) { return l === state.level; },
      function (l, viaKey) { state.level = l; renderPicker(); if (viaKey) focusChecked('c-levels'); },
      function (b, l) { b.className = 'c-lvl'; b.textContent = t('ch.level.' + l); }));

    var note = el('p', 'c-note');
    note.appendChild(svg(ICON_INFO, 16));
    note.appendChild(el('span', null, t('ch.levelNote')));
    host.appendChild(note);

    // 3) المعاينة
    var s = currentSession();
    if (s) host.appendChild(renderPreview(s));

    // زر البداية
    host.appendChild(renderStartBar(s));
  }

  function renderPreview(s) {
    var box = el('div', 'c-preview');
    box.appendChild(el('p', 'c-goal', L(s, 'goal')));

    var meta = el('ul', 'c-meta');
    meta.appendChild(el('li', null, fmt('ch.work', { n: s.work_sec })));
    meta.appendChild(el('li', null, fmt('ch.rest', { n: s.rest_sec })));
    meta.appendChild(el('li', null, s.rounds === 2 ? t('ch.rounds2') : fmt('ch.rounds', { n: s.rounds })));
    box.appendChild(meta);

    var steps = state.steps.filter(function (x) { return x.session_id === s.id; });
    var other = lang() === 'ar' ? 'en' : 'ar';

    PHASES.forEach(function (ph) {
      var list = steps.filter(function (x) { return x.phase === ph; })
                      .sort(function (a, b) { return a.sort_order - b.sort_order; });
      if (!list.length) return;

      var secs = ph === 'main'
        ? list.length * (s.work_sec + s.rest_sec) * s.rounds
        : list.reduce(function (sum, x) { return sum + x.seconds; }, 0);

      var sec = el('section', 'c-phase');
      var head = el('div', 'c-phase-head');
      head.appendChild(el('h3', null, t('ch.phase.' + ph)));
      head.appendChild(el('span', null, minutesText(secs)));
      sec.appendChild(head);
      sec.appendChild(el('p', 'c-phase-how', ph === 'main' ? t('ch.mainHow') : t('ch.eachMin')));

      var ul = el('ol', 'c-ex-list');
      list.forEach(function (x, k) {
        var li = el('li', 'c-ex');
        li.appendChild(el('span', 'c-ex-num', String(k + 1)));
        var name = el('span', 'c-ex-name', x['name_' + lang()]);
        var alt = el('span', 'c-ex-alt', x['name_' + other]);
        alt.lang = other;
        name.appendChild(alt);
        li.appendChild(name);
        if (x.video_url && /^https:\/\//.test(x.video_url)) {
          var a = el('a', 'c-watch');
          a.href = x.video_url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.setAttribute('aria-label', fmt('ch.watchLabel', { name: x['name_' + lang()] }));
          a.appendChild(svg(ICON_PLAY, 14));
          a.appendChild(document.createTextNode(t('ch.watch')));
          li.appendChild(a);
        }
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      box.appendChild(sec);
    });
    return box;
  }

  function renderStartBar(s) {
    var bar = el('div', 'c-start-bar');
    var btn = el('button', 'btn-primary c-start');
    btn.type = 'button';
    btn.id = 'c-start';
    var me = state.me || {};

    if (me.state === 'ok' && s) {
      btn.appendChild(el('span', null, t('ch.start')));
      btn.appendChild(el('span', 'c-start-pts', fmt('ch.pointsN', { n: POINTS[s.duration_min] })));
      // الخطوة 5: هنا نشغّل المؤقت
      btn.addEventListener('click', function () { document.dispatchEvent(new CustomEvent('challenge:start', { detail: { session: s } })); });
    } else {
      btn.disabled = true;
      btn.textContent = me.state === 'not_started' && me.season
        ? fmt('ch.startSoon', { date: formatDate(me.season.start_date, false) })
        : (me.state === 'week_full' ? t('ch.startDone') : t('ch.startClosed'));
    }
    bar.appendChild(btn);
    return bar;
  }

  /* =====================================================================
     تسجيل كلاس مع المدربة
     ===================================================================== */
  function renderClass() {
    var host = $('c-class');
    host.textContent = '';
    host.hidden = false;
    var me = state.me || {};

    var head = el('div', 'c-class-head');
    var title = el('h2', 'c-card-title', t('ch.classTitle'));
    title.id = 'c-class-title';
    head.appendChild(title);
    head.appendChild(el('span', 'c-dur-pts', fmt('ch.pointsN', { n: 25 })));
    host.appendChild(head);
    host.setAttribute('aria-labelledby', 'c-class-title');
    host.appendChild(el('p', 'c-class-text', t('ch.classText')));

    var form = el('form', 'c-form');
    form.noValidate = true;

    function field(id, labelKey, hintKey) {
      var lab = el('label', null, t(labelKey));
      lab.htmlFor = id;
      form.appendChild(lab);
      var inp = el('input');
      inp.id = id;
      inp.type = 'text';
      inp.maxLength = 60;
      inp.autocomplete = 'off';
      inp.required = true;
      form.appendChild(inp);
      if (hintKey) form.appendChild(el('p', 'c-hint', t(hintKey)));
      return inp;
    }

    var coach = field('c-coach', 'ch.coachName', null);
    var cls = field('c-classname', 'ch.className', 'ch.classNameHint');

    // التاريخ يتسجل تلقائياً (اليوم)
    if (me.today) {
      var date = el('p', 'c-class-date');
      date.appendChild(el('span', null, t('ch.classDate') + ' '));
      date.appendChild(el('strong', null, formatDate(me.today, true)));
      form.appendChild(date);
    }

    var msg = el('p', 'c-form-msg');
    msg.setAttribute('aria-live', 'polite');
    if (state.classMsg) {
      msg.textContent = state.classMsg.text;
      msg.className += state.classMsg.ok ? ' is-ok' : ' is-bad';
    } else {
      msg.hidden = true;
    }
    form.appendChild(msg);

    var btn = el('button', 'btn-primary', t('ch.classSubmit'));
    btn.type = 'submit';
    if (me.state !== 'ok') {
      btn.disabled = true;
      coach.disabled = true;
      cls.disabled = true;
    }
    form.appendChild(btn);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = coach.value.trim(), b = cls.value.trim();
      if (Array.from(a).length < 2 || Array.from(b).length < 2) {
        state.classMsg = { ok: false, text: t('ch.err.bad_names') };
        msg.hidden = false; msg.className = 'c-form-msg is-bad'; msg.textContent = state.classMsg.text;
        (Array.from(a).length < 2 ? coach : cls).focus();
        return;
      }
      btn.disabled = true;
      btn.textContent = t('ch.sending');
      sb.rpc('challenge_log_class', { p_coach: a, p_class: b }).then(function (r) {
        if (r.error) throw r.error;
        state.classMsg = { ok: true, text: t('ch.classDone') };
        return refresh();
      }).catch(function (err) {
        state.classMsg = { ok: false, text: errorText(err) };
        renderClass();
      });
    });

    host.appendChild(form);
  }

  /* =====================================================================
     البوابة: تحميل / قفل / عضوية
     ===================================================================== */
  var statusEl = $('c-status'), retryBtn = $('c-retry'), lock = $('c-lock'),
      noMember = $('c-nomember'), app = $('c-app');

  function setStatus(key) {
    if (!key) { statusEl.hidden = true; statusEl.removeAttribute('data-i18n'); statusEl.textContent = ''; return; }
    statusEl.hidden = false;
    statusEl.setAttribute('data-i18n', key);
    statusEl.textContent = t(key);
  }

  function hideAll() { app.hidden = true; $('c-rules').hidden = true; lock.hidden = true; noMember.hidden = true; retryBtn.hidden = true; setStatus(null); }
  function showLocked() { hideAll(); lock.hidden = false; }
  function showNoMember() { hideAll(); noMember.hidden = false; }

  function renderAll() {
    renderProgress();
    renderPicker();
    renderClass();
  }

  // تحديث خفيف (بدون شاشة تحميل): بعد تسجيل جلسة أو كلاس
  function refresh() {
    return sb.rpc('get_my_challenge').then(function (r) {
      if (r.error || !r.data) throw r.error || new Error('empty');
      state.me = r.data;
      renderAll();
      document.dispatchEvent(new CustomEvent('challenge:refreshed'));
    });
  }

  function load() {
    hideAll();
    setStatus('ch.loading');
    return Promise.all([
      sb.rpc('get_my_challenge'),
      sb.from('challenge_sessions').select('*').order('id'),
      sb.from('challenge_steps').select('id, session_id, phase, sort_order, name_ar, name_en, video_url, seconds')
        .order('session_id').order('sort_order')
    ]).then(function (r) {
      var failed = r.map(function (x) { return x.error; }).filter(Boolean)[0];
      if (failed) {
        if (failed.status === 401 || failed.code === 'PGRST301') { showLocked(); return; }
        throw failed;
      }
      if (!r[0].data) {                    // الدالة ترجع فاضي لغير العضوات
        return Auth.isMember().then(function (member) {
          if (member === false) { showNoMember(); return; }
          throw new Error('empty');
        });
      }
      state.me = r[0].data;
      state.sessions = r[1].data || [];
      state.steps = r[2].data || [];
      setStatus(null);
      app.hidden = false;
      $('c-rules').hidden = false;
      renderAll();
      document.dispatchEvent(new CustomEvent('challenge:loaded'));
    }).catch(function () {
      hideAll();
      setStatus('ch.error');
      retryBtn.hidden = false;
    });
  }

  retryBtn.addEventListener('click', load);
  document.addEventListener('langchange', function () { state.classMsg = null; if (!app.hidden) renderAll(); });

  // للخطوات الجاية: إعادة تحميل الملخص بعد تسجيل جلسة
  // يستخدمها ملف المؤقت (js/challenge-timer.js)
  window.Challenge = {
    reload: load, refresh: refresh, state: state, errorText: errorText,
    h: { $: $, t: t, fmt: fmt, el: el, svg: svg, lang: lang, L: L, POINTS: POINTS, PHASES: PHASES }
  };

  /* ---------- البداية ---------- */
  if (!sb || !window.Auth) { setStatus('ch.error'); return; }

  Auth.getSession().then(function (session) {
    if (!session) { showLocked(); return; }
    state.uid = session.user && session.user.id;
    return Auth.isMember().then(function (member) {
      if (member === false) { showNoMember(); return; }
      load();
    });
  });
})();
