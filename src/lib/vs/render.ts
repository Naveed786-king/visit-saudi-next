// visit-saudi.ae public pages: the finished HTML in site/public is served exactly as the old server did —
// same translation by text map (19 languages), same edits, same guide overrides — so every page stays byte-identical.
// Only addition: the optional styling from Admin → Page styling, injected before </head> when the admin set something.
import fs from 'fs';
import path from 'path';

export const SITE_ROOT = path.join(process.cwd(), 'site', 'public');
export const I18N_DIR = path.join(process.cwd(), 'site', 'i18n');
export const LANG_LIST = ['ar', 'ru', 'de', 'es', 'fr', 'tr', 'zh', 'ur', 'hi', 'it', 'ro', 'pt', 'pl', 'hu', 'hr', 'sk', 'cs', 'id'];
export const LANG_RE = new RegExp('^\\/(' + LANG_LIST.join('|') + ')(\\/(.*))?$');
const RTL: Record<string, 1> = { ar: 1, ur: 1 };
export const NOT_FOUND_HTML = "<h1 style='font-family:sans-serif'>Page not found</h1><p><a href='/'>Visit Saudi - home</a></p>";

export type Edits = Record<string, Record<string, string>>; // lang -> source text -> replacement
export type GuideOverride = { title?: string; cat?: string; excerpt?: string; image?: string; body?: string; published?: boolean; updatedAt?: string };
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

export function escAttr(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
export function escText(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", copy: '©', nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', mdash: '—', ndash: '–' };
export function decEnt(s: string) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|copy|nbsp|rsquo|lsquo|ldquo|rdquo|hellip|mdash|ndash);/g, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return isNaN(n) ? m : String.fromCodePoint(n);
    }
    return ENT[e] || m;
  });
}

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
export function zoneToText(zone: string) {
  const out: string[] = [];
  const re = /<(h2|h3|p|li)[^>]*>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(zone))) {
    const t = decEnt(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (!t) continue;
    out.push(m[1] === 'h2' ? '## ' + t : m[1] === 'h3' ? '### ' + t : t);
  }
  return out.join('\n\n');
}
export function textToZone(text: string) {
  let sec = 0;
  return String(text || '')
    .split(/\n\s*\n/)
    .map((block) => {
      const t = block.trim();
      if (!t) return '';
      if (t.indexOf('## ') === 0) return '<h2 id="sec-' + sec++ + '">' + escText(t.slice(3)) + '</h2>';
      if (t.indexOf('### ') === 0) return '<h3>' + escText(t.slice(4)) + '</h3>';
      return '<p>' + escText(t).replace(/\n/g, '<br>') + '</p>';
    })
    .filter(Boolean)
    .join('\n');
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
  | { kind: 'html'; status: number; body: string }
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
  const styling = await src.styling();
  let html = fs.readFileSync(fp, 'utf8');
  const govs = await src.guides();
  if (Object.keys(govs).length) {
    const gm = p.match(/^\/guides\/([a-z0-9-]+)$/);
    if (gm && govs[gm[1]]) {
      if (govs[gm[1]].published === false) return { kind: 'html', status: 404, body: NOT_FOUND_HTML };
      html = applyGuideOverride(html, govs[gm[1]]);
    } else if (p === '/guides') {
      html = applyIndexOverrides(html, govs);
    }
  }
  if (reqLang) html = translateHtml(html, reqLang, p, await src.edits(reqLang));
  else html = applyEditsEn(html, await src.edits('en'));
  return { kind: 'html', status: 200, body: applyStyling(html, p, styling) };
}
