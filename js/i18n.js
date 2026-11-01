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
      'nav.logout': 'تسجيل الخروج',
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
      'exercises.text': 'اختر القسم، وشاهد شرح كل تمرين.',
      'ex.tabUpper': 'الجزء العلوي',
      'ex.tabLower': 'الجزء السفلي',
      'ex.tabStretch': 'الإطالات',
      'ex.watch': 'شاهد الشرح',
      'ex.loading': 'جارٍ تحميل التمارين…',
      'ex.empty': 'لا توجد تمارين في هذا القسم بعد.',
      'ex.error': 'تعذّر تحميل التمارين. يرجى المحاولة مرة أخرى.',
      'ex.retry': 'إعادة المحاولة',
      'ex.lockedTitle': 'المحتوى حصري للأعضاء',
      'ex.lockedText': 'تسجيل الدخول مطلوب لتصفح مكتبة التمارين.',
      'nutrition.title': 'التغذية',
      'nutrition.text': 'معلومات التغذية وتحدي الـ 30 يوماً للأكل الصحي.',
      'challenge.title': 'التحدي الرياضي',
      'challenge.text': 'اختر مدة التمرين: 15 أو 20 أو 30 دقيقة، وتابع ترتيبك بين الأعضاء.',
      'login.title': 'تسجيل الدخول',
      'login.text': 'خاص بمشتركي النادي.',
      'login.tabLogin': 'دخول',
      'login.tabSignup': 'حساب جديد',
      'login.submit': 'دخول',
      'signup.submit': 'إنشاء الحساب',
      'login.loading': 'جارٍ المعالجة…',
      'field.email': 'البريد الإلكتروني',
      'field.password': 'كلمة المرور',
      'field.passwordHint': 'ثمانية أحرف على الأقل',
      'field.name': 'الاسم المستعار',
      'field.nameHint': 'يظهر في لوحة الترتيب بدلاً من اسمك الحقيقي',
      'msg.checkEmail': 'تم إرسال رابط التأكيد إلى بريدك الإلكتروني. بعد فتح الرابط يمكنك تسجيل الدخول. يرجى تفقّد الرسائل غير المرغوبة إن لم يصل.',
      'err.email': 'يرجى كتابة بريد إلكتروني صحيح.',
      'err.password': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
      'err.name': 'الاسم المستعار يجب أن يكون من 2 إلى 30 حرفاً.',
      'err.invalid': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      'err.unconfirmed': 'لم يتم تأكيد البريد بعد. يرجى فتح رابط التأكيد المرسل إلى بريدك.',
      'err.exists': 'هذا البريد مسجّل مسبقاً. يمكنك تسجيل الدخول.',
      'err.weak': 'كلمة المرور ضعيفة. يرجى استخدام 8 أحرف أو أكثر.',
      'err.rate': 'محاولات كثيرة. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.',
      'err.noclient': 'خدمة تسجيل الدخول غير متاحة حالياً.',
      'err.generic': 'حدث خطأ. يرجى المحاولة مرة أخرى.'
    },
    en: {
      'club.name': 'Fitness Titanium',
      'nav.label': 'Main menu',
      'nav.home': 'Home',
      'nav.exercises': 'Exercises',
      'nav.nutrition': 'Nutrition',
      'nav.challenge': 'Challenge',
      'nav.login': 'Log in',
      'nav.logout': 'Log out',
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
      'exercises.text': 'Pick a section and watch a tutorial for each exercise.',
      'ex.tabUpper': 'Upper body',
      'ex.tabLower': 'Lower body',
      'ex.tabStretch': 'Stretching',
      'ex.watch': 'Watch tutorial',
      'ex.loading': 'Loading exercises…',
      'ex.empty': 'No exercises in this section yet.',
      'ex.error': 'Could not load exercises. Please try again.',
      'ex.retry': 'Try again',
      'ex.lockedTitle': 'Members-only content',
      'ex.lockedText': 'Log in to browse the exercise library.',
      'nutrition.title': 'Nutrition',
      'nutrition.text': 'Nutrition information and the 30-day healthy eating challenge.',
      'challenge.title': 'Fitness Challenge',
      'challenge.text': 'Pick your session length: 15, 20 or 30 minutes, and track your rank among members.',
      'login.title': 'Log in',
      'login.text': 'For club members only.',
      'login.tabLogin': 'Log in',
      'login.tabSignup': 'Sign up',
      'login.submit': 'Log in',
      'signup.submit': 'Create account',
      'login.loading': 'Please wait…',
      'field.email': 'Email',
      'field.password': 'Password',
      'field.passwordHint': 'At least 8 characters',
      'field.name': 'Nickname',
      'field.nameHint': 'Shown on the leaderboard instead of your real name',
      'msg.checkEmail': 'A confirmation link was sent to your email. Once you open it, you can log in. Please check your spam folder if it does not arrive.',
      'err.email': 'Please enter a valid email address.',
      'err.password': 'Password must be at least 8 characters.',
      'err.name': 'Nickname must be 2 to 30 characters.',
      'err.invalid': 'Incorrect email or password.',
      'err.unconfirmed': 'Your email is not confirmed yet. Please open the confirmation link sent to you.',
      'err.exists': 'This email is already registered. You can log in instead.',
      'err.weak': 'Password is too weak. Please use 8 characters or more.',
      'err.rate': 'Too many attempts. Please wait a moment and try again.',
      'err.noclient': 'Login service is currently unavailable.',
      'err.generic': 'Something went wrong. Please try again.'
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
