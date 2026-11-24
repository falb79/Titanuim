// لوحة الترتيب: كل العضوات حسب النقاط، وصف العضوة نفسها مميز، و🥇🥈🥉 للثلاث الأوائل.
// تتحدث تلقائياً كل 30 ثانية (وتوقف لما تكون الصفحة مخفية عشان ما نستهلك طلبات).
// الحساب كله في قاعدة البيانات (get_challenge_leaderboard)، وتعرض اللقب فقط.
(function () {
  var C = window.Challenge;
  var sb = window.sb;
  if (!C || !sb) return;

  var h = C.h, t = h.t, fmt = h.fmt, el = h.el;
  var REFRESH_MS = 30000;
  var MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

  var rows = null;        // آخر نتيجة
  var updatedAt = null;   // وقت آخر تحديث
  var failed = false;
  var timer = null;
  var loading = false;

  function host() { return h.$('c-board'); }

  function timeText(d) {
    try {
      return new Intl.DateTimeFormat(h.lang() === 'ar' ? 'ar-u-nu-latn' : 'en-GB',
        { hour: 'numeric', minute: '2-digit' }).format(d);
    } catch (e) { return ''; }
  }

  /* ---------- ترتيبي في بطاقة التقدّم ---------- */
  function renderMyRank() {
    var a = h.$('c-myrank');
    if (!a) return;
    var me = rows && rows.filter(function (r) { return r.is_me; })[0];
    if (!me) { a.hidden = true; return; }
    a.hidden = false;
    a.textContent = '';
    a.appendChild(el('span', 'c-myrank-medal', MEDALS[me.rank] || '🏅'));
    a.appendChild(el('span', null, fmt('ch.b.myRank', { r: me.rank, n: rows.length })));
    a.appendChild(el('span', 'c-myrank-go', t('ch.b.see')));
  }

  /* ---------- اللوحة ---------- */
  function render() {
    var box = host();
    if (!box) return;
    box.hidden = false;
    box.textContent = '';

    var head = el('div', 'c-board-head');
    var title = el('h2', 'c-card-title', t('ch.b.title'));
    title.id = 'c-board-title';
    head.appendChild(title);
    var live = el('span', 'c-live');
    live.appendChild(el('span', 'c-live-dot'));
    live.appendChild(document.createTextNode(updatedAt ? fmt('ch.b.updated', { time: timeText(updatedAt) }) : t('ch.b.auto')));
    head.appendChild(live);
    box.appendChild(head);

    var me = C.state.me || {};
    if (me.season) {
      box.appendChild(el('p', 'c-board-sub', t('ch.b.sub')));
    }

    if (failed && !rows) {
      box.appendChild(el('p', 'c-board-empty', t('ch.b.error')));
      return;
    }
    if (!rows) {
      box.appendChild(el('p', 'c-board-empty', t('ch.loading')));
      return;
    }
    if (!rows.length) {
      box.appendChild(el('p', 'c-board-empty', t(me.state === 'not_started' ? 'ch.b.notYet' : 'ch.b.empty')));
      return;
    }

    // عناوين الأعمدة
    var cols = el('div', 'c-lb-cols');
    cols.setAttribute('aria-hidden', 'true');
    cols.appendChild(el('span', null, '#'));
    cols.appendChild(el('span', null, t('ch.b.colName')));
    cols.appendChild(el('span', null, t('ch.b.colDays')));
    cols.appendChild(el('span', null, t('ch.b.colPoints')));
    box.appendChild(cols);

    var list = el('ol', 'c-lb');
    var myRow = null;
    rows.forEach(function (r) {
      var li = el('li', 'c-lb-row' + (r.rank <= 3 ? ' is-top is-top' + r.rank : '') + (r.is_me ? ' is-me' : ''));
      if (r.is_me) { li.setAttribute('aria-current', 'true'); myRow = li; }

      var rank = el('span', 'c-lb-rank');
      if (MEDALS[r.rank]) {
        rank.appendChild(el('span', 'c-lb-medal', MEDALS[r.rank]));
        rank.setAttribute('aria-label', fmt('ch.b.rankN', { r: r.rank }));
      } else {
        rank.textContent = String(r.rank);
      }
      li.appendChild(rank);

      var name = el('span', 'c-lb-name');
      name.appendChild(el('bdi', null, r.display_name));   // اللقب نص فقط، مو HTML
      if (r.is_me) name.appendChild(el('span', 'c-lb-you', t('ch.b.you')));
      li.appendChild(name);

      var days = el('span', 'c-lb-days', String(r.days));
      days.setAttribute('aria-label', fmt('ch.b.daysN', { n: r.days }));
      li.appendChild(days);

      var pts = el('span', 'c-lb-pts', String(r.points));
      pts.setAttribute('aria-label', fmt('ch.b.pointsN', { n: r.points }));
      li.appendChild(pts);

      list.appendChild(li);
    });
    box.appendChild(list);

    // لو ترتيبها بعيد تحت: زر ينقلها لمكانها
    if (myRow && rows.length > 10) {
      var go = el('button', 'btn-secondary c-lb-jump', t('ch.b.jump'));
      go.type = 'button';
      go.addEventListener('click', function () {
        myRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        myRow.classList.remove('flash'); void myRow.offsetWidth; myRow.classList.add('flash');
      });
      box.appendChild(go);
    }

    if (!rows.some(function (r) { return r.is_me; })) {
      box.appendChild(el('p', 'c-board-note', t('ch.b.notOnBoard')));
    }
  }

  /* ---------- الجلب ---------- */
  function fetchBoard() {
    if (loading) return Promise.resolve();
    loading = true;
    return sb.rpc('get_challenge_leaderboard').then(function (r) {
      loading = false;
      if (r.error) throw r.error;
      rows = (r.data || []).map(function (x) {
        return { rank: Number(x.rank), display_name: String(x.display_name || '—'),
                 points: Number(x.points), days: Number(x.days), is_me: x.is_me === true };
      });
      failed = false;
      updatedAt = new Date();
      render();
      renderMyRank();
    }).catch(function () {
      loading = false;
      failed = true;
      render();
    });
  }

  function startPolling() {
    stopPolling();
    timer = setInterval(function () {
      if (document.visibilityState === 'visible') fetchBoard();
    }, REFRESH_MS);
  }

  function stopPolling() { if (timer) { clearInterval(timer); timer = null; } }

  /* ---------- الأحداث ---------- */
  function onLoaded() {
    if (!C.state.me) return;
    render();
    fetchBoard();
    startPolling();
  }

  document.addEventListener('challenge:loaded', onLoaded);
  // بعد تسجيل جلسة أو كلاس: بطاقة التقدّم تنرسم من جديد، فنرجّع ترتيبي ونحدّث اللوحة
  document.addEventListener('challenge:refreshed', function () { renderMyRank(); fetchBoard(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && C.state.me) fetchBoard();
  });
  document.addEventListener('langchange', function () { if (C.state.me) { render(); renderMyRank(); } });

  if (C.state.me) onLoaded();   // لو الصفحة تحمّلت قبل هذا الملف
})();
