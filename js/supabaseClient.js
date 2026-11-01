// الاتصال بـ Supabase — يُحمَّل في كل صفحة تحتاج قاعدة البيانات.
// ترتيب الوسوم في الصفحة:
//   1) js/vendor/supabase.js   (المكتبة)
//   2) js/supabaseClient.js    (هذا الملف)
//   3) ملف الصفحة الخاص (مثل js/challenge.js)
//
// ⚠️ الصقي هنا فقط:
//   - Project URL
//   - المفتاح العام: Publishable key (يبدأ بـ sb_publishable_) أو anon في المشاريع الأقدم
// ⛔ لا تحطين أبداً مفتاح secret (sb_secret_...) أو service_role هنا،
//    لأن الريبو على GitHub عام وأي أحد يقدر يقرأه.
(function () {
  var SUPABASE_URL = 'https://egzmmjjnlsmuojpufuxc.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_F5kuqUudgKf-wz9-HFWNsA_hoQY9Ezq';

  window.SUPABASE_CONFIG = { url: SUPABASE_URL, key: SUPABASE_KEY };

  var isPlaceholder = SUPABASE_URL.indexOf('YOUR-PROJECT-REF') !== -1 ||
                      SUPABASE_KEY.indexOf('YOUR_KEY') !== -1;

  if (!window.supabase || !window.supabase.createClient) {
    console.error('مكتبة Supabase ما تحملت: تأكدي من وسم js/vendor/supabase.js قبل هذا الملف.');
    return;
  }

  if (isPlaceholder) {
    console.warn('Supabase: لسه ما حطيتي الرابط والمفتاح في js/supabaseClient.js');
  }

  // العميل الذي تستخدمه كل الصفحات: sb.auth..., sb.from('table')...
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
})();
