// Website extras of one application: website payment (Ziina), official reference, issued eVisa, refund / resolution, note for the tracking page
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { json, readJson } from '@/lib/vs/http';
import { saveVsMeta, storeDataUrl, visaLabel, vsOf } from '@/lib/vs/apps';
import { isPaid, verifyIntent } from '@/lib/vs/pay';
import { stepsFor, currentStageId } from '@/lib/portal/files';
import { notifyClient } from '@/lib/portal/notify';

export const dynamic = 'force-dynamic';

async function view(id: string) {
  const a = await prisma.application.findUnique({ where: { id } });
  if (!a) return null;
  const vs = vsOf(a);
  return { ok: true, website: !!vs.visa, visa: vs.visa ? visaLabel(vs.visa) : '', vs: { ...vs, issuedDoc: vs.issuedDoc ? { name: vs.issuedDoc.name } : null, resolution: vs.resolution ? { ...vs.resolution, proof: vs.resolution.proof ? { name: vs.resolution.proof.name } : undefined } : null }, paid: isPaid(a) };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireStaff())) return json(401, { error: 'Unauthorized' });
  const v = await view((await ctx.params).id);
  return v ? json(200, v) : json(404, { ok: false });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if (!s) return json(401, { error: 'Unauthorized' });
  const id = (await ctx.params).id;
  const a = await prisma.application.findUnique({ where: { id } });
  if (!a) return json(404, { ok: false });
  const b = await readJson(req);
  const vs = vsOf(a);
  switch (b.action) {
    case 'checkPayment':
      await verifyIntent(a);
      break;
    case 'officialRef':
      await saveVsMeta(id, { officialRef: String(b.value || '').slice(0, 60) });
      break;
    case 'clientNote': {
      // a note for the client on the tracking page, at the current step
      const steps = await stepsFor(a.service);
      const stage = Math.max(0, steps.findIndex((x) => x.id === currentStageId(a, steps)));
      const history = [...(vs.history || []), { stage, at: new Date().toISOString(), by: s.email, clientNote: String(b.value || '').slice(0, 300) }];
      await saveVsMeta(id, { history });
      break;
    }
    case 'issued': {
      if (b.remove) {
        await saveVsMeta(id, { issuedDoc: null });
        break;
      }
      const f = await storeDataUrl(id, String(b.data || ''), String(b.name || 'evisa.pdf'), 8 * 1024 * 1024);
      if (!f) return json(400, { ok: false, error: 'File rejected - PDF or image, max 8MB.' });
      await saveVsMeta(id, { issuedDoc: { name: String(b.name || f.name).slice(0, 80), path: f.path } });
      // also in the file's documents (admin and the client dashboard)
      await prisma.document.create({ data: { applicationId: id, name: `eVisa: ${String(b.name || f.name).slice(0, 80)}`, path: f.path, mime: f.mime, size: f.size, uploadedBy: 'admin', shared: true } });
      if (b.notify) void notifyClient(a, 'document', { document: 'eVisa' });
      break;
    }
    case 'resolution': {
      if (!b.status) {
        await saveVsMeta(id, { resolution: null });
        break;
      }
      const r = { ...(vs.resolution || {}), status: String(b.status).slice(0, 30), amount: String(b.amount || '').slice(0, 30), date: String(b.date || '').slice(0, 12), comment: String(b.comment || '').slice(0, 500) } as NonNullable<typeof vs.resolution>;
      if (b.proofData) {
        const f = await storeDataUrl(id, String(b.proofData), String(b.proofName || 'refund-proof.pdf'), 8 * 1024 * 1024);
        if (f) r.proof = { name: String(b.proofName || f.name).slice(0, 80), path: f.path };
      }
      await saveVsMeta(id, { resolution: r });
      break;
    }
    default:
      return json(400, { ok: false });
  }
  return json(200, (await view(id))!);
}
