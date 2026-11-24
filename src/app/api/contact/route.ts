import { json, readJson } from '@/lib/vs/http';
import { prisma } from '@/lib/db';
import { rateLimit, clientIp } from '@/lib/api';
import { notifyAdmin, rowsTable } from '@/lib/mail';

// Website contact form → Admin → Enquiries
export async function POST(req: Request) {
  if (!rateLimit('contact:' + clientIp(req), 8, 10 * 60_000)) return json(429, { ok: false });
  const b = await readJson(req);
  if (!b.name || !b.msg || (!b.email && !b.phone)) return json(400, { ok: false });
  const lead = {
    name: String(b.name).slice(0, 90),
    email: String(b.email || '').slice(0, 120) || null,
    phone: String(b.phone || '').slice(0, 40) || null,
    service: String(b.topic || '').slice(0, 60) || null,
    message: String(b.msg).slice(0, 2000),
    source: 'website',
  };
  await prisma.lead.create({ data: lead });
  notifyAdmin(`New enquiry: ${lead.name}`, `<h2 style="margin-top:0">New enquiry on visit-saudi.ae</h2>${rowsTable([['Name', lead.name], ['Email', lead.email], ['Phone', lead.phone], ['Topic', lead.service], ['Message', lead.message]])}`, lead.email || undefined, 'leads');
  return json(200, { ok: true });
}
