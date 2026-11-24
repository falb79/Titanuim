// يبني الهيدر والقائمة وزر اللغة والفوتر في كل الصفحات من مكان واحد.
// لإضافة صفحة جديدة: أضيفي سطراً في المصفوفة links، ومفتاح nav.* في js/i18n.js
(function () {

  // Load Font Awesome once
if (!document.querySelector("#font-awesome-css")) {
  const fa = document.createElement("link");
  fa.id = "font-awesome-css";
  fa.rel = "stylesheet";
  fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css";
  document.head.appendChild(fa);
}

  const CONTACT = {
  whatsapp: "966569845239",
  instagram: "ti.taniumgym",
  snapchat: "ti.taniumgym",
  tiktok: "ti.taniumgym",
  googleMaps: "https://www.google.com/maps/place/%D8%AA%D9%8A%D8%AA%D8%A7%D9%86%D9%8A%D9%88%D9%85+%D9%84%D9%84%D9%8A%D8%A7%D9%82%D8%A9+%D8%A7%D9%84%D8%B3%D9%8A%D8%AF%D8%A7%D8%AA%E2%80%AD/@21.4818663,39.2304429,824m/data=!3m2!1e3!4b1!4m6!3m5!1s0x15c3cffd5e5b956f:0x8903d6cab0007da3!8m2!3d21.4818663!4d39.2304429!16s%2Fg%2F11mbq1hvtr?entry=ttu&g_ep=EgoyMDI2MTExMC4wIKXMDSoASAFQAw%3D%3D"
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
            '<img class="logo-img-2" src="assets/Effat_logo.png" alt="logo">' +
            '<img class="logo-img" src="assets/Titanium.png" alt="logo">' +
            // '<span data-i18n="club.name"></span>' +
          '</a>' +
          '<button class="lang-toggle" id="lang-toggle" type="button"></button>' +
          '<button class="nav-toggle" id="nav-toggle" type="button" ' +
            'aria-expanded="false" aria-controls="main-nav">☰</button>' +
          '<nav class="main-nav" id="main-nav" data-i18n-label="nav.label">' +
            '<ul>' + navItems(true) + '</ul>' +
            '<div class="acc-wrap">' +
              '<a class="btn-login" id="auth-link" href="login.html" data-i18n="nav.login"></a>' +
            '</div>' +
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
  var socialIcons = [
    { key: "instagram", icon: "fa-brands fa-instagram", url: v => "https://instagram.com/" + v },
    { key: "snapchat", icon: "fa-brands fa-snapchat", url: v => "https://snapchat.com/add/" + v },
    { key: "tiktok", icon: "fa-brands fa-tiktok", url: v => "https://www.tiktok.com/@" + v },
    { key: "whatsapp", icon: "fa-brands fa-whatsapp", url: v => "https://wa.me/" + v },
    { key: "phone", icon: "fa-solid fa-phone", url: v => "tel:+" + v },
    { key: "email", icon: "fa-solid fa-envelope", url: v => "mailto:" + v },
    { key: "googleMaps", icon: "fa-solid fa-location-dot", url: v => v }
  ];

  var contactItems = socialIcons
    .filter(item => CONTACT[item.key])
    .map(item => `
      <li>
        <a href="${item.url(CONTACT[item.key])}"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="${item.key}">
          <i class="${item.icon}"></i>
        </a>
      </li>
    `).join("");

  var contactCol = contactItems
    ? '<div class="footer-col footer-social">' +
          '<h2 data-i18n="footer.contact"></h2>' +
        '<ul>' + contactItems + '</ul>' +
      '</div>'
    : '';

    footerMount.innerHTML =
      '<footer class="site-footer">' +
        '<div class="footer-inner">' +
          '<div class="footer-brand">' +
            '<img class="footer-img" src="assets/Titanium.png" alt="" width="200" >' +
            '<img class="footer-img-2" src="assets/Effat_logo.png" alt="" width="200" >' +
          '</div>' +
          '<nav class="footer-col" data-i18n-label="footer.links">' +
            '<h2 data-i18n="footer.links"></h2>' +
            '<ul>' + navItems(false) + '</ul>' +
          '</nav>' +
          contactCol +
        '</div>' +
        '<div class="footer-bottom">' +
          '<p>© ' + new Date().getFullYear() +
          ' <span data-i18n="footer.rights"></span></p>' +
        '</div>' +
      '</footer>';

    I18N.apply(footerMount);
  }
})();
