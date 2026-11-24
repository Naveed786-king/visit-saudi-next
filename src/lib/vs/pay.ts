// Ziina pay-after-apply for the three priced visas, exactly as before (same account as Dubai Visa Portal).
// IMPORTANT: Ziina allows ONE webhook per account and Dubai Visa Portal uses it — this site registers NO webhook.
// A payment is confirmed by re-reading the intent from Ziina (return page, tracking page, admin "Check payment").
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { getVs } from './store';
import { LANG_LIST, escText } from './render';
import { saveVsMeta, vsOf, type VsMeta } from './apps';
import { notifyTeam } from '@/lib/portal/notify';

async function ziinaKey() {
  const env = (process.env.ZIINA_API_KEY || '').trim();
  if (env) return env;
  try {
    return String((await getSetting('payments')).ziinaToken || '').trim();
  } catch {
    return '';
  }
}
async function ziinaTest() {
  const env = (process.env.ZIINA_TEST || '').trim().toLowerCase();
  if (env) return env === 'true';
  try {
    return !!(await getSetting('payments')).test;
  } catch {
    return false;
  }
}
export async function ziinaConfigured() {
  return (await ziinaKey()).length > 10;
}
const siteUrl = () => (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://visit-saudi.ae').replace(/\/$/, '');

/** Online payment switched on in Admin → Website prices & payment, with Ziina and a key */
export async function paymentsLive() {
  const s = await getVs('vs.site');
  return !!s.payments.enabled && String(s.payments.provider || '').toLowerCase() === 'ziina' && (await ziinaConfigured());
}
export async function priceFor(visa: string) {
  const s = await getVs('vs.site');
  const p = (s.prices || {})[visa];
  return p && Number(p.amount) > 0 ? { amount: Number(p.amount), currency: String(p.currency || 'USD').toUpperCase() } : null;
}

async function ziina(method: string, path: string, body?: unknown) {
  const r = await fetch('https://api-v2.ziina.com' + path, {
    method,
    headers: { Authorization: 'Bearer ' + (await ziinaKey()), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let data: any = {};
  try {
    data = await r.json();
  } catch {
    throw new Error('Ziina: unreadable response');
  }
  if (r.ok) return data;
  throw new Error(String((data && (data.message || data.error?.message)) || 'Ziina error ' + r.status).slice(0, 200));
}

type AppRow = { id: string; refNo: string; meta: string | null; fullName: string; phone: string | null; email: string | null };

export async function createIntent(app: AppRow, price: { amount: number; currency: string }, lang: string) {
  const prefix = lang && LANG_LIST.includes(lang) ? '/' + lang : '';
  const vs = vsOf(app);
  const base = siteUrl();
  const z = await ziina('POST', '/api/payment_intent', {
    amount: Math.round(price.amount * 100),
    currency_code: price.currency,
    message: 'Visit Saudi - ' + (vs.visa || 'visa application') + ' - ' + app.refNo,
    success_url: base + prefix + '/pay/success?ref=' + encodeURIComponent(app.refNo) + '&intent_id={PAYMENT_INTENT_ID}',
    cancel_url: base + prefix + '/pay/cancel?ref=' + encodeURIComponent(app.refNo),
    failure_url: base + prefix + '/pay/cancel?ref=' + encodeURIComponent(app.refNo),
    test: await ziinaTest(),
  });
  if (!z || !z.id || !z.redirect_url) throw new Error('Ziina: unexpected response creating the payment');
  return { id: String(z.id), url: String(z.redirect_url) };
}

async function markPaid(app: AppRow, intentId: string, amountLabel: string) {
  const vs = vsOf(app);
  if (vs.pay?.status === 'paid') return;
  await saveVsMeta(app.id, { pay: { ...(vs.pay || {}), status: 'paid', paidAt: new Date().toISOString(), amountPaid: amountLabel || vs.pay?.amountPaid || '', intent: intentId || vs.pay?.intent } });
  await prisma.message
    .create({ data: { applicationId: app.id, body: `Website payment received${amountLabel ? ': ' + amountLabel : ''} (Ziina).`, fromAdmin: true, channel: 'internal' } })
    .catch(() => null);
  void notifyTeam('teamPayment', { name: app.fullName, ref: app.refNo, amount: amountLabel, item: 'Visa fee (website)' }, app.id);
}

/** Re-reads the stored intent from Ziina; marks the application paid when Ziina says completed with the right amount */
export async function verifyIntent(app: AppRow): Promise<{ paid: boolean; status?: string; error?: string }> {
  const vs = vsOf(app);
  if (vs.pay?.status === 'paid') return { paid: true };
  if (!vs.pay?.intent) return { paid: false };
  return checkIntent(app, vs.pay.intent, vs);
}
async function checkIntent(app: AppRow, intentId: string, vs: VsMeta) {
  try {
    const z = await ziina('GET', '/api/payment_intent/' + encodeURIComponent(intentId));
    const amountOk = !vs.pay?.amount || (z.amount != null && Math.round(Number(z.amount) / 100) === Number(vs.pay.amount));
    const curOk = !vs.pay?.currency || !z.currency_code || String(z.currency_code).toUpperCase() === String(vs.pay.currency).toUpperCase();
    if (z && z.status === 'completed' && amountOk && curOk) {
      const price = await priceFor(vs.visa || '');
      const amt = vs.pay?.amount || (price ? price.amount : '');
      const cur = vs.pay?.currency || (price ? price.currency : 'USD');
      await markPaid(app, intentId, amt ? cur + ' ' + amt : '');
      return { paid: true };
    }
    return { paid: false, status: z ? z.status : '' };
  } catch (e) {
    return { paid: false, error: (e as Error).message };
  }
}

export const isPaid = (app: Pick<AppRow, 'meta'>) => vsOf(app).pay?.status === 'paid';

/** Page shown when Ziina sends the visitor back (same look as before) */
export function payPage(kind: 'success' | 'cancel' | 'failed', ref: string) {
  const ok = kind === 'success';
  const heading = ok ? 'Thank you - payment received.' : kind === 'cancel' ? 'Payment cancelled' : 'Payment not completed';
  const body = ok
    ? '<p>Your payment for application <b>' + escText(ref) + '</b> is confirmed. Our team will now proceed with your visa application and keep you updated on WhatsApp.</p><p class="mut">You can also <a href="/track?ref=' + encodeURIComponent(ref) + '">track your application</a> any time with your reference and passport number.</p>'
    : '<p>No charge was made for application <b>' + escText(ref) + '</b>. You can try again whenever you are ready - your application is saved.</p><p><a class="btn" href="/track?ref=' + encodeURIComponent(ref) + '">Back to tracking</a></p>';
  return (
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + (ok ? 'Payment received' : 'Payment cancelled') + ' - Visit Saudi</title><style>' +
    ':root{--green:#0B3D2A;--gold:#C9A227;--ink:#1d2b26;--mut:#5d6f68;--bg:#F7F5EF}' +
    "*{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;background:var(--bg);color:var(--ink)}" +
    '.wrap{max-width:640px;margin:0 auto;padding:56px 20px;text-align:center}' +
    '.seal{width:74px;height:74px;margin:0 auto 18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:' + (ok ? '#0f7a4d' : '#8a8f8c') + ';color:#fff;font-size:34px}' +
    'h1{color:var(--green);font-size:30px;margin:0 0 12px}p{line-height:1.65}.mut{color:var(--mut);font-size:14px}' +
    '.ref{display:inline-block;margin:14px 0;padding:10px 22px;border:1.5px dashed var(--gold);border-radius:10px;font-family:ui-monospace,monospace;font-size:18px;letter-spacing:1px;background:#fff}' +
    '.btn{display:inline-block;margin-top:14px;padding:12px 26px;border-radius:999px;background:var(--green);color:#fff;text-decoration:none;font-weight:bold}a{color:var(--green)}' +
    '</style></head><body><div class="wrap"><div class="seal">' + (ok ? '&#10003;' : '&#10005;') + '</div><h1>' + heading + '</h1>' +
    '<div class="ref">' + escText(ref) + '</div>' + body +
    '<p class="mut" style="margin-top:28px">Visit Saudi - visit-saudi.ae<br>Secure payment processed by Ziina. We never see or store your card details.</p>' +
    '</div></body></html>'
  );
}

const html = (status: number, body: string) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

/** /pay/success and /pay/cancel (also with a language prefix) */
export async function payReturn(kind: 'success' | 'cancel', url: URL) {
  const ref = String(url.searchParams.get('ref') || '').toUpperCase().trim();
  const app = ref ? await prisma.application.findUnique({ where: { refNo: ref } }) : null;
  if (kind === 'cancel') {
    if (app && !isPaid(app)) await saveVsMeta(app.id, { pay: { ...(vsOf(app).pay || {}), status: 'failed' } });
    return html(200, payPage('cancel', ref || 'unknown'));
  }
  const intentId = String(url.searchParams.get('intent_id') || '').trim();
  if (!app || !intentId) return html(400, payPage('failed', ref || 'unknown'));
  const r = await checkIntent(app, intentId, vsOf(app));
  return html(200, payPage(r.paid ? 'success' : 'failed', ref));
}
