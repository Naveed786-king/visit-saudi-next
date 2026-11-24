// Page builder for the website's own pages: sections (hide, show, move, copy, add, delete, edit),
// pictures (replace on one page or everywhere), the header with its menu and the footer (once for all
// pages), and site-wide replacements (a phone number, an email, a link...). Nothing changes until the admin does.
import { decEnt } from './esc';

/* ---------------------------------------------------------------- sections */
const VOID = /^(img|br|hr|input|meta|link|source|wbr)$/i;

/** the top-level elements of an HTML piece, with their positions */
export function topElements(html: string, from = 0, to = html.length) {
  const out: { a: number; b: number }[] = [];
  let i = from;
  while (i < to) {
    const lt = html.indexOf('<', i);
    if (lt < 0 || lt >= to) break;
    if (html.startsWith('<!--', lt)) {
      const e = html.indexOf('-->', lt);
      i = e < 0 ? to : e + 3;
      continue;
    }
    const m = html.slice(lt, lt + 300).match(/^<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/);
    if (!m) {
      const gt = html.indexOf('>', lt);
      i = gt < 0 ? to : gt + 1;
      continue;
    }
    const name = m[1].toLowerCase();
    const open = html.slice(lt).match(/^<[^>]*>/)![0];
    if (VOID.test(name) || open.endsWith('/>')) {
      out.push({ a: lt, b: lt + open.length });
      i = lt + open.length;
      continue;
    }
    if (name === 'script' || name === 'style' || name === 'template' || name === 'textarea') {
      const close = html.toLowerCase().indexOf('</' + name, lt + open.length);
      const end = close < 0 ? to : html.indexOf('>', close) + 1;
      out.push({ a: lt, b: end });
      i = end;
      continue;
    }
    const re = new RegExp('<(/?)' + name + '\\b[^>]*>', 'gi');
    re.lastIndex = lt + open.length;
    let depth = 1;
    let end = to;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(html))) {
      if (mm.index >= to) break;
      depth += mm[1] ? -1 : 1;
      if (!depth) {
        end = mm.index + mm[0].length;
        break;
      }
    }
    out.push({ a: lt, b: end });
    i = end;
  }
  return out;
}

/** The page body between the header and the footer, cut into its sections */
export function splitPage(html: string) {
  const he = html.indexOf('</header>');
  const fs = html.indexOf('<footer');
  const start = he >= 0 ? he + 9 : html.indexOf('>', html.indexOf('<body')) + 1;
  const end = fs >= 0 ? fs : html.lastIndexOf('</body>');
  const els = topElements(html, start, end);
  return { pre: html.slice(0, els.length ? els[0].a : start), items: els.map((e) => html.slice(e.a, e.b)), gaps: els.map((e, k) => html.slice(e.b, k + 1 < els.length ? els[k + 1].a : e.b)), post: html.slice(els.length ? els[els.length - 1].b : end) };
}
export function joinPage(p: ReturnType<typeof splitPage>) {
  return p.pre + p.items.map((x, k) => x + (p.gaps[k] ?? '\n')).join('') + p.post;
}

const HIDE_OPEN = '<template data-vs-hidden="1">';
export const isHidden = (el: string) => el.startsWith(HIDE_OPEN);
export const hideEl = (el: string) => (isHidden(el) ? el : HIDE_OPEN + el + '</template>');
export const showEl = (el: string) => (isHidden(el) ? el.slice(HIDE_OPEN.length, -'</template>'.length) : el);

const plain = (h: string) => decEnt(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/** A name for a section in the admin: its first heading, else its first words */
export function sectionLabel(el: string) {
  const inner = showEl(el);
  const h = inner.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/);
  const cls = (inner.match(/^<[a-z]+[^>]*\bclass="([^"]+)"/i) || [])[1] || '';
  const id = (inner.match(/^<[a-z]+[^>]*\bid="([^"]+)"/i) || [])[1] || '';
  const title = h ? plain(h[1]) : plain(inner).slice(0, 70);
  return { title: title || '(no text)', kind: [cls.split(' ')[0], id && '#' + id].filter(Boolean).join(' ') || (inner.match(/^<([a-z]+)/i) || [])[1] || '' };
}

