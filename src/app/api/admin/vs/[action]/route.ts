// Admin API for the visit-saudi.ae website: texts, guides, news, reviews, prices & payment, page styling, stats.
import fs from 'fs';
import path from 'path';
import { requireAdmin, requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { json, readJson } from '@/lib/vs/http';
import { getVs, saveVs, STYLE_VARS, DEFAULT_PRICES, type VsBlogPost, type VsReview } from '@/lib/vs/store';
import { LANG_LIST, SITE_ROOT, guideZone, listBuiltGuides, loadLangMap, zoneToText } from '@/lib/vs/render';
import { ziinaConfigured } from '@/lib/vs/pay';

export const dynamic = 'force-dynamic';
const LANGS = ['en', ...LANG_LIST];
const slugify = (s: string) => String(s || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'post';

/** Every page of the website (from the sitemap) for the styling and texts screens */
function sitePages() {
  try {
    const sm = fs.readFileSync(path.join(SITE_ROOT, 'sitemap.xml'), 'utf8');
    return [...sm.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
  } catch {
    return ['/'];
  }
}
function pageTitle(p: string) {
  try {
    const rel = p === '/' ? 'index.html' : p.slice(1) + '.html';
    const h = fs.readFileSync(path.join(SITE_ROOT, rel), 'utf8');
    const m = h.match(/<title>([\s\S]*?)<\/title>/);
    return m ? m[1].replace(/&amp;/g, '&').split(' | ')[0].trim() : p;
  } catch {
    return p;
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const url = new URL(req.url);
  if (action === 'stats') {
    if (!(await requireStaff())) return json(401, { error: 'Unauthorized' });
    const since = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    const rows = await prisma.vsEvent.findMany({ where: { day: { gte: since } }, select: { t: true, path: true, nat: true, day: true, lang: true } });
    const days: Record<string, number> = {};
    const tops: Record<string, number> = {};
    const nats: Record<string, number> = {};
    const langs: Record<string, number> = {};
    const funnel: Record<string, number> = { view: 0, checker: 0, apply_start: 0, apply_done: 0, whatsapp: 0 };
    for (const r of rows) {
      if (funnel[r.t] !== undefined) funnel[r.t]++;
      if (r.t === 'view') {
        days[r.day] = (days[r.day] || 0) + 1;
        if (r.path) tops[r.path] = (tops[r.path] || 0) + 1;
        langs[r.lang || 'en'] = (langs[r.lang || 'en'] || 0) + 1;
      }
      if (r.t === 'checker' && r.nat) nats[r.nat] = (nats[r.nat] || 0) + 1;
    }
    const top = (o: Record<string, number>, n: number) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));
    return json(200, { ok: true, days, funnel, topPages: top(tops, 15), topNats: top(nats, 15), langs: top(langs, 20) });
  }
  if (action === 'find') {
    // an application by its VSA reference (search box, tests)
    if (!(await requireStaff())) return json(401, { error: 'Unauthorized' });
    const ref = String(url.searchParams.get('ref') || '').toUpperCase().trim();
    const a = ref ? await prisma.application.findUnique({ where: { refNo: ref }, select: { id: true, refNo: true, fullName: true } }) : null;
    return a ? json(200, { ok: true, ...a }) : json(404, { ok: false });
  }
  if (!(await requireAdmin())) return json(401, { error: 'Unauthorized' });
  switch (action) {
    case 'site': {
      const s = await getVs('vs.site');
      return json(200, { ok: true, site: s, ziinaKeySet: await ziinaConfigured(), defaults: DEFAULT_PRICES });
    }
    case 'styling':
      return json(200, { ok: true, styling: await getVs('vs.styling'), vars: STYLE_VARS, pages: sitePages().map((p) => ({ path: p })) });
    case 'pages': {
      const st = await getVs('vs.styling');
      return json(200, { ok: true, pages: sitePages().map((p) => ({ path: p, title: pageTitle(p), styled: !!(st.pages || {})[p]?.trim() })) });
    }
    case 'blog':
      return json(200, { ok: true, posts: await getVs('vs.blog') });
    case 'reviews':
      return json(200, { ok: true, reviews: await getVs('vs.reviews') });
    case 'texts': {
      const langIn = url.searchParams.get('lang') || 'en';
      const lang = LANGS.includes(langIn) ? langIn : 'en';
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      const keys = Object.keys(loadLangMap('ar') || {});
      const ed = (await getVs('vs.content'))[lang] || {};
      const target = lang === 'en' ? {} : loadLangMap(lang);
      const hits = keys.filter((k) => !q || k.toLowerCase().includes(q) || String((target as any)[k] || '').toLowerCase().includes(q) || String(ed[k] || '').toLowerCase().includes(q));
      const out = hits.slice(0, 80).map((k) => ({ src: k, current: ed[k] !== undefined ? ed[k] : lang === 'en' ? k : (target as any)[k] || '', edited: ed[k] !== undefined }));
      const editedCount = Object.keys(ed).length;
      return json(200, { ok: true, lang, langs: LANGS, total: keys.length, matches: hits.length, editedCount, strings: out });
    }
    case 'guides': {
      const slug = url.searchParams.get('slug');
      const govs = await getVs('vs.guides');
      const built = listBuiltGuides();
      if (slug) {
        const g = built.find((x) => x.slug === slug);
        if (!g) return json(404, { ok: false });
        const ov = govs[slug];
        let bodyText = ov?.body || '';
        if (!bodyText) {
          try {
            const h = fs.readFileSync(path.join(SITE_ROOT, 'guides', slug + '.html'), 'utf8');
            const z = guideZone(h);
            bodyText = z ? zoneToText(h.slice(z.a, z.b)) : '';
          } catch {
            /* none */
          }
        }
        const merged: any = { ...g, ...(ov || {}), slug };
        delete merged.body;
        return json(200, { ok: true, guide: merged, bodyText, edited: !!ov });
      }
      const list = built.map((g) => {
        const ov = govs[g.slug];
        return ov ? { ...g, title: ov.title || g.title, cat: ov.cat || g.cat, excerpt: ov.excerpt || g.excerpt, image: ov.image || g.image, edited: true, published: ov.published !== false } : { ...g, edited: false, published: true };
      });
      return json(200, { ok: true, guides: list });
    }
  }
  return json(404, { ok: false });
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  if (!(await requireAdmin())) return json(401, { error: 'Unauthorized' });
  const { action } = await ctx.params;
  const b = await readJson(req);
  switch (action) {
    case 'site': {
      const s = await getVs('vs.site');
      s.whatsapp = String(b.whatsapp ?? s.whatsapp).replace(/[^0-9]/g, '').slice(0, 20) || s.whatsapp;
      s.email = String(b.email ?? s.email).slice(0, 120);
      s.notifyEmail = String(b.notifyEmail ?? s.notifyEmail).slice(0, 120);
      if (b.payments && typeof b.payments === 'object') s.payments = { enabled: !!b.payments.enabled, provider: String(b.payments.provider || '').slice(0, 40) };
      if (b.prices && typeof b.prices === 'object') {
        const prices: Record<string, { amount: number; currency: string }> = {};
        for (const k of Object.keys(b.prices).slice(0, 20)) {
          const v = b.prices[k] || {};
          const amt = parseFloat(v.amount);
          if (!isNaN(amt) && amt > 0) prices[String(k).slice(0, 40)] = { amount: amt, currency: String(v.currency || 'USD').slice(0, 5).toUpperCase() };
        }
        s.prices = prices;
      }
      await saveVs('vs.site', s);
      return json(200, { ok: true });
    }
    case 'styling': {
      const cur = await getVs('vs.styling');
      const vars: Record<string, string> = {};
      for (const v of STYLE_VARS) {
        const val = String(b.vars?.[v.key] ?? '').trim().slice(0, 200);
        if (val && val !== v.def) vars[v.key] = val;
      }
      const pages: Record<string, string> = {};
      const src = b.pages && typeof b.pages === 'object' ? b.pages : cur.pages || {};
      for (const k of Object.keys(src).slice(0, 400)) {
        const v = String(src[k] || '').slice(0, 20000);
        if (v.trim() && /^\/[a-z0-9/_-]*$/i.test(k)) pages[k] = v;
      }
      const googleFonts = Array.isArray(b.googleFonts) ? b.googleFonts.map((f: string) => String(f).replace(/[^a-zA-Z0-9 ]/g, '').trim()).filter(Boolean).slice(0, 4) : cur.googleFonts || [];
      await saveVs('vs.styling', { vars, googleFonts, css: String(b.css ?? cur.css ?? '').slice(0, 60000), pages });
      return json(200, { ok: true });
    }
    case 'texts': {
      if (!LANGS.includes(b.lang || '') || !b.src) return json(400, { ok: false });
      const all = await getVs('vs.content');
      all[b.lang] = all[b.lang] || {};
      const src = String(b.src).slice(0, 500);
      const val = String(b.value || '').slice(0, 2000);
      if (!val || val === src) delete all[b.lang][src];
      else all[b.lang][src] = val;
      await saveVs('vs.content', all);
      return json(200, { ok: true });
    }
    case 'guides': {
      const slug = String(b.slug || '');
      if (!listBuiltGuides().some((x) => x.slug === slug)) return json(404, { ok: false, error: 'Guide not found' });
      const govs = await getVs('vs.guides');
      if (b.reset) delete govs[slug];
      else
        govs[slug] = {
          title: String(b.title || '').slice(0, 140),
          cat: String(b.cat || '').slice(0, 40),
          excerpt: String(b.excerpt || '').slice(0, 300),
          image: String(b.image || '').slice(0, 300),
          body: String(b.body || '').slice(0, 60000),
          published: b.published !== false,
          updatedAt: new Date().toISOString(),
        };
      await saveVs('vs.guides', govs);
      return json(200, { ok: true });
    }
    case 'blog': {
      let posts = await getVs('vs.blog');
      if (b.delete) {
        posts = posts.filter((x) => x.slug !== b.delete);
        await saveVs('vs.blog', posts);
        return json(200, { ok: true, posts });
      }
      if (!b.title) return json(400, { ok: false, error: 'Title required' });
      const slug = slugify(b.slug || b.title);
      const old = posts.find((x) => x.slug === slug);
      const post: VsBlogPost = {
        slug,
        title: String(b.title).slice(0, 140),
        cat: String(b.cat || 'News').slice(0, 40),
        excerpt: String(b.excerpt || '').slice(0, 300),
        body: String(b.body || '').slice(0, 30000),
        image: String(b.image || '').slice(0, 300),
        date: old?.date || new Date().toISOString().slice(0, 10),
        published: b.published !== false,
      };
      const i = posts.findIndex((x) => x.slug === slug);
      if (i >= 0) posts[i] = post;
      else posts.unshift(post);
      await saveVs('vs.blog', posts);
      return json(200, { ok: true, slug, posts });
    }
    case 'reviews': {
      const list = await getVs('vs.reviews');
      if (typeof b.remove === 'number') list.splice(b.remove, 1);
      else if (typeof b.toggle === 'number' && list[b.toggle]) list[b.toggle].visible = !list[b.toggle].visible;
      else {
        if (!b.name || !b.text) return json(400, { ok: false, error: 'Name and review text required' });
        const r: VsReview = {
          name: String(b.name).slice(0, 60),
          country: String(b.country || '').slice(0, 60),
          visa: String(b.visa || '').slice(0, 40),
          rating: Math.max(1, Math.min(5, parseInt(b.rating, 10) || 5)),
          text: String(b.text).slice(0, 600),
          date: new Date().toISOString().slice(0, 10),
          visible: b.visible !== false,
        };
        if (typeof b.index === 'number' && list[b.index]) list[b.index] = { ...r, date: list[b.index].date };
        else list.unshift(r);
      }
      await saveVs('vs.reviews', list);
      return json(200, { ok: true, reviews: list });
    }
  }
  return json(404, { ok: false });
}
