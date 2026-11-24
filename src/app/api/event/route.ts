import { json, readJson } from '@/lib/vs/http';
import { logEvent } from '@/lib/vs/apps';

export async function POST(req: Request) {
  const b = await readJson(req);
  const t = String(b.t || '').slice(0, 20);
  if (!['checker', 'apply_start', 'apply_done', 'whatsapp'].includes(t)) return json(400, { ok: false });
  await logEvent(t, { nat: String(b.nat || ''), path: String(b.path || '') });
  return json(200, { ok: true });
}
