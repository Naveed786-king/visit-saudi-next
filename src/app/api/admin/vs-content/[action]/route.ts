// Admin API: website pages (add / edit / hide / delete / HTML), posts and guides (add / edit / delete),
// and translation of everything into the 18 other languages.
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth';
import { json, readJson } from '@/lib/vs/http';
import { getVs, saveVs, type VsPage, type VsPost, type VsTr } from '@/lib/vs/store';
import { LANG_LIST, SITE_ROOT, guideZone, listBuiltGuides, zoneToText, decEnt } from '@/lib/vs/render';
import { buildPost, buildSimplePage, pageTexts } from '@/lib/vs/pages';
import { engineProblem, ensureStrings, followEnglishChange, siteTexts, translateFields, translationOf } from '@/lib/vs/translate';
import { translationConfig } from '@/lib/i18n/translate';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const LANGS = ['en', ...LANG_LIST];
const slugify = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
// addresses a new page may not take
const RESERVED = new Set(['admin', 'api', 'portal', 'uploads', 'media', 'i18n', 'assets', 'pay', 'login', 'register', 'forgot', 'forgot-password', 'reset-password', 'account', 't', 'blog', 'blog-post', 'sitemap', 'robots', 'manage-jg0ojxafgt', 'index', ...LANG_LIST]);

