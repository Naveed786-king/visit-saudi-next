// Visual editor, the part without imports (unit-tested with plain Node): finds every element of a page
// with its place in the page ("1.4.0.2" = child numbers from <body>), and changes single elements in the
// HTML text itself, so everything that was not edited stays exactly as it was.

export type El = {
  tag: string;
  /** index of "<" of the start tag */
  start: number;
  /** index just after ">" of the start tag */
  openEnd: number;
  /** index of "<" of the end tag (= openEnd for void elements) */
  closeStart: number;
  /** index just after the element */
  end: number;
  /** place from <body>: child numbers joined by "." ("" = body itself, null = outside body) */
  key: string | null;
};

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title', 'noscript', 'template']);

/** End of a start tag that begins at i (quotes respected); returns the index just after ">" */
function tagEnd(html: string, i: number): number {
  let q = '';
  for (let j = i + 1; j < html.length; j++) {
    const c = html[j];
    if (q) {
      if (c === q) q = '';
    } else if (c === '"' || c === "'") q = c;
    else if (c === '>') return j + 1;
  }
  return html.length;
}

/** All elements of the page, in document order */
export function scanElements(html: string): El[] {
  const out: El[] = [];
  type Open = { el: El; kids: number; path: number[] };
  const stack: Open[] = [];
  let bodyDepth = -1;
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    if (html.startsWith('<!--', lt)) {
      const e = html.indexOf('-->', lt + 4);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      i = tagEnd(html, lt);
      continue;
    }
    if (html[lt + 1] === '/') {
      const m = /^<\/([a-zA-Z][\w:-]*)/.exec(html.slice(lt, lt + 64));
      const e = tagEnd(html, lt);
      if (m) {
        const tag = m[1].toLowerCase();
        let k = stack.length - 1;
        while (k >= 0 && stack[k].el.tag !== tag) k--;
        if (k >= 0) {
          // elements left open inside it end here too
          while (stack.length > k) {
            const o = stack.pop()!;
            o.el.closeStart = stack.length === k ? lt : lt;
            o.el.end = stack.length === k ? e : lt;
            if (stack.length < bodyDepth) bodyDepth = -1;
          }
        }
      }
      i = e;
      continue;
    }
    const m = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(lt, lt + 64));
    if (!m) {
      i = lt + 1;
      continue;
    }
    const tag = m[1].toLowerCase();
    const openEnd = tagEnd(html, lt);
    const parent = stack[stack.length - 1];
    const path = parent ? [...parent.path, parent.kids++] : [0];
    let key: string | null = null;
    if (bodyDepth >= 0 && stack.length >= bodyDepth) key = path.slice(bodyDepth).join('.');
    const el: El = { tag, start: lt, openEnd, closeStart: openEnd, end: openEnd, key };
    out.push(el);
    const selfClosed = html[openEnd - 2] === '/';
    if (tag === 'body') {
      el.key = '';
      bodyDepth = stack.length + 1;
    }
    if (VOID.has(tag) || selfClosed) {
      i = openEnd;
      continue;
    }
    if (RAW.has(tag)) {
      const re = new RegExp('</' + tag + '\\s*>', 'ig');
      re.lastIndex = openEnd;
      const cm = re.exec(html);
      el.closeStart = cm ? cm.index : n;
      el.end = cm ? cm.index + cm[0].length : n;
      i = el.end;
      continue;
    }
    stack.push({ el, kids: 0, path });
    i = openEnd;
  }
  // still open at the end of the file
  for (const o of stack) {
    o.el.closeStart = n;
    o.el.end = n;
  }
  return out;
}

