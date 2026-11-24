// =====================================================================
// activate-member  —  تفعيل حساب مشتركة جديدة (Supabase Edge Function)
//
// المسار:
//   الموقع يرسل: الاسم المستعار + الجوال + رقم العضوية + كلمة المرور
//   1) نتحقق إن الرقمين مطابقان لنفس السطر في قائمة النادي (مع قفل المحاولات الغلط)
//   2) ننشئ الحساب
//   3) نربط العضوية بالحساب. لو فشل الربط نحذف الحساب (ما يبقى حساب يتيم)
//
// الحساب يُنشأ بعنوان داخلي مبني من الجوال (مثل 966501234567@example.com).
// ما يُرسل عليه أي إيميل، والمشتركة ما تشوفه. الدخول بعدها بالجوال + كلمة المرور.
//
// ⚠️ هذي الدالة تستخدم المفتاح السري (secret) الذي يوفره Supabase تلقائياً داخل الدالة.
//    لا تنسخين هذا المفتاح لأي مكان، ولا تحطينه في ملفات الموقع أبداً.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

/* ===================== إعدادات (عدّليها) ===================== */

// المواقع المسموح لها تستدعي الدالة من المتصفح (بدون / في الآخر)
const ALLOWED_ORIGINS = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://YOUR-USERNAME.github.io',   // ← بدّلي YOUR-USERNAME باسم حسابك في GitHub
];

// الجزء الأخير من العنوان الداخلي للحساب. لا تغيّرينه بعد ما تنشئين أول حساب،
// لأن صفحة الدخول تبني نفس العنوان من رقم الجوال.
const EMAIL_DOMAIN = 'example.com';

/* ===================== توحيد الأرقام (نفس منطق SQL بالضبط) ===================== */

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';

function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (ch) => String(ARABIC_DIGITS.indexOf(ch) % 10));
}

export function normalizePhone(input: string): string | null {
  let d = toLatinDigits(input).replace(/[^0-9]/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (/^05[0-9]{8}$/.test(d)) d = '966' + d.slice(1);
  else if (/^5[0-9]{8}$/.test(d)) d = '966' + d;
  else if (d.startsWith('9660')) d = '966' + d.slice(4);
  return d;
}

export function normalizeCode(input: string): string | null {
  const d = toLatinDigits(input).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return d || null;
}

/* ===================== أدوات ===================== */

// deno-lint-ignore no-explicit-any
type Deps = { admin: any };

const KNOWN_REASONS = ['invalid', 'expired', 'already_claimed', 'locked'];

function corsHeaders(origin: string): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function reply(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// عنوان الجهاز: cf-connecting-ip يضيفه Cloudflare ولا يقدر العميل يزوّره.
// نحفظ بصمة مشفّرة فقط، مو العنوان نفسه.
function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',');
    return parts[parts.length - 1].trim();
  }
  return '';
}

/* ===================== المعالج الرئيسي ===================== */

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const origin = req.headers.get('origin') ?? '';
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ ok: false, reason: 'method' }, 405, cors);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, reason: 'bad_request' }, 400, cors);
  }

  const displayName = String(body?.display_name ?? '').trim();
  const phone = normalizePhone(String(body?.phone ?? ''));
  const code = normalizeCode(String(body?.member_code ?? ''));
  const password = String(body?.password ?? '');
  const lang = body?.lang === 'en' ? 'en' : 'ar';

  // ---------- فحص الحقول (قبل ما نلمس قاعدة البيانات) ----------
  const nameLen = Array.from(displayName).length;
  if (nameLen < 2 || nameLen > 30) return reply({ ok: false, reason: 'bad_name' }, 200, cors);
  if (!phone || !/^[0-9]{8,15}$/.test(phone)) return reply({ ok: false, reason: 'bad_phone' }, 200, cors);
  if (!code || !/^[A-Z0-9]{1,20}$/.test(code)) return reply({ ok: false, reason: 'bad_code' }, 200, cors);
  if (password.length < 8 || password.length > 72) return reply({ ok: false, reason: 'bad_password' }, 200, cors);

  // ---------- 1) التحقق من القائمة + القفل ----------
  const ip = clientIp(req);
  const ipHash = ip ? await sha256Hex('titanium-gym:' + ip) : null;

  const check = await deps.admin.rpc('check_activation', {
    p_code: code,
    p_phone: phone,
    p_ip_hash: ipHash,
  });
  if (check.error) {
    console.error('check_activation failed:', check.error.message);
    return reply({ ok: false, reason: 'error' }, 500, cors);
  }
  if (check.data !== 'ok') {
    const reason = KNOWN_REASONS.includes(check.data) ? check.data : 'error';
    return reply({ ok: false, reason }, 200, cors);
  }

  // ---------- 2) إنشاء الحساب ----------
  const email = `${phone}@${EMAIL_DOMAIN}`;
  const created = await deps.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,                       // ما نرسل إيميل تأكيد، التحقق تم من القائمة
    user_metadata: { display_name: displayName, lang },   // للعرض فقط. العضوية تُقرأ من القائمة مو من هنا
  });

  if (created.error || !created.data?.user) {
    const c = String(created.error?.code ?? '');
    const m = String(created.error?.message ?? '').toLowerCase();
    if (c === 'email_exists' || c === 'user_already_exists' || m.includes('already')) {
      // جوال مستخدم في حساب ثاني (مثلاً مشتركتان بنفس الجوال)
      return reply({ ok: false, reason: 'phone_in_use' }, 200, cors);
    }
    if (c === 'weak_password') return reply({ ok: false, reason: 'bad_password' }, 200, cors);
    console.error('createUser failed:', c, m);
    return reply({ ok: false, reason: 'error' }, 500, cors);
  }

  const userId: string = created.data.user.id;

  // ---------- 3) ربط العضوية بالحساب (لو فشل نحذف الحساب) ----------
  const claim = await deps.admin.rpc('claim_membership', { p_code: code, p_user: userId });
  if (claim.error || claim.data !== true) {
    await deps.admin.auth.admin.deleteUser(userId);
    if (claim.error) {
      console.error('claim_membership failed:', claim.error.message);
      return reply({ ok: false, reason: 'error' }, 500, cors);
    }
    return reply({ ok: false, reason: 'already_claimed' }, 200, cors);
  }

  return reply({ ok: true, email }, 200, cors);
}

/* ===================== التشغيل على Supabase ===================== */

function getSecretKey(): string {
  // المفاتيح الجديدة أولاً، ثم القديم (service_role) لو المشروع قديم
  const dict = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (dict) {
    try {
      const k = JSON.parse(dict)['default'];
      if (k) return k;
    } catch { /* نكمل للقديم */ }
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  throw new Error('No secret key available in the function environment');
}

// deno-lint-ignore no-explicit-any
if (typeof (globalThis as any).Deno !== 'undefined' && !(globalThis as any).__TEST__) {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, getSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  Deno.serve((req: Request) => handle(req, { admin }));
}
