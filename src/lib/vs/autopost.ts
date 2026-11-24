// Articles written by the Auto Publisher become posts of the website (Admin → Posts & guides):
// same page design as the guides at /guides/<slug>, on the Guides page, in the sitemap, and translated
// into the 18 other languages in the background (languages changed by hand are kept).
import { getVs, saveVs, type VsPost } from './store';
import { listBuiltGuides, LANG_LIST } from './render';
import { engineProblem, translateFields } from './translate';

const strip = (h: string) => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** The Auto Publisher's HTML in the website's own article classes (quick answer box, FAQ as on the guides) */
export function siteArticleHtml(html: string) {
  let out = String(html || '');
  out = out.replace(/<div class="quick-answer">([\s\S]*?)<\/div>/, (m, inner: string) => {
    const parts = [...inner.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => x[1]);
    const text = parts.length > 1 ? parts.slice(1).join(' ') : strip(inner);
    return `<div class="summary" style="margin:20px 0 26px"><b style="display:block;margin-bottom:9px">Quick answer</b><p style="margin:0">${text}</p></div>`;
  });
  out = out.replace(/<section class="post-faq"><h2>([\s\S]*?)<\/h2>([\s\S]*?)<\/section>/, (m, h: string, inner: string) => {
    const qa = [...inner.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((x) => ({ q: x[1], a: x[2] }));
    if (!qa.length) return m;
    const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map((f) => ({ '@type': 'Question', name: strip(f.q), acceptedAnswer: { '@type': 'Answer', text: strip(f.a) } })) };
    return `<h2>${h}</h2>` + qa.map((f) => `<details class="afaq"><summary>${f.q}</summary><p>${f.a}</p></details>`).join('') + `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  });
  return out;
}

/** A post's address must not be one of the built-in guides or another post */
export async function takenPostSlugs(exceptAutoId?: string) {
  const posts = await getVs('vs.posts');
  return new Set([...listBuiltGuides().map((g) => g.slug), ...posts.filter((p) => !exceptAutoId || p.autoId !== exceptAutoId).map((p) => p.slug)]);
}

type AutoPost = { id: string; slug: string; title: string; excerpt: string | null; content: string; cover: string | null; category: string; metaTitle: string | null; metaDescription: string | null; status: string; publishedAt: Date };

/** Called by the Auto Publisher whenever it saves an article */
export async function mirrorAutoPost(p: AutoPost) {
  const posts = await getVs('vs.posts');
  const i = posts.findIndex((x) => x.autoId === p.id || (x.slug === p.slug && !!x.autoId));
  const prev = i >= 0 ? posts[i] : undefined;
  const html = siteArticleHtml(p.content);
  const changed = !prev || prev.html !== html || prev.title !== p.title || prev.excerpt !== (p.excerpt || '');
  const tr = { ...(prev?.tr || {}) };
  // the English changed: translations made by the engine are made again, the ones changed by hand stay
  if (changed) for (const l of Object.keys(tr)) if (!tr[l]?.manual) delete tr[l];
  const post: VsPost = {
    slug: prev?.slug || p.slug,
    title: p.title,
    cat: p.category || 'Saudi Visa',
    excerpt: p.excerpt || p.metaDescription || '',
    image: p.cover || '',
    body: '',
    html,
    date: (p.publishedAt instanceof Date ? p.publishedAt : new Date(p.publishedAt)).toISOString().slice(0, 10),
    published: p.status === 'published',
    updatedAt: new Date().toISOString(),
    autoId: p.id,
    seoTitle: p.metaTitle || undefined,
    tr,
  };
  if (i >= 0) posts[i] = post;
  else posts.unshift(post);
  await saveVs('vs.posts', posts);
  if (post.published && changed) void translatePostInBackground(post.slug);
  return post;
}

/** Removes the website post of an Auto Publisher article (when the article is deleted there) */
export async function unmirrorAutoPost(autoId: string) {
  const posts = await getVs('vs.posts');
  const next = posts.filter((x) => x.autoId !== autoId);
  if (next.length !== posts.length) await saveVs('vs.posts', next);
}

const running = new Set<string>();
/** Translates a post into every language that has no translation yet (one language after another) */
export async function translatePostInBackground(slug: string) {
  if (running.has(slug)) return;
  if (await engineProblem()) return; // no engine: the post shows in English until one is chosen
  running.add(slug);
  try {
    for (const lang of LANG_LIST) {
      const posts = await getVs('vs.posts');
      const p = posts.find((x) => x.slug === slug);
      if (!p) return;
      if (p.tr?.[lang]) continue;
      try {
        const t = await translateFields({ title: p.title, cat: p.cat, excerpt: p.excerpt, body: p.body, html: p.html }, lang);
        const fresh = await getVs('vs.posts');
        const q = fresh.find((x) => x.slug === slug);
        if (!q) return;
        q.tr = { ...(q.tr || {}), [lang]: t };
        await saveVs('vs.posts', fresh);
      } catch (e) {
        console.error(`[posts] translation of /guides/${slug} into ${lang} failed:`, e instanceof Error ? e.message : e);
        return;
      }
    }
  } finally {
    running.delete(slug);
  }
}


/** Brings every Auto Publisher article into the posts list (new, changed, published / unpublished, deleted) */
export async function syncAutoPosts() {
  const { prisma } = await import('@/lib/db');
  const all = await prisma.post.findMany({ select: { id: true, slug: true, title: true, excerpt: true, content: true, cover: true, category: true, metaTitle: true, metaDescription: true, status: true, publishedAt: true, author: true } });
  // only articles of the Auto Publisher (the website's own guides are files, not database posts)
  const auto = all.filter((p) => p.author === 'Visit Saudi');
  for (const p of auto) await mirrorAutoPost(p);
  const ids = new Set(auto.map((p) => p.id));
  const posts = await getVs('vs.posts');
  const next = posts.filter((x) => !x.autoId || ids.has(x.autoId));
  if (next.length !== posts.length) await saveVs('vs.posts', next);
}

/** Never let a hook of the website stop the Auto Publisher */
export function mirrorSafe(p: AutoPost | null | undefined) {
  if (!p) return;
  mirrorAutoPost(p).catch((e) => console.error('[posts] could not show the Auto Publisher article on the website:', e instanceof Error ? e.message : e));
}
