import { json, readJson } from '@/lib/vs/http';
import { prisma } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/api';
import { findTracked, trackView } from '@/lib/vs/apps';
import { notifyTeam } from '@/lib/portal/notify';

// Message from the client on the tracking page → the file's messages in the admin
export async function POST(req: Request) {
  if (!rateLimit('vsmsg:' + clientIp(req), 20, 10 * 60_000)) return json(429, { ok: false });
  const b = await readJson(req);
  const app = await findTracked(b.ref, b.pass);
  if (!app) return json(404, { ok: false });
  const text = String(b.text || '').trim().slice(0, 1000);
  if (!text) return json(400, { ok: false });
  await prisma.message.create({ data: { applicationId: app.id, body: text, fromAdmin: false, senderId: app.userId, channel: 'portal' } });
  await prisma.application.update({ where: { id: app.id }, data: { seen: false } }).catch(() => null);
  void notifyTeam('teamMessage', { name: app.fullName, ref: app.refNo, text: text.slice(0, 300) }, app.id);
  const fresh = (await findTracked(b.ref, b.pass))!;
  return json(200, { ok: true, messages: (await trackView(fresh)).messages });
}