/** A new section written in the editor format, in the website design */
export function textSection(innerHtml: string, sand = false) {
  return `<section${sand ? ' style="background:var(--sand)"' : ''}><div class="wrap"><div class="article">\n${innerHtml}\n</div></div></section>`;
}

/* ---------------------------------------------------------------- pictures */
export type PageImage = { src: string; alt: string; kind: 'img' | 'background'; count: number };
/** Pictures of a page (normal pictures and background pictures), the same file listed once */
export function pageImages(html: string): PageImage[] {
  const map = new Map<string, PageImage>();
  const norm = (s: string) => s.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = (m[0].match(/\bsrc="([^"]+)"/) || [])[1];
    if (!src || src.startsWith('data:')) continue;
    const alt = decEnt((m[0].match(/\balt="([^"]*)"/) || [])[1] || '');
    const k = norm(src);
    const cur = map.get(k);
    if (cur) cur.count++;
    else map.set(k, { src: k, alt, kind: 'img', count: 1 });
  }
  for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
    const src = m[2];
    if (!/\.(jpe?g|png|webp|gif|svg|avif)(\?|$)/i.test(src) || src.startsWith('data:')) continue;
    const k = norm(src);
    const cur = map.get(k);
    if (cur) cur.count++;
    else map.set(k, { src: k, alt: '', kind: 'background', count: 1 });
  }
  return Array.from(map.values());
}
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** every place a picture file is used (also as "../assets/…" or "/assets/…") */
export function imageRe(src: string) {
  const k = src.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
  return new RegExp('(?:\\.\\./)*/?' + escRe(k) + '(?=["\')?\\s])', 'g');
}
export function replaceImage(html: string, from: string, to: string, alt?: string) {
  const re = imageRe(from);
  let out = html.replace(re, to);
  if (alt !== undefined) {
    out = out.replace(/<img\b[^>]*>/gi, (tag) => (tag.includes('src="' + to + '"') ? (/\balt="/.test(tag) ? tag.replace(/\balt="[^"]*"/, 'alt="' + alt.replace(/"/g, '&quot;') + '"') : tag.replace('<img', '<img alt="' + alt.replace(/"/g, '&quot;') + '"')) : tag));
  }
  return out;
}

/* ---------------------------------------------------------------- header, menu, footer and site-wide rules */
export type Rule = { find: string; replace: string; on: boolean; kind: 'text' | 'image'; note?: string };
export type Chrome = { header?: string; footer?: string; rules?: Rule[] };

/** the header (top strip + header with the menu) and the footer of a page */
export function chromeParts(html: string) {
  const a = html.indexOf('<div class="topstrip">');
  const hb = html.indexOf('</header>');
  const f = html.indexOf('<footer class="site">');
  const g = html.indexOf('</footer>', f);
  // the footer part also holds what follows it on every page: WhatsApp and chat buttons, the chat panel,
  // the offer pop-up and the cookie bar (up to the page's script)
  const sc = g >= 0 ? html.indexOf('<script', g) : -1;
  const end = sc > g ? sc : g + 9;
  return {
    header: a >= 0 && hb > a ? { a, b: hb + 9 } : null,
    footer: f >= 0 && g > f ? { a: f, b: end } : null,
  };
}
/** links and pictures relative to the page folder → from the site root (the same header fits every page) */
export const rootPaths = (h: string) => h.replace(/((?:src|href)=")(?:\.\.\/)+/g, '$1/').replace(/((?:src|href)=")(assets\/)/g, '$1/$2').replace(/(url\(['"]?)(?:\.\.\/)*(assets\/)/g, '$1/$2');

export function applyChrome(html: string, c: Chrome) {
  if (!c.header && !c.footer) return html;
  const p = chromeParts(html);
  // footer first (it comes later in the page, so the header positions stay right)
  if (c.footer && p.footer) html = html.slice(0, p.footer.a) + c.footer + html.slice(p.footer.b);
  if (c.header && p.header) html = html.slice(0, p.header.a) + c.header + html.slice(p.header.b);
  return html;
}
/** site-wide replacements on the finished page (every language) */
export function applyRules(html: string, rules: Rule[] = []) {
  for (const r of rules) {
    if (!r.on || !r.find) continue;
    if (r.kind === 'image') html = html.replace(imageRe(r.find), r.replace);
    else html = html.split(r.find).join(r.replace);
  }
  return html;
}
