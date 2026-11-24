// visit-saudi.ae public pages: the finished HTML in site/public is served exactly as the old server did —
// same translation by text map (19 languages), same edits, same guide overrides — so every page stays byte-identical.
// Only addition: the optional styling from Admin → Page styling, injected before </head> when the admin set something.
import fs from 'fs';
import path from 'path';
import { htmlToRich, richToHtml } from './rich';
import { buildHtmlPage, buildPost, buildSimplePage, emptyExtra, injectPostCards, setHead, sitemapXml, type SiteExtra } from './pages';

export const SITE_ROOT = path.join(process.cwd(), 'site', 'public');
export const I18N_DIR = path.join(process.cwd(), 'site', 'i18n');
export const LANG_LIST = ['ar', 'ru', 'de', 'es', 'fr', 'tr', 'zh', 'ur', 'hi', 'it', 'ro', 'pt', 'pl', 'hu', 'hr', 'sk', 'cs', 'id'];
export const LANG_RE = new RegExp('^\\/(' + LANG_LIST.join('|') + ')(\\/(.*))?$');
const RTL: Record<string, 1> = { ar: 1, ur: 1 };
export const NOT_FOUND_HTML = "<h1 style='font-family:sans-serif'>Page not found</h1><p><a href='/'>Visit Saudi - home</a></p>";

export type Edits = Record<string, Record<string, string>>; // lang -> source text -> replacement
export type GuideOverride = {
  title?: string;
  cat?: string;
  excerpt?: string;
  image?: string;
  body?: string;
  published?: boolean;
  updatedAt?: string;
  /** translations of the changed guide (language -> fields) */
  tr?: Record<string, { title?: string; cat?: string; excerpt?: string; body?: string; manual?: boolean; at?: string }>;
};
export type Styling = { css: string; pages: Record<string, string> }; // css for every page, extra css per clean path

const mapCache: Record<string, { mtime: number; map: Record<string, string> }> = {};
export function loadLangMap(lang: string): Record<string, string> {
  const fp = path.join(I18N_DIR, lang + '.json');
  try {
    const st = fs.statSync(fp);
    const c = mapCache[lang];
    if (c && c.mtime === st.mtimeMs) return c.map;
    const map = JSON.parse(fs.readFileSync(fp, 'utf8'));
    mapCache[lang] = { mtime: st.mtimeMs, map };
    return map;
  } catch {
    return {};
  }
}

export { escAttr, escText, decEnt } from './esc';
import { escAttr, escText, decEnt } from './esc';

const TOKEN_RE = /(<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/g;

export function translateHtml(html: string, lang: string, cleanPath: string, edits: Record<string, string>) {
  const map = Object.assign({}, loadLangMap(lang) || {}, edits || {});
  if (!Object.keys(map).length) return html;
  const tokens = html.split(TOKEN_RE);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok[0] === '<') {
      if (/^<(script|style)/i.test(tok)) continue;
      if (/^<html/i.test(tok)) {
        tokens[i] = tok.replace('<html lang="en">', '<html lang="' + lang + '"' + (RTL[lang] ? ' dir="rtl"' : '') + '>');
        continue;
      }
      tokens[i] = tok.replace(/\b(alt|title|placeholder|content)="([^"]*)"/g, (m, a, v) => {
        const tr = map[v] || map[decEnt(v)];
        return tr ? a + '="' + escAttr(tr) + '"' : m;
      });
    } else {
      const core = tok.trim();
      if (core) {
        const tr = map[core] || map[decEnt(core)];
        if (tr) tokens[i] = tok.replace(core, escText(tr));
      }
    }
  }
  let out = tokens.join('');
  const base = cleanPath === '/' ? '' : cleanPath;
  const alts = ['<link rel="alternate" hreflang="x-default" href="' + (base || '/') + '">', '<link rel="alternate" hreflang="en" href="' + (base || '/') + '">']
    .concat(LANG_LIST.map((l) => '<link rel="alternate" hreflang="' + l + '" href="/' + l + base + '">'))
    .join('');
  out = out.replace('</head>', alts + '</head>');
  return out;
}

