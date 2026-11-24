// Automatic translation of the website's pages, posts and texts into the 18 other languages,
// with the engine chosen in Admin → Translations (Google free, Gemini, Claude or DeepL).
// Hand-made translations are kept unless the admin asks to translate again.
import fs from 'fs';
import path from 'path';
import { translateTexts, translationConfig, notReadyReason } from '@/lib/i18n/translate';
import { getVs, saveVs, type VsTr } from './store';
import { LANG_LIST, SITE_ROOT, loadLangMap, decEnt } from './render';
import { pageTexts } from './pages';
import { translateRich } from './rich';

export const TR_LANGS = LANG_LIST;

/** '' when the engine is ready, otherwise what to do */
export async function engineProblem() {
  const cfg = await translationConfig();
  return notReadyReason(cfg as any);
}
async function tr(texts: string[], lang: string) {
  const why = await engineProblem();
  if (why) throw new Error(why);
  return translateTexts(texts, lang);
}

/** title / excerpt / body ... of one item into one language */
export async function translateFields(src: { title?: string; subtitle?: string; crumb?: string; cat?: string; excerpt?: string; description?: string; body?: string }, lang: string): Promise<VsTr> {
  const keys = (['title', 'subtitle', 'crumb', 'cat', 'excerpt', 'description'] as const).filter((k) => src[k] && String(src[k]).trim());
  const out: VsTr = {};
  if (keys.length) {
    const t = await tr(keys.map((k) => String(src[k])), lang);
    keys.forEach((k, i) => (out[k] = t[i]));
  }
  if (src.body && src.body.trim()) out.body = await translateRich(src.body, (texts) => tr(texts, lang));
  out.at = new Date().toISOString();
  return out;
}

/* ---------------------------------------------------------------- texts of the website (text maps) */
let siteTextCache: { at: number; byText: Map<string, string[]> } | null = null;
/** every text of every page of the website, with the pages it appears on */
export function siteTexts() {
  if (siteTextCache && Date.now() - siteTextCache.at < 10 * 60_000) return siteTextCache.byText;
  const byText = new Map<string, string[]>();
  let sm = '';
  try {
    sm = fs.readFileSync(path.join(SITE_ROOT, 'sitemap.xml'), 'utf8');
  } catch {
    /* none */
  }
  const paths = [...sm.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
  for (const p of paths) {
    try {
      const html = fs.readFileSync(path.join(SITE_ROOT, p === '/' ? 'index.html' : p.slice(1) + '.html'), 'utf8');
      for (const t of pageTexts(html)) {
        const list = byText.get(t);
        if (list) list.push(p);
        else byText.set(t, [p]);
      }
    } catch {
      /* page file missing */
    }
  }
  siteTextCache = { at: Date.now(), byText };
  return byText;
}

/** the translation of an English text in a language: changed in the admin, else the website's own */
export function translationOf(src: string, lang: string, edits: Record<string, string>) {
  if (edits[src] !== undefined) return edits[src];
  const map = loadLangMap(lang) as Record<string, string>;
  return map[src] || map[decEnt(src)] || '';
}

/** Texts (keyed by their English) that have no translation in a language yet get one; force = translate again */
export async function ensureStrings(strings: string[], lang: string, force = false) {
  const all = await getVs('vs.content');
  const ed = all[lang] || {};
  const todo = Array.from(new Set(strings.filter((s) => s && /\p{L}/u.test(decEnt(s))))).filter((s) => force || !translationOf(s, lang, ed));
  if (!todo.length) return 0;
  const done = await tr(todo.map((s) => decEnt(s)), lang);
  const fresh = await getVs('vs.content');
  fresh[lang] = fresh[lang] || {};
  todo.forEach((s, i) => {
    if (done[i] && done[i] !== s) fresh[lang][s] = done[i];
  });
  await saveVs('vs.content', fresh);
  return todo.length;
}

/** English text changed in the admin (src -> new English): the other languages follow */
export async function followEnglishChange(src: string, lang: string) {
  const all = await getVs('vs.content');
  const en = all.en?.[src];
  if (en === undefined) return false;
  const [t] = await tr([en], lang);
  const fresh = await getVs('vs.content');
  fresh[lang] = fresh[lang] || {};
  fresh[lang][src] = t;
  await saveVs('vs.content', fresh);
  return true;
}
