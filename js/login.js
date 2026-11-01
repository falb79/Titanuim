// نموذجا الدخول وإنشاء الحساب
(function () {
  var sb = window.sb;

  var msg = document.getElementById('form-msg');
  var tabLogin = document.getElementById('tab-login');
  var tabSignup = document.getElementById('tab-signup');
  var loginForm = document.getElementById('panel-login');
  var signupForm = document.getElementById('panel-signup');

  function $(id) { return document.getElementById(id); }

  /* ---------- الرسائل (تتغير لغتها مع زر اللغة لأنها تحمل data-i18n) ---------- */
  function showMsg(kind, key) {
    msg.className = 'form-msg ' + kind;
    msg.setAttribute('data-i18n', key);
    msg.textContent = I18N.t(key);
    msg.hidden = false;
  }

  function clearMsg() {
    msg.hidden = true;
    msg.removeAttribute('data-i18n');
    msg.textContent = '';
  }

  /* ---------- التبويبات ---------- */
  function selectTab(which) {
    var isLogin = which === 'login';
    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabSignup.setAttribute('aria-selected', String(!isLogin));
    clearMsg();
  }

  tabLogin.addEventListener('click', function () { selectTab('login'); });
  tabSignup.addEventListener('click', function () { selectTab('signup'); });
  if (location.hash === '#signup') selectTab('signup');

  /* ---------- أدوات ---------- */
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function setBusy(form, busy) {
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = busy;
    btn.textContent = I18N.t(busy ? 'login.loading' : btn.getAttribute('data-i18n'));
  }

  // يحوّل خطأ Supabase إلى مفتاح رسالة مترجمة
  function errKey(error) {
    var code = (error && error.code) || '';
    var text = ((error && error.message) || '').toLowerCase();
    if (code === 'invalid_credentials' || text.indexOf('invalid login') !== -1) return 'err.invalid';
    if (code === 'email_not_confirmed' || text.indexOf('not confirmed') !== -1) return 'err.unconfirmed';
    if (code === 'user_already_exists' || text.indexOf('already registered') !== -1) return 'err.exists';
    if (code === 'weak_password') return 'err.weak';
    if (error && (error.status === 429 || code.indexOf('rate_limit') !== -1)) return 'err.rate';
    return 'err.generic';
  }

  // الرجوع للصفحة اللي جاء منها العضو (مثلاً login.html?next=exercises.html)
  // نسمح فقط بصفحات الموقع المعروفة، حتى ما يتحول لموقع خارجي
  var NEXT_PAGES = ['index.html', 'exercises.html', 'nutrition.html', 'challenge.html'];
  function nextPage() {
    var next = new URLSearchParams(location.search).get('next');
    return NEXT_PAGES.indexOf(next) !== -1 ? next : 'index.html';
  }

  /* ---------- الدخول ---------- */
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();
    if (!sb) { showMsg('error', 'err.noclient'); return; }

    var email = $('login-email').value.trim();
    var password = $('login-password').value;

    if (!validEmail(email)) { showMsg('error', 'err.email'); $('login-email').focus(); return; }
    if (!password) { showMsg('error', 'err.password'); $('login-password').focus(); return; }

    setBusy(loginForm, true);
    sb.auth.signInWithPassword({ email: email, password: password })
      .then(function (r) {
        if (r.error) { showMsg('error', errKey(r.error)); return; }
        location.href = nextPage();
      })
      .catch(function () { showMsg('error', 'err.generic'); })
      .then(function () { setBusy(loginForm, false); });
  });

  /* ---------- إنشاء حساب ---------- */
  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();
    if (!sb) { showMsg('error', 'err.noclient'); return; }

    var name = $('signup-name').value.trim();
    var email = $('signup-email').value.trim();
    var password = $('signup-password').value;

    if (name.length < 2 || name.length > 30) { showMsg('error', 'err.name'); $('signup-name').focus(); return; }
    if (!validEmail(email)) { showMsg('error', 'err.email'); $('signup-email').focus(); return; }
    if (password.length < 8) { showMsg('error', 'err.password'); $('signup-password').focus(); return; }

    setBusy(signupForm, true);
    sb.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { display_name: name, lang: I18N.getLang() },
        emailRedirectTo: new URL('login.html', location.href).href
      }
    })
      .then(function (r) {
        if (r.error) { showMsg('error', errKey(r.error)); return; }
        // لو تأكيد الإيميل مطفي: يرجع جلسة مباشرة
        if (r.data && r.data.session) { location.href = nextPage(); return; }
        signupForm.reset();
        showMsg('success', 'msg.checkEmail');
      })
      .catch(function () { showMsg('error', 'err.generic'); })
      .then(function () { setBusy(signupForm, false); });
  });

  /* ---------- لو مسجّل دخول أصلاً (مثلاً بعد ضغط رابط التأكيد) ---------- */
  if (window.Auth) {
    Auth.getSession().then(function (session) {
      if (session) location.replace(nextPage());
    });
  }
})();
