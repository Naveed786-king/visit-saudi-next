import path from 'path';
import { json, readJson } from '@/lib/vs/http';
import { findTracked, vsOf } from '@/lib/vs/apps';
import { readStored } from '@/lib/upload';

const MIME: Record<string, string> = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// Download of the issued eVisa or the refund / resolution proof from the tracking page
export async function POST(req: Request) {
  const b = await readJson(req);
  const app = await findTracked(b.ref, b.pass);
  if (!app) return json(404, { ok: false });
  const vs = vsOf(app);
  const meta = b.kind === 'resolution' ? vs.resolution?.proof : vs.issuedDoc;
  if (!meta?.path) return json(404, { ok: false });
  const buf = await readStored(meta.path);
  if (!buf) return json(404, { ok: false });
  const name = path.basename(meta.name || meta.path).replace(/"/g, '');
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': MIME[path.extname(name).toLowerCase()] || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${name}"` } });
}
