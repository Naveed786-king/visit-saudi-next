import { json } from '@/lib/vs/http';
import { getVs } from '@/lib/vs/store';

export const dynamic = 'force-dynamic';
export async function GET() {
  return json(200, { ok: true, reviews: (await getVs('vs.reviews')).filter((x) => x.visible !== false) });
}
