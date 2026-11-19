// حالة تسجيل الدخول المشتركة بين كل الصفحات.
// - يغيّر زر الهيدر بين "تسجيل الدخول" و"تسجيل الخروج"
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

  function updateHeader(session) {
    var link = document.getElementById('auth-link');
    if (!link) return;
    if (session) {
      link.setAttribute('data-i18n', 'nav.logout');
      link.setAttribute('href', '#');
      link.setAttribute('data-state', 'in');
    } else {
      link.setAttribute('data-i18n', 'nav.login');
      link.setAttribute('href', 'login.html');
      link.setAttribute('data-state', 'out');
    }
    I18N.apply(link.parentNode);
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

  var link = document.getElementById('auth-link');
  if (link) {
    link.addEventListener('click', function (e) {
      if (link.getAttribute('data-state') !== 'in') return;
      e.preventDefault();
      sb.auth.signOut().then(function () { location.href = 'index.html'; });
    });
  }

  getSession().then(updateHeader);
  sb.auth.onAuthStateChange(function (event, session) { updateHeader(session); });
})();
