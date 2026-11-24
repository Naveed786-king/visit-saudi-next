// What the website assistant knows about visit-saudi.ae: contact and prices from the admin, the eligible
// nationalities, the FAQ, every visa page, every guide and every post (built-in and added in the admin).
import fs from 'fs';
import path from 'path';
import { getVs } from '@/lib/vs/store';
import { SITE_ROOT, decEnt, guideZone, listBuiltGuides } from '@/lib/vs/render';
import { VISA_LABELS } from '@/lib/vs/apps';
import { prisma } from '@/lib/db';

const read = (rel: string) => {
  try {
    return fs.readFileSync(path.join(SITE_ROOT, rel), 'utf8');
  } catch {
    return '';
  }
};
const plain = (h: string) =>
  decEnt(
    h
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<\/(p|li|h2|h3|summary|div)>/g, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
const between = (h: string, a: string, b: string) => {
  const i = h.indexOf(a);
  if (i < 0) return '';
  const j = h.indexOf(b, i + a.length);
  return j < 0 ? h.slice(i) : h.slice(i, j);
};

export type Article = { title: string; excerpt: string; url: string; body: string };

export async function vsKnowledge() {
  const site = await getVs('vs.site');
  const app = read('assets/js/app.js');
  const eligible = (app.match(/var ELIGIBLE=(\[[^\]]*\])/) || [])[1];
  let elig: string[] = [];
  try {
    elig = eligible ? JSON.parse(eligible) : [];
  } catch {
    /* unreadable list */
  }
  // FAQ page
  const faqHtml = read('faqs.html');
  const faq = [...faqHtml.matchAll(/<details><summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map((m) => `Q: ${plain(m[1])}\nA: ${plain(m[2])}`).join('\n');
  const prices = Object.entries(site.prices || {})
    .filter(([, v]) => v && Number(v.amount) > 0)
    .map(([k, v]) => `${VISA_LABELS[k] || k}: ${v.currency} ${v.amount} (full total)`)
    .join('\n');
  const text = [
    `CONTACT: WhatsApp +${String(site.whatsapp || '').replace(/\D/g, '')} (fastest), email ${site.email}. A specialist answers on WhatsApp.`,
    `HOW OUR PRICES WORK: the total has two parts, the official Saudi fee (which includes the mandatory medical insurance) and our service fee for the specialist check and handling. We confirm the full total in writing before the client pays anything. ${prices ? `\nPUBLISHED TOTALS (pay online after applying):\n${prices}` : 'For an exact total a specialist quotes free on WhatsApp.'}`,
    `USEFUL PAGES: apply online /apply · track an application /track (reference VSA-XXXXXX + passport number) · eligibility checker /eligibility · all visa types /visa-types · visas for UAE residents /uae-residents · express service /express · FAQ /faqs · guides /guides · contact /contact · refund policy /refund-policy`,
    elig.length ? `ELIGIBLE NATIONALITIES FOR THE SAUDI TOURIST eVISA (${elig.length}): ${elig.join(', ')}.\nOthers: GCC residents (UAE, Qatar, Kuwait, Bahrain, Oman) can apply on their residency; holders of a used US, UK or Schengen visa have a special route; everyone else usually travels on a sponsored visit visa (family, personal or business).` : '',
    faq && `FAQ:\n${faq}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const articles: Article[] = [];
  // the visa pages
  try {
    for (const f of fs.readdirSync(path.join(SITE_ROOT, 'visa')).filter((x) => x.endsWith('.html'))) {
      const h = read('visa/' + f);
      const title = plain((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || f);
      const excerpt = decEnt((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
      const main = between(h, '<h1', '<footer');
      articles.push({ title, excerpt, url: '/visa/' + f.replace(/\.html$/, ''), body: plain(main).slice(0, 2200) });
    }
  } catch {
    /* no visa folder */
  }
  for (const p of ['/visa-types', '/eligibility', '/uae-residents', '/express', '/eservices', '/refund-policy']) {
    const h = read(p.slice(1) + '.html');
    if (!h) continue;
    articles.push({
      title: plain((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || p),
      excerpt: decEnt((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''),
      url: p,
      body: plain(between(h, '<h1', '<footer')).slice(0, 2000),
    });
  }
  // guides (with the admin's changes) and posts added in the admin
  const govs = await getVs('vs.guides');
  for (const g of listBuiltGuides()) {
    const ov = govs[g.slug];
    if (ov?.published === false) continue;
    const h = read('guides/' + g.slug + '.html');
    const z = guideZone(h);
    const body = ov?.body ? ov.body : z ? plain(h.slice(z.a, z.b)) : '';
    articles.push({ title: ov?.title || g.title, excerpt: ov?.excerpt || g.excerpt, url: '/guides/' + g.slug, body: body.slice(0, 1600) });
  }
  for (const p of (await getVs('vs.posts')).filter((x) => x.published)) {
    articles.push({ title: p.title, excerpt: p.excerpt, url: '/guides/' + p.slug, body: (p.html ? plain(p.html) : p.body).slice(0, 1600) });
  }
  // articles of the Auto Publisher that are not (yet) in the posts list
  const own = new Set(articles.map((a) => a.url));
  const auto = await prisma.post.findMany({ where: { status: 'published' }, select: { slug: true, title: true, excerpt: true, content: true } }).catch(() => []);
  for (const p of auto) if (!own.has('/guides/' + p.slug)) articles.push({ title: p.title, excerpt: p.excerpt || '', url: '/guides/' + p.slug, body: plain(p.content).slice(0, 1600) });
  return { text, articles };
}
