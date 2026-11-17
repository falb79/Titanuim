// سلوك الصفحة الرئيسية:
//  - ظهور الأقسام تدريجياً عند التمرير
//  - زر الدعوة يتغير حسب حالة الدخول (زائر: تسجيل الدخول، عضو: الذهاب للتحدي)
//  - أيقونة القفل على بطاقات "وصول سريع" تظهر للزائر فقط
(function () {

  /* ---------- الظهور عند التمرير ---------- */
  var items = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduce) {
    document.documentElement.classList.add('reveal-on');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- حسب حالة الدخول ---------- */
  function applySession(session) {
    ['hero-cta', 'band-cta'].forEach(function (id) {
      var a = document.getElementById(id);
      if (!a) return;
      a.setAttribute('href', session ? 'challenge.html' : 'login.html');
      a.setAttribute('data-i18n', session ? 'home.ctaMember' : 'nav.login');
    });

    document.querySelectorAll('.qa-lock').forEach(function (el) {
      el.hidden = !!session;
    });

    I18N.apply(document.querySelector('main'));
  }

  if (window.Auth) {
    Auth.getSession().then(applySession);
    if (window.sb) sb.auth.onAuthStateChange(function (event, session) { applySession(session); });
  } else {
    applySession(null);
  }
})();
