// ترجمة الموقع (عربي / English)
// - النصوص في الصفحات تُعلَّم بـ data-i18n="المفتاح"
// - لإضافة نص جديد: أضيفي المفتاح في القاموسين ar و en أدناه
// - يُحمَّل هذا الملف في <head> بدون defer ليضبط اتجاه الصفحة قبل العرض
(function () {
  var STORAGE_KEY = 'lang';

  var dict = {
    ar: {
      'club.name': 'تيتانيوم للياقة',
      'nav.label': 'القائمة الرئيسية',
      'nav.home': 'الرئيسية',
      'nav.exercises': 'التمارين',
      'nav.nutrition': 'التغذية',
      'nav.challenge': 'التحدي',
      'nav.login': 'تسجيل الدخول',
      'nav.menuOpen': 'فتح القائمة',
      'nav.menuClose': 'إغلاق القائمة',
      'lang.switch': 'English',

      'footer.links': 'روابط سريعة',
      'footer.contact': 'تواصل معنا',
      'footer.phone': 'اتصال',
      'footer.whatsapp': 'واتساب',
      'footer.instagram': 'إنستغرام',
      'footer.email': 'البريد الإلكتروني',
      'footer.rights': 'جميع الحقوق محفوظة',

      'home.title': 'أهلاً بك في النادي',
      'home.text': 'صفحة الاستقبال. هنا نعرّف بالنادي ونوجّه العضو لتسجيل الدخول.',
      'exercises.title': 'التمارين',
      'exercises.text': 'هنا تظهر التمارين للأعضاء بعد تسجيل الدخول.',
      'nutrition.title': 'التغذية',
      'nutrition.text': 'معلومات التغذية وتحدي الـ 30 يوماً للأكل الصحي.',
      'challenge.title': 'التحدي الرياضي',
      'challenge.text': 'اختر مدة التمرين: 15 أو 20 أو 30 دقيقة، وتابع ترتيبك بين الأعضاء.',
      'login.title': 'تسجيل الدخول',
      'login.text': 'نموذج الدخول سيُضاف في الخطوة القادمة.'
    },
    en: {
      'club.name': 'Fitness Titanium',
      'nav.label': 'Main menu',
      'nav.home': 'Home',
      'nav.exercises': 'Exercises',
      'nav.nutrition': 'Nutrition',
      'nav.challenge': 'Challenge',
      'nav.login': 'Log in',
      'nav.menuOpen': 'Open menu',
      'nav.menuClose': 'Close menu',
      'lang.switch': 'العربية',

      'footer.links': 'Quick links',
      'footer.contact': 'Contact us',
      'footer.phone': 'Call',
      'footer.whatsapp': 'WhatsApp',
      'footer.instagram': 'Instagram',
      'footer.email': 'Email',
      'footer.rights': 'All rights reserved',

      'home.title': 'Welcome to the club',
      'home.text': 'Landing page. Introduce the club and send members to log in.',
      'exercises.title': 'Exercises',
      'exercises.text': 'Exercises appear here for members after logging in.',
      'nutrition.title': 'Nutrition',
      'nutrition.text': 'Nutrition information and the 30-day healthy eating challenge.',
      'challenge.title': 'Fitness Challenge',
      'challenge.text': 'Pick your session length: 15, 20 or 30 minutes, and track your rank among members.',
      'login.title': 'Log in',
      'login.text': 'The login form will be added in the next step.'
    }
  };

  function readSaved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function save(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* التخزين غير متاح */ }
  }

  // أول زيارة: إنجليزي فقط لو لغة المتصفح إنجليزية، غير ذلك عربي
  function detect() {
    var saved = readSaved();
    if (saved === 'ar' || saved === 'en') return saved;
    var browser = (navigator.language || 'ar').toLowerCase();
    return browser.indexOf('en') === 0 ? 'en' : 'ar';
  }

  var current = detect();

  function t(key) {
    var d = dict[current];
    if (d && d[key] != null) return d[key];
    if (dict.ar[key] != null) return dict.ar[key];
    return key;
  }

  function applyDirection() {
    var html = document.documentElement;
    html.lang = current;
    html.dir = current === 'ar' ? 'rtl' : 'ltr';
  }

  function applyTitle() {
    var page = document.body && document.body.getAttribute('data-page');
    if (page) document.title = t(page + '.title') + ' | ' + t('club.name');
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-label]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-label')));
    });
  }

  function setLang(lang) {
    if (lang !== 'ar' && lang !== 'en') return;
    current = lang;
    save(lang);
    applyDirection();
    apply(document);
    applyTitle();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  // لإضافة مفاتيح من ملفات أخرى (مثلاً صفحة التحدي): I18N.add('ar', {...})
  function add(lang, entries) {
    dict[lang] = Object.assign(dict[lang] || {}, entries);
  }

  applyDirection();

  document.addEventListener('DOMContentLoaded', function () {
    apply(document);
    applyTitle();
  });

  window.I18N = {
    t: t,
    apply: apply,
    add: add,
    setLang: setLang,
    getLang: function () { return current; }
  };
})();
