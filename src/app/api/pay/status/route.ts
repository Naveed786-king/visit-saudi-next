import { json, readJson } from '@/lib/vs/http';
import { findTracked, vsOf } from '@/lib/vs/apps';
import { isPaid, verifyIntent } from '@/lib/vs/pay';

export async function POST(req: Request) {
  const b = await readJson(req);
  const app = await findTracked(b.ref, b.pass);
  if (!app) return json(404, { ok: false });
  await verifyIntent(app);
  const fresh = (await findTracked(b.ref, b.pass)) || app;
  const vs = vsOf(fresh);
  return json(200, { ok: true, paid: isPaid(fresh), pay_status: vs.pay?.status || '', amount_paid: vs.pay?.amountPaid || '' });
}