export function applyEditsEn(html: string, ed: Record<string, string>) {
  if (!ed || !Object.keys(ed).length) return html;
  const tokens = html.split(TOKEN_RE);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok || tok[0] === '<') continue;
    const core = tok.trim();
    if (core && ed[core]) tokens[i] = tok.replace(core, escText(ed[core]));
  }
  return tokens.join('');
}

/* ---------- guides (WordPress-style edits of the built-in guides) ---------- */
export function guideZone(html: string) {
  const a = html.indexOf('<h2 id="sec-');
  if (a < 0) return null;
  const b = html.indexOf('<div class="authorcard">', a);
  if (b < 0) return null;
  return { a, b };
}
/** the guide's article text in the editor format (sections, lists, pictures, FAQ) */
export function zoneToText(zone: string) {
  return htmlToRich(zone);
}
/** editor text back to the guide's HTML */
export function textToZone(text: string) {
  return richToHtml(text);
}
/** the override fields in one language (the English change when that language has no translation yet) */
export function guideIn(ov: GuideOverride, lang: string | null): GuideOverride {
  const t = lang ? ov.tr?.[lang] : undefined;
  if (!t) return ov;
  return { ...ov, title: t.title || ov.title, cat: t.cat || ov.cat, excerpt: t.excerpt || ov.excerpt, body: t.body || ov.body };
}
export function applyGuideOverride(html: string, ov: GuideOverride) {
  if (ov.title) {
    html = html.replace(/<title>([\s\S]*?)<\/title>/, (mm, t1: string) => {
      const i = t1.indexOf(' |');
      return '<title>' + escText(ov.title!) + (i >= 0 ? t1.slice(i) : '') + '</title>';
    });
    html = html.replace(/(<h1[^>]*>)[\s\S]*?(<\/h1>)/, (mm, o, c) => o + escText(ov.title!) + c);
  }
  if (ov.excerpt) html = html.replace(/(<meta name="description" content=")[^"]*(")/, (mm, a, b) => a + escAttr(ov.excerpt!) + b);
  if (ov.body) {
    const z = guideZone(html);
    if (z) html = html.slice(0, z.a) + textToZone(ov.body) + '\n' + html.slice(z.b);
  }
  return html;
}
export function applyIndexOverrides(html: string, govs: Record<string, GuideOverride>) {
  return html.replace(/<article class="post[^"]*"[^>]*>[\s\S]*?<\/article>/g, (card) => {
    const m = card.match(/href="\/guides\/([a-z0-9-]+)"/);
    if (!m) return card;
    const ov = govs[m[1]];
    if (!ov) return card;
    if (ov.published === false) return '';
    let out = card;
    if (ov.title) out = out.replace(/(<h3><a[^>]*>)[\s\S]*?(<\/a><\/h3>)/, (mm, a, b) => a + escText(ov.title!) + b);
    if (ov.excerpt) out = out.replace(/(<\/h3>\s*<p>)[\s\S]*?(<\/p>)/, (mm, a, b) => a + escText(ov.excerpt!) + b);
    if (ov.image) out = out.replace(/(<img[^>]*src=")[^"]*(")/, (mm, a, b) => a + escAttr(ov.image!) + b);
    if (ov.cat) {
      out = out.replace(/data-cat="[^"]*"/, 'data-cat="' + escAttr(ov.cat) + '"');
      out = out.replace(/(<span class="pill">)[\s\S]*?(<\/span>)/, (mm, a, b) => a + escText(ov.cat!) + b);
    }
    if (ov.title || ov.excerpt || ov.cat) {
      const q = ((ov.title || '') + ' ' + (ov.excerpt || '') + ' ' + (ov.cat || '')).toLowerCase();
      out = out.replace(/data-q="[^"]*"/, 'data-q="' + escAttr(q) + '"');
    }
    return out;
  });
}
export function listBuiltGuides() {
  const gdir = path.join(SITE_ROOT, 'guides');
  let files: string[] = [];
  try {
    files = fs.readdirSync(gdir).filter((f) => f.endsWith('.html'));
  } catch {
    /* none */
  }
  let indexHtml = '';
  try {
    indexHtml = fs.readFileSync(path.join(SITE_ROOT, 'guides.html'), 'utf8');
  } catch {
    /* none */
  }
  const cards: Record<string, { cat: string; image: string }> = {};
  indexHtml.replace(/<article class="post[^"]*"[^>]*>[\s\S]*?<\/article>/g, (card) => {
    const m = card.match(/href="\/guides\/([a-z0-9-]+)"/);
    if (m) {
      const cm = card.match(/data-cat="([^"]*)"/);
      const im = card.match(/<img[^>]*src="([^"]*)"/);
      cards[m[1]] = { cat: cm ? decEnt(cm[1]) : '', image: im ? im[1] : '' };
    }
    return card;
  });
  return files.map((f) => {
    const slug = f.slice(0, -5);
    let title = slug;
    let excerpt = '';
    try {
      const h = fs.readFileSync(path.join(gdir, f), 'utf8');
      const hm = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
      if (hm) title = decEnt(hm[1].replace(/<[^>]+>/g, '')).trim();
      const dm = h.match(/<meta name="description" content="([^"]*)"/);
      if (dm) excerpt = decEnt(dm[1]);
    } catch {
      /* unreadable */
    }
    return { slug, title, excerpt, cat: (cards[slug] || {}).cat || '', image: (cards[slug] || {}).image || '' };
  });
}

