// نصوص صفحة الدخول والتفعيل. تُضاف فوق النصوص الموجودة في js/i18n.js
I18N.add('ar', {
  'login.tabActivate': 'تفعيل الحساب',
  'act.intro': 'التفعيل يتم برقم العضوية ورقم الجوال المسجّل لدى النادي.',
  'act.submit': 'تفعيل الحساب',
  'act.success': 'تم تفعيل حسابك. جارٍ تحويلك…',
  'act.successLogin': 'تم تفعيل حسابك. يمكنك الآن تسجيل الدخول.',
  'login.forgot': 'نسيت كلمة المرور؟ يرجى التواصل مع النادي لإعادة تعيينها.',

  'field.phone': 'رقم الجوال',
  'field.phoneHint': 'مثال: 0501234567',
  'field.memberCode': 'رقم العضوية',
  'field.memberCodeHint': 'رقم عضويتك المسجّل لدى النادي',
  'field.passwordConfirm': 'تأكيد كلمة المرور',

  'err.phone': 'يرجى كتابة رقم جوال صحيح.',
  'err.code': 'يرجى كتابة رقم العضوية.',
  'err.passwordRequired': 'يرجى كتابة كلمة المرور.',
  'err.passwordMismatch': 'كلمتا المرور غير متطابقتين.',
  'err.loginInvalid': 'رقم الجوال أو كلمة المرور غير صحيحة.',
  'err.actInvalid': 'رقم العضوية أو الجوال غير مطابق لسجلات النادي. يرجى التأكد وإعادة المحاولة.',
  'err.actExpired': 'اشتراك هذه العضوية منتهي. يرجى التواصل مع النادي.',
  'err.actClaimed': 'هذه العضوية مفعّلة مسبقاً. يمكنك تسجيل الدخول برقم الجوال وكلمة المرور.',
  'err.actLocked': 'محاولات كثيرة. يرجى الانتظار 30 دقيقة ثم المحاولة مرة أخرى، أو التواصل مع النادي.',
  'err.actPhoneInUse': 'هذا الجوال مرتبط بحساب آخر. يرجى التواصل مع النادي.'
});

I18N.add('en', {
  'login.tabActivate': 'Activate account',
  'act.intro': 'Activation uses your membership number and the mobile number registered with the club.',
  'act.submit': 'Activate account',
  'act.success': 'Your account is activated. Redirecting…',
  'act.successLogin': 'Your account is activated. You can now log in.',
  'login.forgot': 'Forgot your password? Please contact the club to reset it.',

  'field.phone': 'Mobile number',
  'field.phoneHint': 'Example: 0501234567',
  'field.memberCode': 'Membership number',
  'field.memberCodeHint': 'Your membership number registered with the club',
  'field.passwordConfirm': 'Confirm password',

  'err.phone': 'Please enter a valid mobile number.',
  'err.code': 'Please enter your membership number.',
  'err.passwordRequired': 'Please enter your password.',
  'err.passwordMismatch': 'The passwords do not match.',
  'err.loginInvalid': 'Incorrect mobile number or password.',
  'err.actInvalid': 'The membership number or mobile number does not match the club records. Please check and try again.',
  'err.actExpired': 'This membership has expired. Please contact the club.',
  'err.actClaimed': 'This membership is already activated. You can log in with your mobile number and password.',
  'err.actLocked': 'Too many attempts. Please wait 30 minutes and try again, or contact the club.',
  'err.actPhoneInUse': 'This mobile number is linked to another account. Please contact the club.'
});
