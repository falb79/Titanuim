// صفحة الدخول والتفعيل
//  - الدخول: رقم الجوال + كلمة المرور
//  - التفعيل (أول مرة): اسم مستعار + جوال + رقم عضوية + كلمة مرور، عن طريق دالة activate-member
(function () {
  var sb = window.sb;
  var M = window.Membership;

  var msg = document.getElementById('form-msg');
  var tabLogin = document.getElementById('tab-login');
  var tabActivate = document.getElementById('tab-activate');
  var loginForm = document.getElementById('panel-login');
  var activateForm = document.getElementById('panel-activate');

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
    activateForm.hidden = isLogin;
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabActivate.setAttribute('aria-selected', String(!isLogin));
    clearMsg();
  }

  tabLogin.addEventListener('click', function () { selectTab('login'); });
  tabActivate.addEventListener('click', function () { selectTab('activate'); });
  if (location.hash === '#activate' || location.hash === '#signup') selectTab('activate');

  /* ---------- الرجوع للصفحة اللي جاء منها العضو (login.html?next=exercises.html) ---------- */
  var NEXT_PAGES = ['index.html', 'exercises.html', 'nutrition.html', 'challenge.html'];
  function nextPage() {
    var next = new URLSearchParams(location.search).get('next');
    return NEXT_PAGES.indexOf(next) !== -1 ? next : 'index.html';
  }

  /* ---------- أدوات ---------- */
  function setBusy(form, busy) {
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = busy;
    btn.textContent = I18N.t(busy ? 'login.loading' : btn.getAttribute('data-i18n'));
  }

  function loginErrKey(error) {
    var code = (error && error.code) || '';
    var text = ((error && error.message) || '').toLowerCase();
    if (code === 'invalid_credentials' || text.indexOf('invalid login') !== -1) return 'err.loginInvalid';
    if (error && (error.status === 429 || code.indexOf('rate_limit') !== -1)) return 'err.rate';
    return 'err.generic';
  }

  // رد دالة التفعيل ← مفتاح الرسالة
  var REASONS = {
    invalid: 'err.actInvalid',
    expired: 'err.actExpired',
    already_claimed: 'err.actClaimed',
    locked: 'err.actLocked',
    phone_in_use: 'err.actPhoneInUse',
    bad_name: 'err.name',
    bad_phone: 'err.phone',
    bad_code: 'err.code',
    bad_password: 'err.password'
  };

  /* ---------- الدخول ---------- */
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();
    if (!sb || !M) { showMsg('error', 'err.noclient'); return; }

    var phone = M.normalizePhone($('login-phone').value);
    var password = $('login-password').value;

    if (!M.isValidPhone(phone)) { showMsg('error', 'err.phone'); $('login-phone').focus(); return; }
    if (!password) { showMsg('error', 'err.passwordRequired'); $('login-password').focus(); return; }

    setBusy(loginForm, true);
    sb.auth.signInWithPassword({ email: M.phoneToEmail(phone), password: password })
      .then(function (r) {
        if (r.error) { showMsg('error', loginErrKey(r.error)); return; }
        location.href = nextPage();
      })
      .catch(function () { showMsg('error', 'err.generic'); })
      .then(function () { setBusy(loginForm, false); });
  });

  /* ---------- التفعيل ---------- */
  activateForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();
    if (!sb || !M) { showMsg('error', 'err.noclient'); return; }

    var name = $('act-name').value.trim();
    var rawPhone = $('act-phone').value;
    var rawCode = $('act-code').value;
    var password = $('act-password').value;
    var password2 = $('act-password2').value;
    var phone = M.normalizePhone(rawPhone);
    var nameLen = Array.from(name).length;

    if (nameLen < 2 || nameLen > 30) { showMsg('error', 'err.name'); $('act-name').focus(); return; }
    if (!M.isValidPhone(phone)) { showMsg('error', 'err.phone'); $('act-phone').focus(); return; }
    if (!M.normalizeCode(rawCode)) { showMsg('error', 'err.code'); $('act-code').focus(); return; }
    if (password.length < 8) { showMsg('error', 'err.password'); $('act-password').focus(); return; }
    if (password !== password2) { showMsg('error', 'err.passwordMismatch'); $('act-password2').focus(); return; }

    setBusy(activateForm, true);
    sb.functions.invoke('activate-member', {
      body: { display_name: name, phone: rawPhone, member_code: rawCode, password: password, lang: I18N.getLang() }
    })
      .then(function (r) {
        var d = r.data;
        if (r.error || !d) { showMsg('error', 'err.generic'); return; }
        if (!d.ok) { showMsg('error', REASONS[d.reason] || 'err.generic'); return; }

        // تم التفعيل: ندخلها مباشرة بنفس الجوال وكلمة المرور
        return sb.auth.signInWithPassword({ email: d.email, password: password }).then(function (s) {
          if (s.error) {
            selectTab('login');
            $('login-phone').value = rawPhone;
            showMsg('success', 'act.successLogin');
            return;
          }
          showMsg('success', 'act.success');
          location.href = nextPage();
        });
      })
      .catch(function () { showMsg('error', 'err.generic'); })
      .then(function () { setBusy(activateForm, false); });
  });

  /* ---------- لو مسجّلة دخول أصلاً ---------- */
  if (window.Auth) {
    Auth.getSession().then(function (session) {
      if (session) location.replace(nextPage());
    });
  }
})();
