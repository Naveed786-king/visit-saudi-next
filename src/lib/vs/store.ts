// Website data that the old server kept in JSON files (DATA_DIR) now lives in the Setting table,
// one row per store. A short cache keeps page rendering fast; saving clears it.
import { prisma } from '@/lib/db';
import type { Edits, GuideOverride, Styling } from './render';

export type VsPrice = { amount: number; currency: string };
export type VsSite = {
  whatsapp: string;
  email: string;
  notifyEmail: string;
  prices: Record<string, VsPrice>;
  payments: { enabled: boolean; provider: string };
};
export type VsBlogPost = { slug: string; title: string; cat: string; excerpt: string; body: string; image: string; date: string; published: boolean };
/** Translation of a page or post into one language; manual = changed by hand (not replaced by "translate again") */
export type VsTr = { title?: string; subtitle?: string; crumb?: string; cat?: string; excerpt?: string; description?: string; body?: string; manual?: boolean; at?: string };
/** A post added in the admin (shown with the guides, own page /guides/<slug>) */
export type VsPost = { slug: string; title: string; cat: string; excerpt: string; image: string; body: string; date: string; published: boolean; updatedAt?: string; tr?: Record<string, VsTr> };
/** A page added in the admin: "simple" = written in the editor, "html" = a full page (e.g. a copy of an existing page) */
export type VsPage = {
  slug: string;
  mode: 'simple' | 'html';
  title: string;
  subtitle: string;
  crumb: string;
  description: string;
  image: string;
  body: string;
  html?: string;
  published: boolean;
  updatedAt?: string;
  tr?: Record<string, VsTr>;
};
/** The website's own pages: hidden (deleted from the website), or a new browser title / Google description */
export type VsPageMeta = { hidden?: boolean; title?: string; description?: string };
export type VsReview = { name: string; country: string; visa: string; rating: number; text: string; date: string; visible: boolean };

export const DEFAULT_PRICES: Record<string, VsPrice> = {
  'one-year-multiple': { amount: 300, currency: 'USD' },
  'ninety-day-multiple': { amount: 200, currency: 'USD' },
  umrah: { amount: 250, currency: 'USD' },
};
export const DEFAULT_VS_SITE: VsSite = { whatsapp: '971566556645', email: 'info@visit-saudi.ae', notifyEmail: '', prices: DEFAULT_PRICES, payments: { enabled: false, provider: '' } };
export const DEFAULT_STYLING: Styling = { css: '', pages: {} };

/** Admin → Page styling: website colour variables, Google fonts, CSS for all pages and per page */
export type StylingStore = Styling & { vars?: Record<string, string>; googleFonts?: string[] };
export const STYLE_VARS: { key: string; label: string; def: string; kind: 'color' | 'text' }[] = [
  { key: '--green', label: 'Main green', def: '#0a5c36', kind: 'color' },
  { key: '--green-2', label: 'Green (hover)', def: '#0e7a47', kind: 'color' },
  { key: '--green-deep', label: 'Deep green', def: '#063f24', kind: 'color' },
  { key: '--green-ink', label: 'Headings / dark green', def: '#032115', kind: 'color' },
  { key: '--gold', label: 'Gold', def: '#c19a3d', kind: 'color' },
  { key: '--gold-2', label: 'Gold (light)', def: '#dcb95f', kind: 'color' },
  { key: '--sand', label: 'Sand background', def: '#f7f2e7', kind: 'color' },
  { key: '--sand-2', label: 'Sand (darker)', def: '#efe6d2', kind: 'color' },
  { key: '--ink', label: 'Text', def: '#152219', kind: 'color' },
  { key: '--muted', label: 'Soft text', def: '#5a6b60', kind: 'color' },
  { key: '--line', label: 'Lines / borders', def: '#e3ddcb', kind: 'color' },
  { key: '--radius', label: 'Corner roundness', def: '18px', kind: 'text' },
  { key: '--font-body', label: 'Body font', def: "'Manrope',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", kind: 'text' },
  { key: '--font-display', label: 'Heading font', def: "'Marcellus',Georgia,'Times New Roman',serif", kind: 'text' },
];