function sitePaths() {
  try {
    const sm = fs.readFileSync(path.join(SITE_ROOT, 'sitemap.xml'), 'utf8');
    return [...sm.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
  } catch {
    return ['/'];
  }
}
const fileOf = (p: string) => path.join(SITE_ROOT, p === '/' ? 'index.html' : p.slice(1) + '.html');
function builtExists(p: string) {
  const fp = fileOf(p);
  return fp.startsWith(SITE_ROOT + path.sep) && fs.existsSync(fp);
}
function readBuilt(p: string) {
  try {
    return fs.readFileSync(fileOf(p), 'utf8');
  } catch {
    return '';
  }
}
const headTitle = (h: string) => decEnt((h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
const headDesc = (h: string) => decEnt((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
const trLangs = (tr?: Record<string, VsTr>) => Object.keys(tr || {}).filter((l) => LANG_LIST.includes(l));

/** news posts of the old website move into the posts list once */
async function migrateOldNews() {
  const old = await getVs('vs.blog');
  if (!old.length) return;
  const posts = await getVs('vs.posts');
  for (const o of old) if (!posts.some((p) => p.slug === o.slug)) posts.push({ slug: o.slug, title: o.title, cat: o.cat || 'News', excerpt: o.excerpt || '', image: o.image || '', body: o.body || '', date: o.date, published: o.published !== false, tr: {} });
  await saveVs('vs.posts', posts);
  await saveVs('vs.blog', []);
}

export async function GET(req: Request, ctx: { params: Promise<{ action: string }> }) {
  if (!(await requireAdmin())) return json(401, { error: 'Unauthorized' });
  const { action } = await ctx.params;
  const url = new URL(req.url);
  switch (action) {
    case 'engine': {
      const cfg: any = await translationConfig();
      return json(200, { ok: true, provider: cfg.provider, problem: await engineProblem(), langs: LANG_LIST });
    }
    case 'pages': {
      const [meta, html, pages, st] = await Promise.all([getVs('vs.pageMeta'), getVs('vs.html'), getVs('vs.pages'), getVs('vs.styling')]);
      const built = sitePaths()
        .filter((p) => !p.startsWith('/guides/'))
        .map((p) => {
          const h = readBuilt(p);
          return { path: p, title: headTitle(h).split(' | ')[0] || p, hidden: !!meta[p]?.hidden, seo: !!(meta[p]?.title || meta[p]?.description), html: !!html[p], styled: !!(st.pages || {})[p]?.trim() };
        });
      return json(200, {
        ok: true,
        built,
        custom: pages.map((p) => ({ slug: p.slug, path: '/' + p.slug, title: p.title, mode: p.mode, published: p.published, langs: trLangs(p.tr).length, updatedAt: p.updatedAt })),
      });
    }
    case 'page': {
      const p = String(url.searchParams.get('path') || '');
      const pages = await getVs('vs.pages');
      const custom = pages.find((x) => '/' + x.slug === p);
      if (custom) return json(200, { ok: true, kind: 'custom', page: custom });
      if (!builtExists(p)) return json(404, { ok: false, error: 'Page not found' });
      const [meta, htmlOv, content] = await Promise.all([getVs('vs.pageMeta'), getVs('vs.html'), getVs('vs.content')]);
      const h = htmlOv[p] || readBuilt(p);
      const texts = pageTexts(h).map((src) => ({
        src,
        en: content.en?.[src] ?? decEnt(src),
        changed: content.en?.[src] !== undefined,
        done: LANG_LIST.filter((l) => translationOf(src, l, content[l] || {})).length,
        pages: (siteTexts().get(src) || []).length,
      }));
      const orig = readBuilt(p);
      return json(200, { ok: true, kind: 'built', path: p, title: headTitle(orig), description: headDesc(orig), meta: meta[p] || {}, html: !!htmlOv[p], texts });
    }
    case 'page-html': {
      const p = String(url.searchParams.get('path') || '');
      const pages = await getVs('vs.pages');
      const custom = pages.find((x) => '/' + x.slug === p);
      if (custom) return json(200, { ok: true, html: custom.mode === 'html' ? custom.html || '' : buildSimplePage(custom, null), changed: true });
      const ov = (await getVs('vs.html'))[p];
      if (!ov && !builtExists(p)) return json(404, { ok: false });
      return json(200, { ok: true, html: ov || readBuilt(p), changed: !!ov });
    }
    case 'posts': {
      await migrateOldNews();
      const [govs, posts] = await Promise.all([getVs('vs.guides'), getVs('vs.posts')]);
      const guides = listBuiltGuides().map((g) => {
        const ov = govs[g.slug];
        return { kind: 'guide', slug: g.slug, title: ov?.title || g.title, cat: ov?.cat || g.cat, excerpt: ov?.excerpt || g.excerpt, image: ov?.image || g.image, edited: !!ov, published: ov?.published !== false, langs: ov ? trLangs(ov.tr).length : LANG_LIST.length };
      });
      const own = posts.map((p) => ({ kind: 'post', slug: p.slug, title: p.title, cat: p.cat, excerpt: p.excerpt, image: p.image, edited: false, published: p.published, date: p.date, langs: trLangs(p.tr).length }));
      const cats = Array.from(new Set([...guides.map((g) => g.cat), ...own.map((p) => p.cat)].filter(Boolean))).sort();
      return json(200, { ok: true, posts: [...own, ...guides], cats });
    }
    case 'post': {
      const slug = String(url.searchParams.get('slug') || '');
      const kind = url.searchParams.get('kind');
      if (kind === 'guide') {
        const g = listBuiltGuides().find((x) => x.slug === slug);
        if (!g) return json(404, { ok: false });
        const ov = (await getVs('vs.guides'))[slug];
        let body = ov?.body || '';
        if (!body) {
          const h = readBuilt('/guides/' + slug);
          const z = guideZone(h);
          body = z ? zoneToText(h.slice(z.a, z.b)) : '';
        }
        return json(200, { ok: true, post: { kind: 'guide', slug, title: ov?.title || g.title, cat: ov?.cat || g.cat, excerpt: ov?.excerpt || g.excerpt, image: ov?.image || g.image, body, published: ov?.published !== false, edited: !!ov, tr: ov?.tr || {} } });
      }
      const p = (await getVs('vs.posts')).find((x) => x.slug === slug);
      return p ? json(200, { ok: true, post: { kind: 'post', ...p } }) : json(404, { ok: false });
    }
    case 'texts': {
      const lang = LANGS.includes(url.searchParams.get('lang') || '') ? (url.searchParams.get('lang') as string) : 'ar';
      const q = String(url.searchParams.get('q') || '').toLowerCase();
      const page = String(url.searchParams.get('page') || '');
      const only = String(url.searchParams.get('only') || ''); // missing | changed
      const content = await getVs('vs.content');
      const ed = content[lang] || {};
      const texts = siteTexts();
      let keys: string[];
      if (page) {
        const pages = await getVs('vs.pages');
        const cp = pages.find((x) => '/' + x.slug === page);
        const ov = (await getVs('vs.html'))[page];
        keys = cp?.mode === 'html' ? pageTexts(cp.html || '') : ov ? pageTexts(ov) : pageTexts(readBuilt(page));
      } else keys = Array.from(new Set([...texts.keys(), ...Object.keys(ed)]));
      const val = (k: string) => (lang === 'en' ? content.en?.[k] ?? '' : translationOf(k, lang, ed));
      let hits = keys.filter((k) => !q || k.toLowerCase().includes(q) || val(k).toLowerCase().includes(q) || (content.en?.[k] || '').toLowerCase().includes(q));
      if (only === 'missing' && lang !== 'en') hits = hits.filter((k) => !val(k));
      if (only === 'changed') hits = hits.filter((k) => ed[k] !== undefined);
      const missing = lang === 'en' ? 0 : keys.filter((k) => !translationOf(k, lang, ed)).length;
      return json(200, {
        ok: true,
        lang,
        total: keys.length,
        matches: hits.length,
        missing,
        changed: Object.keys(ed).length,
        strings: hits.slice(0, 100).map((k) => ({ src: k, en: content.en?.[k] ?? decEnt(k), value: lang === 'en' ? content.en?.[k] ?? decEnt(k) : val(k), changed: ed[k] !== undefined, pages: (texts.get(k) || []).length })),
      });
    }
    case 'text': {
      // one text in every language
      const src = String(url.searchParams.get('src') || '');
      const content = await getVs('vs.content');
      return json(200, { ok: true, src, values: Object.fromEntries(LANGS.map((l) => [l, l === 'en' ? content.en?.[src] ?? decEnt(src) : translationOf(src, l, content[l] || {})])), changed: LANGS.filter((l) => content[l]?.[src] !== undefined) });
    }
  }
  return json(404, { ok: false });
}

function cleanTr(tr: any): Record<string, VsTr> {
  const out: Record<string, VsTr> = {};
  if (!tr || typeof tr !== 'object') return out;
  for (const l of LANG_LIST) {
    const t = tr[l];
    if (!t || typeof t !== 'object') continue;
    const x: VsTr = {};
    for (const k of ['title', 'subtitle', 'crumb', 'cat', 'excerpt', 'description'] as const) if (t[k]) x[k] = String(t[k]).slice(0, 400);
    if (t.body) x.body = String(t.body).slice(0, 80000);
    if (t.manual) x.manual = true;
    if (t.at) x.at = String(t.at).slice(0, 40);
    if (Object.keys(x).length) out[l] = x;
  }
  return out;
}

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  if (!(await requireAdmin())) return json(401, { error: 'Unauthorized' });
  const { action } = await ctx.params;
  const b = await readJson(req);
  switch (action) {
    /* ---------- pages made in the admin ---------- */
    case 'page': {
      const pages = await getVs('vs.pages');
      const oldSlug = String(b.oldSlug || '');
      const slug = slugify(b.slug || b.title);
      if (!slug) return json(400, { ok: false, error: 'Give the page a title or address' });
      if (RESERVED.has(slug) || builtExists('/' + slug) || pages.some((x) => x.slug === slug && x.slug !== oldSlug)) return json(400, { ok: false, error: `The address /${slug} is already used - choose another one` });
      if (!b.title || !String(b.title).trim()) return json(400, { ok: false, error: 'Title required' });
      const prev = pages.find((x) => x.slug === (oldSlug || slug));
      const mode = (prev?.mode || b.mode) === 'html' ? 'html' : 'simple';
      const page: VsPage = {
        slug,
        mode,
        title: String(b.title).slice(0, 160),
        subtitle: String(b.subtitle || '').slice(0, 300),
        crumb: String(b.crumb || '').slice(0, 60),
        description: String(b.description || '').slice(0, 320),
        image: String(b.image || '').slice(0, 400),
        body: String(b.body || '').slice(0, 80000),
        html: mode === 'html' ? String(b.html ?? prev?.html ?? '').slice(0, 600000) : undefined,
        published: b.published !== false,
        updatedAt: new Date().toISOString(),
        tr: cleanTr(b.tr ?? prev?.tr),
      };
      const i = pages.findIndex((x) => x.slug === (oldSlug || slug));
      if (i >= 0) pages[i] = page;
      else pages.push(page);
      await saveVs('vs.pages', pages);
      return json(200, { ok: true, page });
    }
    case 'page-copy': {
      // a new page that starts as a copy of an existing page (edited as HTML)
      const from = String(b.from || '');
      const html = (await getVs('vs.html'))[from] || readBuilt(from);
      if (!html) return json(404, { ok: false, error: 'Page to copy not found' });
      const pages = await getVs('vs.pages');
      const slug = slugify(b.slug || b.title);
      if (!slug || RESERVED.has(slug) || builtExists('/' + slug) || pages.some((x) => x.slug === slug)) return json(400, { ok: false, error: `The address /${slug || '?'} is already used - choose another one` });
      const title = String(b.title || headTitle(html).split(' | ')[0]).slice(0, 160);
      const page: VsPage = { slug, mode: 'html', title, subtitle: '', crumb: '', description: headDesc(html), image: '', body: '', html, published: false, updatedAt: new Date().toISOString(), tr: {} };
      pages.push(page);
      await saveVs('vs.pages', pages);
      return json(200, { ok: true, page });
    }
    case 'page-delete': {
      const pages = (await getVs('vs.pages')).filter((x) => x.slug !== b.slug);
      await saveVs('vs.pages', pages);
      return json(200, { ok: true });
    }
    /* ---------- the website's own pages ---------- */
    case 'page-meta': {
      const p = String(b.path || '');
      if (!builtExists(p)) return json(404, { ok: false, error: 'Page not found' });
      const meta = await getVs('vs.pageMeta');
      const m = { ...(meta[p] || {}) };
      if (b.hidden !== undefined) m.hidden = !!b.hidden;
      if (b.title !== undefined) m.title = String(b.title || '').slice(0, 200);
      if (b.description !== undefined) m.description = String(b.description || '').slice(0, 400);
      if (!m.title) delete m.title;
      if (!m.description) delete m.description;
      if (!m.hidden) delete m.hidden;
      if (Object.keys(m).length) meta[p] = m;
      else delete meta[p];
      await saveVs('vs.pageMeta', meta);
      return json(200, { ok: true, meta: meta[p] || {} });
    }
    case 'page-html': {
      const p = String(b.path || '');
      const pages = await getVs('vs.pages');
      const custom = pages.find((x) => '/' + x.slug === p);
      if (custom) {
        if (custom.mode !== 'html') return json(400, { ok: false, error: 'This page is written in the editor' });
        custom.html = String(b.html || '').slice(0, 600000);
        custom.updatedAt = new Date().toISOString();
        await saveVs('vs.pages', pages);
        return json(200, { ok: true });
      }
      if (!builtExists(p)) return json(404, { ok: false });
      const all = await getVs('vs.html');
      if (b.reset || !String(b.html || '').trim()) delete all[p];
      else {
        const h = String(b.html).slice(0, 600000);
        if (!/<\/head>/i.test(h) || !/<body/i.test(h)) return json(400, { ok: false, error: 'This does not look like a full page (it needs <head> and <body>)' });
        all[p] = h;
      }
      await saveVs('vs.html', all);
      return json(200, { ok: true });
    }
    /* ---------- posts and guides ---------- */
    case 'post': {
      if (!b.title || !String(b.title).trim()) return json(400, { ok: false, error: 'Title required' });
      const guideSlugs = new Set(listBuiltGuides().map((g) => g.slug));
      if (b.kind === 'guide') {
        const slug = String(b.slug || '');
        if (!guideSlugs.has(slug)) return json(404, { ok: false, error: 'Guide not found' });
        const govs = await getVs('vs.guides');
        govs[slug] = {
          title: String(b.title).slice(0, 160),
          cat: String(b.cat || '').slice(0, 40),
          excerpt: String(b.excerpt || '').slice(0, 400),
          image: String(b.image || '').slice(0, 400),
          body: String(b.body || '').slice(0, 80000),
          published: b.published !== false,
          updatedAt: new Date().toISOString(),
          tr: cleanTr(b.tr ?? govs[slug]?.tr) as any,
        };
        await saveVs('vs.guides', govs);
        return json(200, { ok: true, slug });
      }
      const posts = await getVs('vs.posts');
      const oldSlug = String(b.oldSlug || '');
      const slug = slugify(b.slug || b.title);
      if (!slug) return json(400, { ok: false, error: 'Give the post a title' });
      if (guideSlugs.has(slug) || posts.some((x) => x.slug === slug && x.slug !== oldSlug)) return json(400, { ok: false, error: `The address /guides/${slug} is already used - change the address` });
      const prev = posts.find((x) => x.slug === (oldSlug || slug));
      const post: VsPost = {
        slug,
        title: String(b.title).slice(0, 160),
        cat: String(b.cat || 'News').slice(0, 40),
        excerpt: String(b.excerpt || '').slice(0, 400),
        image: String(b.image || '').slice(0, 400),
        body: String(b.body || '').slice(0, 80000),
        date: String(b.date || prev?.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
        published: b.published !== false,
        updatedAt: new Date().toISOString(),
        tr: cleanTr(b.tr ?? prev?.tr),
      };
      const i = posts.findIndex((x) => x.slug === (oldSlug || slug));
      if (i >= 0) posts[i] = post;
      else posts.unshift(post);
      await saveVs('vs.posts', posts);
      return json(200, { ok: true, slug });
    }
    case 'post-delete': {
      if (b.kind === 'guide') {
        // a built-in guide cannot be removed from the files: it is hidden (and can come back)
        const govs = await getVs('vs.guides');
        const g = listBuiltGuides().find((x) => x.slug === b.slug);
        if (!g) return json(404, { ok: false });
        govs[b.slug] = { ...(govs[b.slug] || {}), published: false, updatedAt: new Date().toISOString() };
        await saveVs('vs.guides', govs);
        return json(200, { ok: true, hidden: true });
      }
      await saveVs('vs.posts', (await getVs('vs.posts')).filter((x) => x.slug !== b.slug));
      return json(200, { ok: true });
    }
    case 'post-visibility': {
      const show = b.published !== false;
      if (b.kind === 'guide') {
        const govs = await getVs('vs.guides');
        if (!listBuiltGuides().some((x) => x.slug === b.slug)) return json(404, { ok: false });
        const cur = { ...(govs[b.slug] || {}) };
        cur.published = show;
        // only the switch was stored: showing again = the original guide
        const onlySwitch = !cur.title && !cur.body && !cur.excerpt && !cur.cat && !cur.image;
        if (show && onlySwitch) delete govs[b.slug];
        else govs[b.slug] = { ...cur, updatedAt: new Date().toISOString() };
        await saveVs('vs.guides', govs);
        return json(200, { ok: true });
      }
      const posts = await getVs('vs.posts');
      const p = posts.find((x) => x.slug === b.slug);
      if (!p) return json(404, { ok: false });
      p.published = show;
      await saveVs('vs.posts', posts);
      return json(200, { ok: true });
    }
    case 'guide-reset': {
      const govs = await getVs('vs.guides');
      delete govs[String(b.slug || '')];
      await saveVs('vs.guides', govs);
      return json(200, { ok: true });
    }
    case 'preview': {
      // the page as it will look, before saving
      const lang = LANG_LIST.includes(b.lang) ? b.lang : null;
      if (b.type === 'page') {
        const page: VsPage = { slug: slugify(b.slug || b.title) || 'preview', mode: 'simple', title: String(b.title || ''), subtitle: String(b.subtitle || ''), crumb: String(b.crumb || ''), description: String(b.description || ''), image: String(b.image || ''), body: String(b.body || ''), published: true, tr: cleanTr(b.tr) };
        return json(200, { ok: true, html: buildSimplePage(page, lang) });
      }
      const post: VsPost = { slug: slugify(b.slug || b.title) || 'preview', title: String(b.title || ''), cat: String(b.cat || 'News'), excerpt: String(b.excerpt || ''), image: String(b.image || ''), body: String(b.body || ''), date: new Date().toISOString().slice(0, 10), published: true, tr: cleanTr(b.tr) };
      return json(200, { ok: true, html: buildPost(post, lang) });
    }
    /* ---------- translation ---------- */
    case 'translate': {
      // one item into one language (the admin screen goes through the languages one by one and shows progress)
      const lang = String(b.lang || '');
      if (!LANG_LIST.includes(lang)) return json(400, { ok: false, error: 'Unknown language' });
      const force = !!b.force; // true or 'all'
      try {
        if (b.kind === 'fields') {
          // texts of an unsaved page or post (the editor fills its language tabs)
          return json(200, { ok: true, tr: await translateFields(b.fields || {}, lang) });
        }
        if (b.kind === 'post' || b.kind === 'guide' || b.kind === 'page') {
          const store = b.kind === 'post' ? await getVs('vs.posts') : b.kind === 'page' ? await getVs('vs.pages') : null;
          const govs = b.kind === 'guide' ? await getVs('vs.guides') : null;
          const item: any = store ? (store as any[]).find((x) => x.slug === b.slug) : govs![b.slug];
          if (!item) return json(404, { ok: false, error: 'Not found' });
          item.tr = item.tr || {};
          // force: translate again (English changed); force "all": also languages changed by hand
          if (item.tr[lang]?.manual && b.force !== 'all') return json(200, { ok: true, skipped: 'changed by hand' });
          if (item.tr[lang]?.at && !force) return json(200, { ok: true, skipped: 'already translated' });
          if (b.kind === 'page' && item.mode === 'html') {
            await ensureStrings(pageTexts(item.html || ''), lang, force);
            return json(200, { ok: true });
          }
          item.tr[lang] = await translateFields(item, lang);
          if (store) await saveVs(b.kind === 'post' ? 'vs.posts' : 'vs.pages', store as any);
          else await saveVs('vs.guides', govs!);
          return json(200, { ok: true });
        }
        if (b.kind === 'built') {
          // a website page: its new title / description and the texts of a changed HTML
          const p = String(b.path || '');
          const [meta, htmlOv] = await Promise.all([getVs('vs.pageMeta'), getVs('vs.html')]);
          const strings = [meta[p]?.title || '', meta[p]?.description || '', ...(htmlOv[p] ? pageTexts(htmlOv[p]) : [])].filter(Boolean);
          const n = await ensureStrings(strings, lang, force);
          return json(200, { ok: true, translated: n });
        }
        if (b.kind === 'text') {
          // an English text changed in the admin: the language follows the new English
          const done = await followEnglishChange(String(b.src || ''), lang);
          return json(200, { ok: true, done });
        }
        if (b.kind === 'missing') {
          // texts of the website without a translation in this language (a part per call)
          const content = await getVs('vs.content');
          const ed = content[lang] || {};
          const keys = Array.from(siteTexts().keys()).filter((k) => !translationOf(k, lang, ed));
          const part = keys.slice(0, 60);
          if (part.length) await ensureStrings(part, lang, false);
          return json(200, { ok: true, translated: part.length, remaining: Math.max(0, keys.length - part.length) });
        }
      } catch (e) {
        return json(200, { ok: false, error: (e as Error).message });
      }
      return json(400, { ok: false, error: 'Nothing to translate' });
    }
    case 'text': {
      // one text in one or more languages: { src, values: { lang: text } } - an empty value = back to the original
      const src = String(b.src || '').slice(0, 2000);
      if (!src) return json(400, { ok: false });
      const all = await getVs('vs.content');
      const values = b.values && typeof b.values === 'object' ? b.values : {};
      for (const l of Object.keys(values)) {
        if (!LANGS.includes(l)) continue;
        all[l] = all[l] || {};
        const v = String(values[l] ?? '').slice(0, 4000);
        const orig = l === 'en' ? decEnt(src) : translationOf(src, l, {});
        if (!v.trim() || v === orig) delete all[l][src];
        else all[l][src] = v;
      }
      await saveVs('vs.content', all);
      return json(200, { ok: true });
    }
  }
  return json(404, { ok: false });
}
