import { fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { makePdf } from '@/lib/portal/pdf';
import { emailHtml, fillTpl } from '@/lib/portal/notify';
import { emailPage } from '@/lib/mail';

export const dynamic = 'force-dynamic';

/** Sample quote, receipt or email with the saved settings (Admin > Emails & PDFs > Preview). */
export async function GET(req: Request) {
  if (!(await requireStaff())) return fail('Unauthorized', 401);
  const kind = new URL(req.url).searchParams.get('kind') || 'quote';
  if (kind === 'email') {
    const cfg = await getSetting('clientMail');
    const v = { name: 'Sara', ref: 'VSA-1A2B3C', service: 'Saudi Tourist eVisa', total: 'AED 650.00', link: '#' };
    const site = await getSetting('site');
    const html = emailHtml(fillTpl(cfg.events.quote.body, v), cfg.signOff, 'View my quotation');
    return new Response(`<p style="font:13px system-ui;color:#666;margin:12px">Subject: <b>${fillTpl(cfg.events.quote.subject, v)}</b></p>${emailPage(html, site.name || 'Visit Saudi')}`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const quote = kind !== 'receipt';
  const pdf = await makePdf(
    quote
      ? { kind: 'quote', name: 'Sara Ahmed', ref: 'VSA-1A2B3C', facts: [['Service', 'Saudi Tourist eVisa']], lines: [['Saudi Tourist eVisa: visa fee', 'AED 480.00'], ['Saudi Tourist eVisa: service fee', 'AED 170.00']], totalLabel: 'Total', total: 'AED 650.00' }
      : { kind: 'receipt', name: 'Sara Ahmed', ref: 'VSA-1A2B3C', facts: [['Receipt no.', 'VSA-1A2B3C-R1'], ['Paid on', new Date().toLocaleDateString('en-GB')], ['Payment method', 'Card']], desc: 'Saudi Tourist eVisa', lines: [['Visa fee', 'AED 650.00'], ['Card fee (UAE card)', 'AED 18.85']], totalLabel: 'Amount received', total: 'AED 668.85' },
  );
  return new Response(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="sample-${quote ? 'quote' : 'receipt'}.pdf"` } });
}