type Stores = {
  'vs.site': VsSite;
  'vs.content': Edits;
  'vs.guides': Record<string, GuideOverride>;
  'vs.styling': StylingStore;
  'vs.blog': VsBlogPost[];
  'vs.reviews': VsReview[];
  'vs.customerNotes': Record<string, string>;
  'vs.posts': VsPost[];
  'vs.pages': VsPage[];
  'vs.pageMeta': Record<string, VsPageMeta>;
  /** full HTML of a website page changed in Admin → Pages → HTML (path -> html) */
  'vs.html': Record<string, string>;
};
const DEFAULTS: Stores = {
  'vs.site': DEFAULT_VS_SITE,
  'vs.content': {},
  'vs.guides': {},
  'vs.styling': DEFAULT_STYLING,
  'vs.blog': [],
  'vs.reviews': [],
  'vs.customerNotes': {},
  'vs.posts': [],
  'vs.pages': [],
  'vs.pageMeta': {},
  'vs.html': {},
};

const cache = new Map<string, { at: number; v: unknown }>();
const TTL = 5_000;

export async function getVs<K extends keyof Stores>(key: K): Promise<Stores[K]> {
  const c = cache.get(key);
  if (c && Date.now() - c.at < TTL) return c.v as Stores[K];
  let v: Stores[K] = structuredClone(DEFAULTS[key]);
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (row) {
      const parsed = JSON.parse(row.value);
      v = Array.isArray(DEFAULTS[key]) ? parsed : { ...(DEFAULTS[key] as object), ...parsed };
    }
  } catch {
    /* table not ready: defaults */
  }
  if (key === 'vs.site') {
    const s = v as VsSite;
    s.payments = { ...DEFAULT_VS_SITE.payments, ...(s.payments || {}) };
    if (!s.prices || !Object.keys(s.prices).length) s.prices = DEFAULT_PRICES;
  }
  cache.set(key, { at: Date.now(), v });
  return v;
}

export async function saveVs<K extends keyof Stores>(key: K, value: Stores[K]) {
  const json = JSON.stringify(value);
  await prisma.setting.upsert({ where: { key }, update: { value: json }, create: { key, value: json } });
  cache.delete(key);
}

/** The text edits for one language (Admin → Website texts) */
export async function editsFor(lang: string) {
  const all = await getVs('vs.content');
  return all[lang] || {};
}

/** Styling for the public pages: colour variables, extra Google fonts and CSS from Admin → Page styling */
export async function stylingCss(): Promise<Styling | null> {
  const s = await getVs('vs.styling');
  const parts: string[] = [];
  const fonts = (s.googleFonts || []).map((f) => String(f).replace(/[^a-zA-Z0-9 ]/g, '').trim()).filter(Boolean).slice(0, 4);
  if (fonts.length) parts.push(`@import url('https://fonts.googleapis.com/css2?${fonts.map((f) => 'family=' + f.replace(/ /g, '+') + ':wght@400;600;700').join('&')}&display=swap');`);
  const def = Object.fromEntries(STYLE_VARS.map((v) => [v.key, v.def]));
  const vars = Object.entries(s.vars || {}).filter(([k, v]) => /^--[a-z0-9-]+$/i.test(k) && v && v.trim() && v.trim() !== def[k] && /^[#(),.%'"\w\s-]+$/.test(v));
  if (vars.length) parts.push(':root{' + vars.map(([k, v]) => `${k}:${v.trim()}`).join(';') + '}');
  if (s.css?.trim()) parts.push(s.css.trim());
  const css = parts.join('\n');
  const pages = s.pages || {};
  if (!css && !Object.values(pages).some((x) => x && x.trim())) return null;
  return { css, pages };
}