/** The value of an attribute in a start tag */
export function attrOf(startTag: string, name: string): string | null {
  const m = new RegExp('\\s' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(startTag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
}
/** A start tag with an attribute set (value null: removed) */
export function setAttr(startTag: string, name: string, value: string | null): string {
  const re = new RegExp('\\s' + name + '\\s*=\\s*("[^"]*"|\'[^\']*\'|[^\\s>]+)', 'i');
  const clean = startTag.replace(re, '');
  if (value === null) return clean;
  const v = value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const at = clean.endsWith('/>') ? clean.length - 2 : clean.length - 1;
  return clean.slice(0, at).replace(/\s*$/, '') + ` ${name}="${v}"` + clean.slice(at);
}

/** Adds data-vsp="<place>" to every element in <body> (only for the editor, so the browser knows each place) */
export function markPlaces(html: string): string {
  const els = scanElements(html).filter((e) => e.key);
  let out = '';
  let last = 0;
  for (const e of els) {
    const st = html.slice(e.start, e.openEnd);
    out += html.slice(last, e.start) + setAttr(st, 'data-vsp', e.key!);
    last = e.openEnd;
  }
  return out + html.slice(last);
}

export type VisualItem = {
  /** tag name at that place when it was edited (an element is changed only if it is still the same kind) */
  tag: string;
  /** its class attribute and which one of the elements with this tag and class it is (finds it in a language whose page differs) */
  cls?: string;
  nth?: number;
  /** its data-i18n key, if any (also used to find it in another language) */
  i18n?: string;
  /** new content per language ("en" = English page) */
  text?: Record<string, string>;
  /** new picture (every language) and its description per language (alts; alt = the English one, older saves) */
  img?: { src: string; alt?: string; alts?: Record<string, string> };
  /** CSS properties written on the element */
  style?: Record<string, string>;
  hidden?: boolean;
  /** link address for links / buttons */
  href?: string;
  at?: string;
};
export type PageVisual = Record<string, VisualItem>;

const styleText = (s: Record<string, string>) =>
  Object.entries(s)
    .map(([k, v]) => `${k}:${v} !important`)
    .join(';');

/** The page with the visual editor's changes for one language (unchanged when there are none) */
export function applyVisual(html: string, items: PageVisual | undefined, lang: string): string {
  if (!items || !Object.keys(items).length) return html;
  const els = scanElements(html);
  const byKey = new Map<string, El>();
  for (const e of els) if (e.key) byKey.set(e.key, e);
  type Cut = { a: number; b: number; s: string };
  const cuts: Cut[] = [];
  const used = new Set<El>();
  const st = (e: El) => html.slice(e.start, e.openEnd);
  const cls = (e: El) => (attrOf(st(e), 'class') || '').trim();
  const same = (e: El | undefined, it: VisualItem) => !!e && e.tag === it.tag && (it.cls === undefined || cls(e) === it.cls) && (!it.i18n || attrOf(st(e), 'data-i18n') === it.i18n);
  for (const [key, it] of Object.entries(items)) {
    let el = byKey.get(key);
    if (!same(el, it)) {
      // a page of another language can differ a little: find the element by its translation key, or as the
      // same one of the elements with its tag and class
      el = undefined;
      if (it.i18n) el = els.find((e) => e.key && e.tag === it.tag && attrOf(st(e), 'data-i18n') === it.i18n);
      if (!el && it.cls && it.nth !== undefined) el = els.filter((e) => e.key && e.tag === it.tag && cls(e) === it.cls)[it.nth];
      if (!el) continue;
    }
    if (used.has(el)) continue;
    used.add(el);
    const start = st(el);
    let tagOut = start;
    const css: Record<string, string> = { ...(it.style || {}) };
    if (it.hidden) css.display = 'none';
    if (Object.keys(css).length) {
      const own = (attrOf(start, 'style') || '').trim().replace(/;?\s*$/, '');
      tagOut = setAttr(tagOut, 'style', (own ? own + ';' : '') + styleText(css));
    }
    if (it.img && el.tag === 'img') {
      tagOut = setAttr(setAttr(tagOut, 'src', it.img.src), 'srcset', null);
      const alt = it.img.alts ? it.img.alts[lang] : lang === 'en' ? it.img.alt : undefined;
      if (alt !== undefined) tagOut = setAttr(tagOut, 'alt', alt);
    }
    if (it.href !== undefined && el.tag === 'a') tagOut = setAttr(tagOut, 'href', it.href);
    const text = it.text ? it.text[lang] : undefined;
    if (text !== undefined && !VOID.has(el.tag)) {
      // the site's script fills elements with data-i18n from its dictionary: a changed text drops the key
      tagOut = setAttr(tagOut, 'data-i18n', null);
      cuts.push({ a: el.start, b: el.openEnd, s: tagOut });
      cuts.push({ a: el.openEnd, b: el.closeStart, s: text });
    } else if (tagOut !== start) cuts.push({ a: el.start, b: el.openEnd, s: tagOut });
  }
  if (!cuts.length) return html;
  // an edited element inside another edited text is left to the outer one
  cuts.sort((x, y) => x.a - y.a || x.b - y.b);
  let out = '';
  let last = 0;
  for (const c of cuts) {
    if (c.a < last) continue;
    out += html.slice(last, c.a) + c.s;
    last = c.b;
  }
  return out + html.slice(last);
}

/** What the editor stores about the element at a place (null: no element there) */
export function describe(html: string, key: string): { tag: string; cls: string; nth: number; i18n?: string; inner: string } | null {
  const els = scanElements(html).filter((e) => e.key);
  const el = els.find((e) => e.key === key);
  if (!el) return null;
  const st = (e: El) => html.slice(e.start, e.openEnd);
  const cls = (attrOf(st(el), 'class') || '').trim();
  const nth = els.filter((e) => e.tag === el.tag && (attrOf(st(e), 'class') || '').trim() === cls).indexOf(el);
  const i18n = attrOf(st(el), 'data-i18n') || undefined;
  return { tag: el.tag, cls, nth, i18n, inner: html.slice(el.openEnd, el.closeStart) };
}
