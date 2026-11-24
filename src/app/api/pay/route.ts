import { json, readJson } from '@/lib/vs/http';
import { prisma } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/api';
import { saveVsMeta, vsOf } from '@/lib/vs/apps';
import { createIntent, isPaid, paymentsLive, priceFor } from '@/lib/vs/pay';

// "Pay now" on the website after applying (Ziina hosted page)
export async function POST(req: Request) {
  if (!rateLimit('vspay:' + clientIp(req), 20, 10 * 60_000)) return json(429, { ok: false, error: 'Too many attempts - please wait a few minutes.' });
  const b = await readJson(req);
  const ref = String(b.ref || '').toUpperCase().trim();
  const app = ref ? await prisma.application.findUnique({ where: { refNo: ref } }) : null;
  if (!app) return json(404, { ok: false, error: 'Application not found.' });
  if (isPaid(app)) return json(200, { ok: true, paid: true });
  const vs = vsOf(app);
  const price = await priceFor(vs.visa || '');
  if (!price) return json(400, { ok: false, error: 'This visa has no published online total yet - your total is confirmed in writing first.' });
  if (!(await paymentsLive())) return json(400, { ok: false, error: 'Online payments are not switched on yet - please contact us on WhatsApp.' });
  const p = vs.pay;
  if (p?.intent && p.status === 'pending' && p.url && p.at && (Date.now() - new Date(p.at).getTime()) / 60000 < 60) return json(200, { ok: true, url: p.url });
  try {
    const z = await createIntent(app, price, String(b.lang || '').slice(0, 5));
    await saveVsMeta(app.id, { pay: { ...(p || {}), status: 'pending', intent: z.id, url: z.url, at: new Date().toISOString(), amount: price.amount, currency: price.currency } });
    return json(200, { ok: true, url: z.url });
  } catch (e) {
    console.error('[vs pay]', (e as Error).message);
    return json(502, { ok: false, error: 'The payment page could not be opened - please try again or contact us on WhatsApp.' });
  }
}
