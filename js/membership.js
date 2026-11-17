// توحيد رقم الجوال ورقم العضوية، وبناء العنوان الداخلي للحساب.
// ⚠️ لازم يطابق بالضبط:
//    - دالة activate-member (supabase/functions/activate-member/index.ts): EMAIL_DOMAIN ومنطق التوحيد
//    - قاعدة البيانات (sql/03_roster.sql): normalize_phone و normalize_code
(function () {
  var EMAIL_DOMAIN = 'example.com';
  var ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';

  function toLatinDigits(s) {
    return String(s).replace(/[٠-٩۰-۹]/g, function (ch) {
      return String(ARABIC_DIGITS.indexOf(ch) % 10);
    });
  }

  // 0501234567 | +966501234567 | 00966... | أرقام عربية ← 966501234567
  function normalizePhone(input) {
    var d = toLatinDigits(input == null ? '' : input).replace(/[^0-9]/g, '');
    if (!d) return null;
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (/^05[0-9]{8}$/.test(d)) d = '966' + d.slice(1);
    else if (/^5[0-9]{8}$/.test(d)) d = '966' + d;
    else if (d.indexOf('9660') === 0) d = '966' + d.slice(4);
    return d;
  }

  function normalizeCode(input) {
    var d = toLatinDigits(input == null ? '' : input).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return d || null;
  }

  function isValidPhone(phone) {
    return /^[0-9]{8,15}$/.test(phone || '');
  }

  function phoneToEmail(phone) {
    return phone + '@' + EMAIL_DOMAIN;
  }

  window.Membership = {
    EMAIL_DOMAIN: EMAIL_DOMAIN,
    normalizePhone: normalizePhone,
    normalizeCode: normalizeCode,
    isValidPhone: isValidPhone,
    phoneToEmail: phoneToEmail
  };
})();
