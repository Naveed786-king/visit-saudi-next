import { json } from '@/lib/vs/http';
import { getVs } from '@/lib/vs/store';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const posts = (await getVs('vs.blog')).filter((x) => x.published !== false);
  const slug = new URL(req.url).searchParams.get('slug');
  if (slug) {
    const one = posts.find((x) => x.slug === slug);
    return one ? json(200, { ok: true, post: one }) : json(404, { ok: false });
  }
  return json(200, { ok: true, posts: posts.map((x) => ({ slug: x.slug, title: x.title, cat: x.cat, excerpt: x.excerpt, date: x.date, image: x.image || '' })) });
}
