// =====================================================================
// admin-reset-password  —  الأدمن تغيّر كلمة مرور عضوة (Supabase Edge Function)
//
// المسار:
//   صفحة الأدمن ترسل: رقم العضوية + كلمة المرور الجديدة (ومعها جلسة الأدمن تلقائياً)
//   1) نتأكد إن اللي أرسل الطلب مسجّلة دخول بحساب موجود في جدول admins
//   2) نجيب حساب العضوة من قائمة المشتركات برقم العضوية
//   3) نغيّر كلمة المرور
//
// ⚠️ هذي الدالة تستخدم المفتاح السري (secret) الذي يوفره Supabase تلقائياً داخل الدالة.
//    لا تنسخين هذا المفتاح لأي مكان، ولا تحطينه في ملفات الموقع أبداً.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

/* ===================== إعدادات (عدّليها) ===================== */

// نفس القائمة الموجودة في دالة activate-member بالضبط (بدون / في الآخر)
const ALLOWED_ORIGINS = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://falb79.github.io',   // ← بدّلي YOUR-USERNAME باسم حسابك في GitHub
];

/* ===================== أدوات ===================== */

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';

function toLatinDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (ch) => String(ARABIC_DIGITS.indexOf(ch) % 10));
}

// نفس منطق normalize_code في قاعدة البيانات
export function normalizeCode(input: string): string | null {
  const d = toLatinDigits(input).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return d || null;
}

// deno-lint-ignore no-explicit-any
type Deps = { admin: any };

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

/* ===================== المعالج الرئيسي ===================== */

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const origin = req.headers.get('origin') ?? '';
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply({ ok: false, reason: 'method' }, 405, cors);

  // ---------- 1) من اللي أرسل الطلب؟ لازم تكون أدمن ----------
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return reply({ ok: false, reason: 'not_admin' }, 401, cors);

  const who = await deps.admin.auth.getUser(token);
  const callerId: string | undefined = who?.data?.user?.id;
  if (who.error || !callerId) return reply({ ok: false, reason: 'not_admin' }, 401, cors);

  const isAdmin = await deps.admin.from('admins').select('user_id').eq('user_id', callerId).maybeSingle();
  if (isAdmin.error) {
    console.error('admins lookup failed:', isAdmin.error.message);
    return reply({ ok: false, reason: 'error' }, 500, cors);
  }
  if (!isAdmin.data) return reply({ ok: false, reason: 'not_admin' }, 403, cors);

  // ---------- 2) البيانات ----------
  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, reason: 'bad_request' }, 400, cors);
  }

  const code = normalizeCode(String(body?.member_code ?? ''));
  const password = String(body?.new_password ?? '');

  if (!code || !/^[A-Z0-9]{1,20}$/.test(code)) return reply({ ok: false, reason: 'not_found' }, 200, cors);
  if (password.length < 8 || password.length > 72) return reply({ ok: false, reason: 'bad_password' }, 200, cors);

  const member = await deps.admin.from('members_roster')
    .select('claimed_by').eq('member_code', code).maybeSingle();
  if (member.error) {
    console.error('roster lookup failed:', member.error.message);
    return reply({ ok: false, reason: 'error' }, 500, cors);
  }
  const userId: string | null = member.data?.claimed_by ?? null;
  if (!userId) return reply({ ok: false, reason: 'not_found' }, 200, cors);

  // حماية: ما نغيّر كلمة مرور حساب أدمن من هنا
  if (userId === callerId) return reply({ ok: false, reason: 'not_found' }, 200, cors);

  // ---------- 3) تغيير كلمة المرور ----------
  const upd = await deps.admin.auth.admin.updateUserById(userId, { password });
  if (upd.error) {
    const c = String(upd.error.code ?? '');
    if (c === 'weak_password') return reply({ ok: false, reason: 'bad_password' }, 200, cors);
    console.error('updateUserById failed:', c, upd.error.message);
    return reply({ ok: false, reason: 'error' }, 500, cors);
  }

  return reply({ ok: true }, 200, cors);
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
