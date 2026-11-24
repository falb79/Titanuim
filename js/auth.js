// حالة تسجيل الدخول المشتركة بين كل الصفحات.
// - زر الهيدر: «تسجيل الدخول» للزائرة، و«حسابي» للمسجّلة (يفتح قائمة صغيرة)
// - قائمة «حسابي»: مرحباً + اللقب، الجوال، رقم العضوية، تاريخ انتهاء العضوية، تسجيل الخروج
// - يوفر Auth.getSession() و Auth.requireLogin() و Auth.isMember() للصفحات الأخرى
(function () {
  var sb = window.sb;

  function getSession() {
    if (!sb) return Promise.resolve(null);
    return sb.auth.getSession()
      .then(function (r) { return r.data && r.data.session ? r.data.session : null; })
      .catch(function () { return null; });
  }

  // للصفحات المحمية: لو ما فيه جلسة يحوّل لصفحة الدخول.
  // (هذا للراحة فقط، الحماية الحقيقية للبيانات في سياسات RLS داخل Supabase)
  function requireLogin() {
    return getSession().then(function (session) {
      if (!session) location.replace('login.html');
      return session;
    });
  }

  // هل الحساب مربوط بمشتركة في القائمة؟
  // يرجع true أو false، أو null لو تعذّر الفحص (مشكلة اتصال).
  // الحماية الحقيقية في قاعدة البيانات، وهذي فقط عشان نعرض رسالة مناسبة.
  function isMember() {
    if (!sb) return Promise.resolve(null);
    return sb.rpc('is_active_member')
      .then(function (r) { return r.error ? null : r.data === true; })
      .catch(function () { return null; });
  }

  window.Auth = { getSession: getSession, requireLogin: requireLogin, isMember: isMember };

  if (!sb) return;

  /* =====================================================================
     قائمة «حسابي»
     ===================================================================== */
  var link = document.getElementById('auth-link');
  var wrap = link ? link.parentNode : null;
  var menu = null;        // القائمة (تُنشأ أول مرة تُفتح)
  var account = null;     // بيانات get_my_account
  var loadState = 'idle'; // idle | loading | ok | error
  var signedIn = false;

  function t(key) { return I18N.t(key); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // 966501234567 ← 0501234567 (الصيغة اللي تعرفها العضوة)
  function localPhone(p) {
    var d = String(p || '');
    return /^9665[0-9]{8}$/.test(d) ? '0' + d.slice(3) : d;
  }

  function formatDate(s) {
    var p = String(s).split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    var loc = I18N.getLang() === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-GB';
    try { return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d); }
    catch (e) { return s; }
  }

  function row(list, labelKey, value, ltr) {
    var li = el('div', 'acc-row');
    li.appendChild(el('dt', null, t(labelKey)));
    var dd = el('dd', null, value);
    if (ltr) dd.dir = 'ltr';
    li.appendChild(dd);
    list.appendChild(li);
  }

  function renderMenu() {
    if (!menu) return;
    menu.textContent = '';

    if (loadState === 'loading' || loadState === 'idle') {
      menu.appendChild(el('p', 'acc-status', t('acc.loading')));
    } else if (loadState === 'error' || !account) {
      menu.appendChild(el('p', 'acc-status', t('acc.error')));
    } else {
      var hello = el('p', 'acc-hello');
      hello.appendChild(document.createTextNode(t('acc.hello') + ' '));
      var name = el('bdi', null, account.display_name || (account.is_admin ? t('acc.adminName') : ''));
      hello.appendChild(name);
      hello.appendChild(document.createTextNode(' 👋'));
      menu.appendChild(hello);

      var dl = el('dl', 'acc-list');
      if (account.phone) row(dl, 'acc.phone', localPhone(account.phone), true);
      if (account.member_code) row(dl, 'acc.code', account.member_code, true);
      if (dl.childNodes.length) menu.appendChild(dl);

      if (account.is_admin) {
        var adm = el('a', 'acc-link', t('acc.admin'));
        adm.href = 'admin.html';
        menu.appendChild(adm);
      }
    }

    var out = el('button', 'acc-logout', t('nav.logout'));
    out.type = 'button';
    out.addEventListener('click', function () {
      out.disabled = true;
      sb.auth.signOut().then(function () { location.href = 'index.html'; });
    });
    menu.appendChild(out);
  }

  function loadAccount() {
    loadState = 'loading';
    renderMenu();
    return sb.rpc('get_my_account').then(function (r) {
      if (r.error || !r.data) throw r.error || new Error('empty');
      account = r.data;
      loadState = 'ok';
    }).catch(function () {
      loadState = 'error';
    }).then(renderMenu);
  }

  function isOpen() { return !!menu && !menu.hidden; }

  function openMenu() {
    if (!menu) {
      menu = el('div', 'acc-menu');
      menu.id = 'acc-menu';
      menu.hidden = true;
      wrap.appendChild(menu);
      link.setAttribute('aria-controls', 'acc-menu');
    }
    menu.hidden = false;
    link.setAttribute('aria-expanded', 'true');
    // نجيب البيانات كل مرة تنفتح (عشان لو الأدمن غيّرت اللقب يظهر الجديد)
    loadAccount();
  }

  function closeMenu(focusButton) {
    if (!isOpen()) return;
    menu.hidden = true;
    link.setAttribute('aria-expanded', 'false');
    if (focusButton) link.focus();
  }

  /* =====================================================================
     زر الهيدر
     ===================================================================== */
  function updateHeader(session) {
    if (!link) return;
    signedIn = !!session;
    if (signedIn) {
      link.setAttribute('data-i18n', 'nav.account');
      link.setAttribute('href', '#');
      link.setAttribute('role', 'button');
      link.setAttribute('aria-haspopup', 'true');
      link.setAttribute('aria-expanded', isOpen() ? 'true' : 'false');
      link.setAttribute('data-state', 'in');
      link.classList.add('is-account');
    } else {
      closeMenu(false);
      account = null;
      loadState = 'idle';
      link.setAttribute('data-i18n', 'nav.login');
      link.setAttribute('href', 'login.html');
      link.removeAttribute('role');
      link.removeAttribute('aria-haspopup');
      link.removeAttribute('aria-expanded');
      link.setAttribute('data-state', 'out');
      link.classList.remove('is-account');
    }
    I18N.apply(link.parentNode);
  }

  if (link) {
    link.addEventListener('click', function (e) {
      if (link.getAttribute('data-state') !== 'in') return;   // زائرة: رابط عادي لصفحة الدخول
      e.preventDefault();
      if (isOpen()) closeMenu(false); else openMenu();
    });

    // مسافة أو Enter على الزر (لأنه <a> بدور زر)
    link.addEventListener('keydown', function (e) {
      if (link.getAttribute('data-state') === 'in' && e.key === ' ') { e.preventDefault(); link.click(); }
    });

    // الإغلاق: ضغطة برا القائمة أو Escape
    document.addEventListener('click', function (e) {
      if (isOpen() && !wrap.contains(e.target)) closeMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); closeMenu(true); }
    });
    document.addEventListener('langchange', function () { if (isOpen()) renderMenu(); });
  }

  getSession().then(updateHeader);
  sb.auth.onAuthStateChange(function (event, session) { updateHeader(session); });
})();
