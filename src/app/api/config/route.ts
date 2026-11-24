import { json } from '@/lib/vs/http';
import { getVs } from '@/lib/vs/store';
import { ziinaConfigured } from '@/lib/vs/pay';

export const dynamic = 'force-dynamic';
export async function GET() {
  const s = await getVs('vs.site');
  return json(200, { ok: true, whatsapp: s.whatsapp, email: s.email, prices: s.prices || {}, payments: { enabled: !!s.payments.enabled, provider: s.payments.provider || '', configured: await ziinaConfigured() } });
}