/** Adds the admin's page styling (if any) just before </head>; without styling the page is untouched */
export function applyStyling(html: string, cleanPath: string, s?: Styling | null) {
  if (!s) return html;
  const css = [s.css || '', (s.pages || {})[cleanPath] || ''].map((x) => x.trim()).filter(Boolean).join('\n');
  if (!css) return html;
  const safe = css.replace(/<\/style/gi, '<\\/style');
  return html.replace('</head>', '<style id="vs-styling">' + safe + '</style></head>');
}

export type PageResult =
  | { kind: 'html'; status: number; body: string; mime?: string }
  | { kind: 'redirect'; status: number; location: string }
  | { kind: 'file'; status: number; path: string; mime: string; cache: string };

export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon', '.json': 'application/json',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

export type RenderSources = {
  edits: (lang: string) => Promise<Record<string, string>>;
  guides: () => Promise<Record<string, GuideOverride>>;
  styling: () => Promise<Styling | null>;
  /** pages and posts added or changed in the admin */
  extra?: () => Promise<SiteExtra>;
};

/** Resolves a request path exactly like the old server.js (language prefix, /blog → /guides, .html → clean URL, 404) */
export async function renderPage(pathname: string, search: string, src: RenderSources): Promise<PageResult> {
  let p = pathname;
  let reqLang: string | null = null;
  const lm = p.match(LANG_RE);
  if (lm) {
    reqLang = lm[1];
    p = '/' + (lm[3] || '');
  }
  if (p === '/blog' || p === '/blog/' || p.startsWith('/blog/')) {
    return { kind: 'redirect', status: 301, location: (reqLang ? '/' + reqLang : '') + '/guides' + p.slice(5) + (search || '') };
  }
  if (p.endsWith('.html')) {
    let clean = p.slice(0, -5);
    if (clean === '/index') clean = '/';
    else if (clean.endsWith('/index')) clean = clean.slice(0, -5);
    return { kind: 'redirect', status: 301, location: (reqLang ? '/' + reqLang : '') + clean + (search || '') };
  }
  const ex: SiteExtra = src.extra ? await src.extra() : { pages: [], posts: [], meta: {}, html: {} };
  const changed = !emptyExtra(ex);
  // old links of news posts (/blog-post?slug=...) open the post
  if (p === '/blog-post' && changed) {
    const slug = new URLSearchParams(search || '').get('slug') || '';
    if (ex.posts.some((x) => x.slug === slug && x.published)) return { kind: 'redirect', status: 301, location: (reqLang ? '/' + reqLang : '') + '/guides/' + slug };
  }
  if (changed && ex.meta[p]?.hidden) return { kind: 'html', status: 404, body: NOT_FOUND_HTML };
  const govs = await src.guides();
  if (p === '/sitemap.xml' && (changed || Object.values(govs).some((g) => g.published === false))) {
    const xml = sitemapXml(fs.readFileSync(path.join(SITE_ROOT, 'sitemap.xml'), 'utf8'), ex, Object.keys(govs).filter((k) => govs[k].published === false));
    return { kind: 'html', status: 200, body: xml, mime: 'application/xml' };
  }
  // a page or post made in the admin
  let html: string | null = null;
  let own = false; // texts already in the visitor's language
  if (changed) {
    const cp = ex.pages.find((x) => '/' + x.slug === p && x.published);
    const gm = p.match(/^\/guides\/([a-z0-9-]+)$/);
    const post = gm ? ex.posts.find((x) => x.slug === gm[1] && x.published) : undefined;
    if (cp) {
      html = cp.mode === 'html' ? buildHtmlPage(cp) : buildSimplePage(cp, reqLang);
      own = cp.mode !== 'html';
    } else if (post) {
      html = buildPost(post, reqLang);
      own = true;
    } else if (ex.html[p]) html = ex.html[p];
  }
  if (html === null) {
    let rel = p === '/' ? '/index.html' : p;
    if (rel === '/admin.html' || rel === '/admin') return { kind: 'html', status: 404, body: NOT_FOUND_HTML };
    if (!path.extname(rel)) rel = rel + '.html';
    let fp: string;
    try {
      fp = path.join(SITE_ROOT, decodeURIComponent(rel));
    } catch {
      return { kind: 'html', status: 404, body: NOT_FOUND_HTML };
    }
    if (!fp.startsWith(SITE_ROOT + path.sep) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory() || fp.endsWith('admin.html')) {
      return { kind: 'html', status: 404, body: NOT_FOUND_HTML };
    }
    if (!fp.endsWith('.html')) {
      return { kind: 'file', status: 200, path: fp, mime: MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', cache: 'public, max-age=86400' };
    }
    html = fs.readFileSync(fp, 'utf8');
  }
  const styling = await src.styling();
  let page: string = html as string;
  if (Object.keys(govs).length) {
    const gm = p.match(/^\/guides\/([a-z0-9-]+)$/);
    if (gm && govs[gm[1]] && !own) {
      if (govs[gm[1]].published === false) return { kind: 'html', status: 404, body: NOT_FOUND_HTML };
      page = applyGuideOverride(page, guideIn(govs[gm[1]], reqLang));
    } else if (p === '/guides') {
      const tr: Record<string, GuideOverride> = {};
      for (const k of Object.keys(govs)) tr[k] = guideIn(govs[k], reqLang);
      page = applyIndexOverrides(page, tr);
    }
  }
  if (changed) {
    if (p === '/guides') page = injectPostCards(page, ex.posts.filter((x) => x.published), reqLang);
    const m = ex.meta[p];
    if (m && (m.title || m.description)) page = setHead(page, { title: m.title || undefined, description: m.description || undefined });
  }
  if (reqLang) page = translateHtml(page, reqLang, p, await src.edits(reqLang));
  else page = applyEditsEn(page, await src.edits('en'));
  return { kind: 'html', status: 200, body: applyStyling(page, p, styling) };
}
