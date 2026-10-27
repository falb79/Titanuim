// يبني الهيدر والقائمة وزر اللغة والفوتر في كل الصفحات من مكان واحد.
// لإضافة صفحة جديدة: أضيفي سطراً في المصفوفة links، ومفتاح nav.* في js/i18n.js
(function () {

  // ===== بيانات التواصل (املئي ما يتوفر، وما تتركينه فاضياً ما يظهر) =====
  var CONTACT = {
    phone: '',      // مثال: '966500000000' (بدون + أو 00)
    whatsapp: '',   // نفس صيغة الجوال
    instagram: '',  // اسم الحساب فقط بدون @
    email: ''
  };

  var links = [
    { href: 'index.html',     key: 'nav.home' },
    { href: 'exercises.html', key: 'nav.exercises' },
    { href: 'nutrition.html', key: 'nav.nutrition' },
    { href: 'challenge.html', key: 'nav.challenge' }
  ];

  var headerMount = document.getElementById('site-header');
  var footerMount = document.getElementById('site-footer');
  if (!window.I18N) return;

  var current = location.pathname.split('/').pop() || 'index.html';

  function navItems(markCurrent) {
    return links.map(function (l) {
      var active = markCurrent && l.href === current ? ' aria-current="page"' : '';
      return '<li><a href="' + l.href + '"' + active + ' data-i18n="' + l.key + '"></a></li>';
    }).join('');
  }

  /* ---------- الهيدر ---------- */
  if (headerMount) {
    headerMount.innerHTML =
      '<header class="site-header">' +
        '<div class="header-inner">' +
          '<a class="logo" href="index.html">' +
            '<img class="logo-img" src="assets/logo.jpg" alt="" width="44" height="44">' +
            '<span data-i18n="club.name"></span>' +
          '</a>' +
          '<button class="lang-toggle" id="lang-toggle" type="button"></button>' +
          '<button class="nav-toggle" id="nav-toggle" type="button" ' +
            'aria-expanded="false" aria-controls="main-nav">☰</button>' +
          '<nav class="main-nav" id="main-nav" data-i18n-label="nav.label">' +
            '<ul>' + navItems(true) + '</ul>' +
            '<a class="btn-login" id="auth-link" href="login.html" data-i18n="nav.login"></a>' +
          '</nav>' +
        '</div>' +
      '</header>';

    var navToggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('main-nav');
    var langBtn = document.getElementById('lang-toggle');

    var updateControls = function () {
      var open = nav.classList.contains('open');
      navToggle.setAttribute('aria-label', I18N.t(open ? 'nav.menuClose' : 'nav.menuOpen'));
      langBtn.textContent = I18N.t('lang.switch');
      // الزر مكتوب باللغة الأخرى، فنضبط lang له ليُنطق صح
      langBtn.setAttribute('lang', I18N.getLang() === 'ar' ? 'en' : 'ar');
    };

    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      updateControls();
    });

    langBtn.addEventListener('click', function () {
      I18N.setLang(I18N.getLang() === 'ar' ? 'en' : 'ar');
    });

    document.addEventListener('langchange', updateControls);

    I18N.apply(headerMount);
    updateControls();
  }

  /* ---------- الفوتر ---------- */
  if (footerMount) {
    var contactItems = [];
    if (CONTACT.phone) {
      contactItems.push('<li><a href="tel:+' + encodeURIComponent(CONTACT.phone) + '" data-i18n="footer.phone"></a></li>');
    }
    if (CONTACT.whatsapp) {
      contactItems.push('<li><a href="https://wa.me/' + encodeURIComponent(CONTACT.whatsapp) + '" target="_blank" rel="noopener" data-i18n="footer.whatsapp"></a></li>');
    }
    if (CONTACT.instagram) {
      contactItems.push('<li><a href="https://instagram.com/' + encodeURIComponent(CONTACT.instagram) + '" target="_blank" rel="noopener" data-i18n="footer.instagram"></a></li>');
    }
    if (CONTACT.email) {
      contactItems.push('<li><a href="mailto:' + encodeURIComponent(CONTACT.email) + '" data-i18n="footer.email"></a></li>');
    }

    var contactCol = contactItems.length
      ? '<div class="footer-col">' +
          '<h2 data-i18n="footer.contact"></h2>' +
          '<ul>' + contactItems.join('') + '</ul>' +
        '</div>'
      : '';

    footerMount.innerHTML =
      '<footer class="site-footer">' +
        '<div class="footer-inner">' +
          '<div class="footer-brand">' +
            '<img src="assets/logo.jpg" alt="" width="56" height="56">' +
            '<span data-i18n="club.name"></span>' +
          '</div>' +
          '<nav class="footer-col" data-i18n-label="footer.links">' +
            '<h2 data-i18n="footer.links"></h2>' +
            '<ul>' + navItems(false) + '</ul>' +
          '</nav>' +
          contactCol +
        '</div>' +
        '<div class="footer-bottom">' +
          '<p>© ' + new Date().getFullYear() + ' <span data-i18n="club.name"></span> — ' +
          '<span data-i18n="footer.rights"></span></p>' +
        '</div>' +
      '</footer>';

    I18N.apply(footerMount);
  }
})();
