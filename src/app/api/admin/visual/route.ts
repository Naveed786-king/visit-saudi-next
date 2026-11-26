// Admin → Pages → Visual editor: saves a change of one element of a website page (text, picture, link,
// colours, sizes, hidden) and lists / undoes the changes of a page. A new English text is translated into
// the other languages in the background; a text changed on a language's own page stays as written.
import sanitizeHtml from 'sanitize-html';
import { requireAdmin } from '@/lib/auth';
import { json, readJson } from '@/lib/vs/http';
import { getVs, saveVs } from '@/lib/vs/store';
import { renderPage, LANG_LIST } from '@/lib/vs/render';
import { baseSources } from '@/lib/vs/sources';
import { describe, type VisualItem } from '@/lib/vs/visual-core';
import { translateHtml, translateTexts } from '@/lib/i18n/translate';
import { engineProblem } from '@/lib/vs/translate';

export const dynamic = 'force-dynamic';
const SITE_LANGS = LANG_LIST;
const LANGS = ['en', ...SITE_LANGS];

const STYLE_PROPS = new Set([
  'color', 'background-color', 'background-image', 'background-size', 'background-position', 'font-size', 'font-weight', 'font-style', 'font-family',
  'text-align', 'line-height', 'letter-spacing', 'text-transform', 'text-decoration', 'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'border-radius', 'border', 'border-color', 'border-width', 'width', 'max-width', 'height', 'min-height',
  'opacity', 'box-shadow', 'object-fit', 'gap',
]);
const safeUrl = (u: string) => /^(https?:\/\/|\/(?!\/))[^\s"'<>()\\]*$/i.test(u);
function cleanStyle(st: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!st || typeof st !== 'object') return out;
  for (const [k, v0] of Object.entries(st as Record<string, unknown>)) {
    const v = String(v0 ?? '').trim().slice(0, 300);
    if (!STYLE_PROPS.has(k) || !v) continue;
    if (k === 'background-image') {
      const m = /^url\((["']?)([^"')]+)\1\)$/.exec(v);
      if (v === 'none') out[k] = 'none';
      else if (m && safeUrl(m[2])) out[k] = `url("${m[2]}")`;
      continue;
    }
    if (/[;{}<>\\]|expression|url\(|@import|javascript:/i.test(v)) continue;
    out[k] = v;
  }
  return out;
}
const cleanText = (h: string) =>
  sanitizeHtml(String(h || '').slice(0, 20000), {
    allowedTags: ['b', 'strong', 'i', 'em', 'u', 'br', 'span', 'a', 'small', 'sup', 'sub', 'p', 'ul', 'ol', 'li'],
    allowedAttributes: { a: ['href', 'target', 'rel'], span: ['class'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  }).trim();
const langOf = (l: unknown) => (LANGS.includes(String(l)) ? String(l) : 'en');
const pathOf = (p: unknown) => {
  const s = String(p || '/').split('?')[0];
  return /^\/[a-z0-9/_.-]*$/i.test(s) && !s.includes('..') ? s : null;
};
const urlFor = (path: string, lang: string) => (lang === 'en' ? path : '/' + lang + (path === '/' ? '/' : path));

/** the page as visitors get it without the editor's changes, in one language */
async function basePage(path: string, lang: string) {
  const r = await renderPage(urlFor(path, lang), '', baseSources);
  return r.kind === 'html' && r.status === 200 ? r.body : null;
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) return json(401, { error: 'Unauthorized' });
  const path = pathOf(new URL(req.url).searchParams.get('path'));
  if (!path) return json(400, { ok: false, error: 'Bad page address' });
  const all = await getVs('vs.visual');
  const items = all[path] || {};
  return json(200, { ok: true, path, count: Object.keys(items).length, items, problem: await engineProblem() });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return json(401, { error: 'Unauthorized' });
  const b = await readJson(req);
  const path = pathOf(b.path);
  const lang = langOf(b.lang);
  const key = String(b.key || '');
  if (!path || !/^\d+(\.\d+)*$/.test(key)) return json(400, { ok: false, error: 'Bad element' });
  const html = await basePage(path, lang);
  if (!html) return json(404, { ok: false, error: 'Page not found' });
  const d = describe(html, key);
  if (!d) return json(404, { ok: false, error: 'This element is not on the page any more. Reload the editor.' });
  const all = await getVs('vs.visual');
  const page = (all[path] = all[path] || {});
  const it: VisualItem = page[key] || { tag: d.tag };
  it.tag = d.tag;
  it.cls = d.cls;
  it.nth = d.nth;
  if (d.i18n) it.i18n = d.i18n;
  if (b.reset === true) {
    delete page[key];
  } else {
    if (b.style !== undefined) {
      const st = cleanStyle(b.style);
      if (Object.keys(st).length) it.style = st;
      else delete it.style;
    }
    if (b.hidden !== undefined) {
      if (b.hidden) it.hidden = true;
      else delete it.hidden;
    }
    if (b.img !== undefined && d.tag === 'img') {
      const src = String(b.img?.src || '').trim();
      if (src && !safeUrl(src)) return json(400, { ok: false, error: 'The picture address must start with https:// or /' });
      if (src) {
        // the picture is the same in every language; its description is per language (the others keep theirs)
        const alts = { ...(it.img?.alts || (it.img?.alt !== undefined ? { en: it.img.alt } : {})) };
        if (b.img?.alt !== undefined) alts[lang] = String(b.img.alt).slice(0, 300);
        it.img = { src, alts };
      }
      else delete it.img;
    }
    if (b.href !== undefined && d.tag === 'a') {
      const h = String(b.href || '').trim();
      if (h && !/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(h)) return json(400, { ok: false, error: 'A link starts with https://, /, #, mailto: or tel:' });
      if (h) it.href = h;
      else delete it.href;
    }
    if (b.text !== undefined) {
      const t = cleanText(b.text);
      it.text = it.text || {};
      if (t) {
        it.text[lang] = t;
        if (lang !== 'en') delete it.text[lang + ':auto']; // written by hand: never replaced by a translation
        // a new English text: the other languages follow (each one keeps its own hand-written text)
        if (lang === 'en') for (const l of SITE_LANGS) if (it.text[l + ':auto'] !== undefined || it.text[l] === undefined) it.text[l + ':auto'] = '';
      } else delete it.text[lang];
      if (!Object.keys(it.text).filter((k) => !k.endsWith(':auto')).length) delete it.text;
    }
    it.at = new Date().toISOString();
    if (!it.style && !it.hidden && !it.img && !it.href && !it.text) delete page[key];
    else page[key] = it;
  }
  if (!Object.keys(page).length) delete all[path];
  await saveVs('vs.visual', all);
  if (b.text !== undefined && lang === 'en' && page[key]?.text?.en) void translateItem(path, key);
  return json(200, { ok: true, item: page[key] || null, count: Object.keys(all[path] || {}).length });
}

/** Undo every change of a page (or only of one language's texts) */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return json(401, { error: 'Unauthorized' });
  const path = pathOf(new URL(req.url).searchParams.get('path'));
  if (!path) return json(400, { ok: false });
  const all = await getVs('vs.visual');
  delete all[path];
  await saveVs('vs.visual', all);
  return json(200, { ok: true });
}

/** The new English text of one element in every other language (where it was not written by hand) */
async function translateItem(path: string, key: string) {
  if (await engineProblem()) return;
  const all0 = await getVs('vs.visual');
  const en = all0[path]?.[key]?.text?.en;
  if (!en) return;
  const plain = !/<[a-z]/i.test(en);
  for (const l of SITE_LANGS) {
    try {
      const cur = (await getVs('vs.visual'))[path]?.[key];
      if (!cur?.text || cur.text.en !== en || cur.text[l + ':auto'] === undefined) continue;
      const out = plain ? (await translateTexts([en], l))[0] : await translateHtml(en, l);
      if (!out) continue;
      const all = await getVs('vs.visual');
      const it = all[path]?.[key];
      if (!it?.text || it.text.en !== en || it.text[l + ':auto'] === undefined) continue;
      it.text[l] = cleanText(out);
      it.text[l + ':auto'] = en;
      await saveVs('vs.visual', all);
    } catch (e) {
      console.error('[visual] translate', l, (e as Error).message);
    }
  }
}
