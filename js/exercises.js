// صفحة التمارين: تجلب المجموعات والتمارين من Supabase وتعرضها.
// الحماية الحقيقية في قاعدة البيانات (RLS): بدون تسجيل دخول ما يرجع شي.
(function () {
  var sb = window.sb;

  var tabs = document.getElementById('ex-tabs');
  var statusEl = document.getElementById('ex-status');
  var retryBtn = document.getElementById('ex-retry');
  var content = document.getElementById('ex-content');
  var lock = document.getElementById('ex-lock');
  var intro = document.getElementById('ex-intro');

  var state = { section: 'upper', groups: null, exercises: null };

  /* ---------- رسالة الحالة (تتغير لغتها لأنها تحمل data-i18n) ---------- */
  function setStatus(key) {
    if (!key) {
      statusEl.hidden = true;
      statusEl.removeAttribute('data-i18n');
      statusEl.textContent = '';
      return;
    }
    statusEl.hidden = false;
    statusEl.setAttribute('data-i18n', key);
    statusEl.textContent = I18N.t(key);
  }

  /* ---------- العرض ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function render() {
    content.textContent = '';
    if (!state.groups) return;

    var lang = I18N.getLang();
    var other = lang === 'ar' ? 'en' : 'ar';

    var groups = state.groups.filter(function (g) { return g.section === state.section; });
    if (!groups.length) { setStatus('ex.empty'); return; }
    setStatus(null);

    groups.forEach(function (g) {
      var section = el('section', 'ex-group');
      section.appendChild(el('h2', null, g['name_' + lang]));

      var list = el('ul', 'ex-grid');
      state.exercises
        .filter(function (e) { return e.group_id === g.id; })
        .forEach(function (e) {
          var card = el('li', 'ex-card');

          var name = el('div', 'ex-name', e['name_' + lang]);
          name.appendChild(el('span', 'ex-name-alt', e['name_' + other]));
          card.appendChild(name);

          // نسمح فقط بروابط https (حماية من روابط خبيثة)
          if (e.video_url && /^https:\/\//.test(e.video_url)) {
            var a = el('a', 'ex-watch', I18N.t('ex.watch'));
            a.href = e.video_url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', I18N.t('ex.watch') + ' — ' + e['name_' + lang]);
            card.appendChild(a);
          }
          list.appendChild(card);
        });

      section.appendChild(list);
      content.appendChild(section);
    });
  }

  /* ---------- التبويبات ---------- */
  tabs.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-section]');
    if (!btn) return;
    state.section = btn.getAttribute('data-section');
    Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-selected', String(b === btn));
    });
    render();
  });

  /* ---------- شاشة القفل (لغير المسجّل) ---------- */
  function showLocked() {
    intro.hidden = true;
    tabs.hidden = true;
    retryBtn.hidden = true;
    content.textContent = '';
    setStatus(null);
    lock.hidden = false;
  }

  /* ---------- جلب البيانات ---------- */
  function load() {
    setStatus('ex.loading');
    retryBtn.hidden = true;
    tabs.hidden = true;
    content.textContent = '';

    return Promise.all([
      sb.from('exercise_groups').select('id, slug, section, name_ar, name_en, sort_order').order('sort_order'),
      sb.from('exercises').select('id, group_id, name_ar, name_en, video_url, sort_order').order('sort_order')
    ])
      .then(function (r) {
        var failed = r[0].error || r[1].error;
        if (failed) {
          // الجلسة انتهت أو ما فيه صلاحية: نعرض شاشة القفل
          if (failed.status === 401 || failed.code === 'PGRST301') { showLocked(); return; }
          throw failed;
        }
        state.groups = r[0].data || [];
        state.exercises = r[1].data || [];
        tabs.hidden = false;
        render();
      })
      .catch(function () {
        setStatus('ex.error');
        retryBtn.hidden = false;
      });
  }

  retryBtn.addEventListener('click', load);
  document.addEventListener('langchange', render);

  /* ---------- البداية ---------- */
  if (!sb || !window.Auth) { setStatus('ex.error'); return; }

  // غير مسجّل دخول؟ نعرض القفل بدون أي طلب لقاعدة البيانات
  Auth.getSession().then(function (session) {
    if (session) load(); else showLocked();
  });
})();
