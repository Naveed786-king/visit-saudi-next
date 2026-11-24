import { json, readJson } from '@/lib/vs/http';
import { findTracked, trackView } from '@/lib/vs/apps';
import { isPaid, paymentsLive, priceFor, verifyIntent } from '@/lib/vs/pay';
import { rateLimit, clientIp } from '@/lib/api';

const DEMO = { ref: 'VSA-DEMO26', pass: 'X1234567', name: 'Sample Applicant', visa: 'tourist', stage: 2 };
const DEMO_STAGES = ['Application received', 'Expert document check', 'Submitted to the authority', 'With the authority', 'Decision received', 'eVisa ready'];

export async function POST(req: Request) {
  if (!rateLimit('track:' + clientIp(req), 30, 10 * 60_000)) return json(429, { ok: false });
  const b = await readJson(req);
  const ref = String(b.ref || '').toUpperCase().trim();
  const pass = String(b.pass || '').toUpperCase().trim();
  if (ref === DEMO.ref && pass === DEMO.pass) {
    return json(200, {
      ok: true, ref: DEMO.ref, name: DEMO.name, visa: DEMO.visa, stage: DEMO.stage, demo: true, stages: DEMO_STAGES, paid: false, pay_status: '', payable: false,
      history: [{ stage: 0, at: '2026-11-01T09:12:00Z' }, { stage: 1, at: '2026-11-01T15:40:00Z' }, { stage: 2, at: '2026-11-02T10:05:00Z' }],
    });
  }
  let app = await findTracked(ref, pass);
  if (!app) return json(404, { ok: false });
  if (!isPaid(app)) {
    await verifyIntent(app);
    app = (await findTracked(ref, pass)) || app;
  }
  const v = await trackView(app);
  const vs = v.vs;
  const paid = isPaid(app);
  const price = await priceFor(vs.visa || '');
  const payable = !paid && !!price && (await paymentsLive());
  return json(200, {
    ok: true, ref: app.refNo, name: app.fullName, visa: vs.visa || app.service, stage: v.stage, stages: v.stages,
    officialRef: vs.officialRef || '', issuedDoc: vs.issuedDoc ? vs.issuedDoc.name : '',
    resolution: vs.resolution ? { status: vs.resolution.status, amount: vs.resolution.amount, date: vs.resolution.date, comment: vs.resolution.comment, proof: vs.resolution.proof ? { name: vs.resolution.proof.name } : undefined } : null,
    messages: v.messages,
    paid, pay_status: vs.pay?.status || '', amount_paid: vs.pay?.amountPaid || '', paid_at: vs.pay?.paidAt || '',
    pay_total: payable && price ? { amount: price.amount, currency: price.currency } : null, payable,
    history: v.history,
  });
}
