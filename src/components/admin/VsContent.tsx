'use client';
// Admin screens for the visit-saudi.ae website content:
//   Pages        – the website's own pages (texts, browser title, Google description, hide, HTML) and new pages
//   Posts        – the built-in guides and new posts (add, edit, hide, delete)
//   Translations – the translation engine and every text of the website in all 19 languages
// Everything written in English can be translated automatically into the 18 other languages and corrected by hand.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FilePlus2,
  Globe2,
  Heading2,
  Heading3,
  HelpCircle,
  Image as ImageIcon,
  Languages,
  Link2,
  List,
  ListOrdered,
  MousePointerClick,
  Plus,
  Quote,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Btn, Card, Empty, Modal, PageTitle, Spinner, Toggle, api, confirmDialog, toast } from './ui';
import { ImageInput, MediaPickerModal } from './MediaPicker';
import { cn } from '@/lib/utils';

export const LANG_NAMES: Record<string, string> = {
  en: 'English', ar: 'Arabic', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', tr: 'Turkish', zh: 'Chinese', ur: 'Urdu', hi: 'Hindi',
  it: 'Italian', ro: 'Romanian', pt: 'Portuguese', pl: 'Polish', hu: 'Hungarian', hr: 'Croatian', sk: 'Slovak', cs: 'Czech', id: 'Indonesian',
};
const OTHER_LANGS = Object.keys(LANG_NAMES).filter((l) => l !== 'en');
const RTL = new Set(['ar', 'ur']);
const C = '/api/admin/vs-content';

type Tr = { title?: string; subtitle?: string; crumb?: string; cat?: string; excerpt?: string; description?: string; body?: string; html?: string; manual?: boolean; at?: string };
type TrMap = Record<string, Tr>;

/* ================================================================ translation engine state */
function useEngine() {
  const [e, setE] = useState<{ provider: string; problem: string } | null>(null);
  const load = useCallback(() => api(`${C}/engine`).then(setE).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);
  return { engine: e, reload: load };
}
function EngineNote({ engine }: { engine: { provider: string; problem: string } | null }) {
  if (!engine || !engine.problem) return null;
  return (
    <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <b>Automatic translation is not ready:</b> {engine.problem}.{' '}
      <a href="/admin/site-texts" className="font-bold underline">
        Choose the translation engine
      </a>{' '}
      (Google Translate works without a key).
    </div>
  );
}

/** Runs a job for each language one after another and shows the progress */
function useLangRunner() {
  const [state, setState] = useState<{ done: number; total: number; lang: string; errors: string[] } | null>(null);
  const run = useCallback(async (langs: string[], job: (lang: string) => Promise<void>) => {
    const errors: string[] = [];
    setState({ done: 0, total: langs.length, lang: langs[0] || '', errors });
    for (let i = 0; i < langs.length; i++) {
      setState({ done: i, total: langs.length, lang: langs[i], errors: [...errors] });
      try {
        await job(langs[i]);
      } catch (e: any) {
        errors.push(`${LANG_NAMES[langs[i]]}: ${e.message}`);
        if (errors.length >= 3 && i < 3) break; // the engine does not work: stop early
      }
    }
    setState(null);
    if (errors.length) toast(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more)` : ''), 'error');
    return errors;
  }, []);
  const bar = state ? (
    <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 animate-pulse" /> Translating… {LANG_NAMES[state.lang]}
        </span>
        <span className="text-xs">
          {state.done} / {state.total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round((state.done / Math.max(1, state.total)) * 100)}%` }} />
      </div>
    </div>
  ) : null;
  return { run, busy: !!state, bar };
}

/* ================================================================ text editor */
const HELP = `## Section heading
### Sub-heading
A paragraph. **bold words** and a [link](/apply)

- bullet point
1. numbered step

![picture description](/uploads/media/photo.jpg)
> A highlighted note
Q: A question for the FAQ
A: Its answer
[button: Start your application](/apply)`;

export function RichEditor({ value, onChange, dir, minH = 360 }: { value: string; onChange: (v: string) => void; dir?: 'rtl' | 'ltr'; minH?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pick, setPick] = useState(false);
  const [help, setHelp] = useState(false);
  function edit(fn: (sel: string) => { text: string; block?: boolean }) {
    const ta = ref.current;
    if (!ta) return;
    const a = ta.selectionStart;
    const b = ta.selectionEnd;
    const sel = value.slice(a, b);
    const r = fn(sel);
    let ins = r.text;
    const before = value.slice(0, a);
    const after = value.slice(b);
    if (r.block) {
      if (before && !before.endsWith('\n\n')) ins = (before.endsWith('\n') ? '\n' : '\n\n') + ins;
      if (after && !after.startsWith('\n')) ins = ins + '\n\n';
    }
    const next = before + ins + after;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length + ins.length;
      ta.setSelectionRange(pos, pos);
    });
  }
  const lines = (sel: string, prefix: (i: number) => string) => (sel || 'Item').split('\n').map((l, i) => prefix(i) + l.replace(/^([-*] |\d+[.)] )/, '')).join('\n');
  const tools: { icon: any; label: string; fn: () => void }[] = [
    { icon: Heading2, label: 'Section heading', fn: () => edit((s) => ({ text: '## ' + (s || 'Section heading'), block: true })) },
    { icon: Heading3, label: 'Sub-heading', fn: () => edit((s) => ({ text: '### ' + (s || 'Sub-heading'), block: true })) },
    { icon: Bold, label: 'Bold', fn: () => edit((s) => ({ text: '**' + (s || 'bold text') + '**' })) },
    {
      icon: Link2,
      label: 'Link',
      fn: () => {
        const href = window.prompt('Link address (for example /apply or https://…)', '/');
        if (href) edit((s) => ({ text: '[' + (s || 'link text') + '](' + href.trim() + ')' }));
      },
    },
    { icon: List, label: 'Bullet list', fn: () => edit((s) => ({ text: lines(s, () => '- '), block: true })) },
    { icon: ListOrdered, label: 'Numbered list', fn: () => edit((s) => ({ text: lines(s, (i) => i + 1 + '. '), block: true })) },
    { icon: ImageIcon, label: 'Picture', fn: () => setPick(true) },
    { icon: Quote, label: 'Highlighted note', fn: () => edit((s) => ({ text: '> ' + (s || 'Note'), block: true })) },
    { icon: HelpCircle, label: 'FAQ question', fn: () => edit(() => ({ text: 'Q: Question?\nA: Answer.', block: true })) },
    {
      icon: MousePointerClick,
      label: 'Button',
      fn: () => {
        const href = window.prompt('Button link (for example /apply)', '/apply');
        if (href) edit((s) => ({ text: '[button: ' + (s || 'Start your application') + '](' + href.trim() + ')', block: true }));
      },
    },
  ];
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-gray-200">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
        {tools.map((t) => (
          <button key={t.label} type="button" title={t.label} onClick={t.fn} className="rounded-lg p-1.5 text-gray-600 hover:bg-white hover:text-gray-900">
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <button type="button" onClick={() => setHelp((h) => !h)} className="ml-auto rounded-lg px-2 py-1 text-xs font-bold text-gray-500 hover:bg-white">
          How to write
        </button>
      </div>
      {help && <pre className="whitespace-pre-wrap border-b border-gray-100 bg-amber-50/60 p-3 text-xs text-gray-700">{HELP}</pre>}
      <textarea ref={ref} dir={dir} className="block w-full resize-y border-0 p-3 font-mono text-[13px] leading-relaxed outline-none" style={{ minHeight: minH }} value={value} onChange={(e) => onChange(e.target.value)} />
      <MediaPickerModal open={pick} onClose={() => setPick(false)} onSelect={(url) => edit(() => ({ text: '![Picture](' + url + ')', block: true }))} />
    </div>
  );
}

/* ================================================================ language tabs of a page or post */
type FieldDef = { key: keyof Tr; label: string; long?: boolean; rich?: boolean; code?: boolean };

function TranslationsPanel({
  english,
  fields,
  tr,
  setTr,
  engine,
}: {
  english: Record<string, string>;
  fields: FieldDef[];
  tr: TrMap;
  setTr: (t: TrMap) => void;
  engine: { provider: string; problem: string } | null;
}) {
  const [lang, setLang] = useState('ar');
  const { run, busy, bar } = useLangRunner();
  const t = tr[lang] || {};
  const status = (l: string) => (tr[l]?.manual ? 'manual' : tr[l]?.at || tr[l]?.title ? 'done' : 'none');
  async function translateOne(l: string) {
    const src: any = {};
    for (const f of fields) if (english[f.key]) src[f.key] = english[f.key];
    const d = await api(`${C}/translate`, 'POST', { kind: 'fields', lang: l, fields: src });
    if (!d.ok) throw new Error(d.error || 'Translation failed');
    return d.tr as Tr;
  }
  async function all(includeManual: boolean) {
    const langs = OTHER_LANGS.filter((l) => includeManual || !tr[l]?.manual);
    const next: TrMap = { ...tr };
    await run(langs, async (l) => {
      next[l] = await translateOne(l);
      setTr({ ...next });
    });
  }
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Languages className="h-4 w-4" /> Other languages
        </span>
      }
      actions={
        <Btn size="sm" variant="dark" disabled={busy || !!engine?.problem} onClick={() => all(false)}>
          <Sparkles className="h-3.5 w-3.5" /> Translate all languages
        </Btn>
      }
    >
      <div className="space-y-3 p-4">
        <EngineNote engine={engine} />
        {bar}
        <div className="flex flex-wrap gap-1.5">
          {OTHER_LANGS.map((l) => {
            const s = status(l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-bold ring-1',
                  lang === l ? 'bg-ink text-white ring-ink' : s === 'none' ? 'bg-white text-gray-400 ring-gray-200' : s === 'manual' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                )}
                title={s === 'none' ? 'Not translated yet - shows in English' : s === 'manual' ? 'Changed by hand' : 'Translated'}
              >
                {LANG_NAMES[l]}
                {s !== 'none' && ' ✓'}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <p className="text-sm font-semibold">
            {LANG_NAMES[lang]}{' '}
            <span className="text-xs font-normal text-gray-500">
              {status(lang) === 'none' ? '— not translated yet, visitors see English' : status(lang) === 'manual' ? '— changed by hand (kept when translating all)' : '— translated automatically'}
            </span>
          </p>
          <div className="flex gap-2">
            <Btn
              size="sm"
              variant="outline"
              disabled={busy || !!engine?.problem}
              onClick={() =>
                run([lang], async (l) => {
                  const x = await translateOne(l);
                  setTr({ ...tr, [l]: x });
                })
              }
            >
              <Wand2 className="h-3.5 w-3.5" /> Translate {LANG_NAMES[lang]}
            </Btn>
            {tr[lang] && (
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => {
                  const n = { ...tr };
                  delete n[lang];
                  setTr(n);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Btn>
            )}
          </div>
        </div>
        {fields.map((f) => {
          const v = (t[f.key] as string) || '';
          const set = (val: string) => setTr({ ...tr, [lang]: { ...t, [f.key]: val, manual: true } });
          return (
            <div key={f.key}>
              <label className="admin-label">
                {f.label} <span className="font-normal text-gray-400">— English: {(english[f.key] || '').slice(0, 80)}{(english[f.key] || '').length > 80 ? '…' : ''}</span>
              </label>
              {f.rich ? (
                <RichEditor value={v} onChange={set} dir={RTL.has(lang) ? 'rtl' : 'ltr'} minH={260} />
              ) : f.long ? (
                <textarea dir={RTL.has(lang) ? 'rtl' : 'ltr'} className={cn('admin-input', f.code ? 'min-h-[320px] font-mono text-[11px]' : 'min-h-[70px]')} value={v} onChange={(e) => set(e.target.value)} />
              ) : (
                <input dir={RTL.has(lang) ? 'rtl' : 'ltr'} className="admin-input" value={v} onChange={(e) => set(e.target.value)} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Preview of a page or post as visitors will see it (also before saving) */
function Preview({ payload, url }: { payload: any; url?: string }) {
  const [lang, setLang] = useState('');
  const [html, setHtml] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api(`${C}/preview`, 'POST', { ...payload, lang })
        .then((d) => alive && setHtml(d.html))
        .catch(() => {});
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload), lang, tick]);
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Eye className="h-4 w-4" /> Preview
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <select className="admin-input !w-auto !py-1.5 text-xs" value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.keys(LANG_NAMES).map((l) => (
              <option key={l} value={l === 'en' ? '' : l}>
                {LANG_NAMES[l]}
              </option>
            ))}
          </select>
          <button type="button" className="text-xs font-bold text-gray-500 underline" onClick={() => setTick((x) => x + 1)}>
            Refresh
          </button>
          {url && (
            <a href={(lang ? '/' + lang : '') + url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-gold-deep underline">
              Live page <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      }
    >
      {/* the page's own links work relative to the website */}
      <iframe title="Preview" className="h-[75vh] w-full rounded-b-2xl bg-white" srcDoc={html ? html.replace('<head>', '<head><base href="/" target="_blank">') : '<p style="font-family:sans-serif;padding:20px;color:#888">Loading…</p>'} />
    </Card>
  );
}

/* ================================================================ POSTS */
type PostRow = { kind: 'post' | 'guide'; slug: string; title: string; cat: string; excerpt: string; image: string; edited: boolean; published: boolean; date?: string; langs: number; auto?: boolean };

export function PostsAdmin() {
  const [d, setD] = useState<{ posts: PostRow[]; cats: string[] } | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState<{ kind: 'post' | 'guide'; slug?: string } | null>(null);
  const { engine, reload } = useEngine();
  const load = useCallback(() => api(`${C}/posts`).then(setD), []);
  useEffect(() => {
    load();
  }, [load]);
  if (open) {
    return (
      <PostEditor
        kind={open.kind}
        slug={open.slug}
        cats={d?.cats || []}
        engine={engine}
        onClose={() => {
          setOpen(null);
          load();
          reload();
        }}
      />
    );
  }
  const shown = (d?.posts || []).filter(
    (p) =>
      (!q || (p.title + ' ' + p.cat + ' ' + p.slug).toLowerCase().includes(q.toLowerCase())) &&
      (!cat || p.cat === cat) &&
      (filter === 'all' || (filter === 'mine' && p.kind === 'post' && !p.auto) || (filter === 'auto' && !!p.auto) || (filter === 'guides' && p.kind === 'guide') || (filter === 'hidden' && !p.published) || (filter === 'edited' && p.edited))
  );
  async function visibility(p: PostRow, published: boolean) {
    await api(`${C}/post-visibility`, 'POST', { kind: p.kind, slug: p.slug, published });
    toast(published ? 'Shown on the website again' : 'Hidden from the website');
    load();
  }
  return (
    <div>
      <PageTitle
        title="Posts & guides"
        subtitle="Add, edit, hide and delete the articles of the website. Every post gets its own page at /guides/…, appears on the Guides page and can be translated into all 19 languages."
        actions={
          <Btn onClick={() => setOpen({ kind: 'post' })}>
            <Plus className="h-4 w-4" /> New post
          </Btn>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="admin-input pl-9" placeholder="Find a post…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="admin-input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="mine">New posts</option>
            <option value="auto">Auto Publisher</option>
            <option value="guides">Built-in guides</option>
            <option value="edited">Edited guides</option>
            <option value="hidden">Hidden</option>
          </select>
          <select className="admin-input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {(d?.cats || []).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {!d ? (
          <Spinner />
        ) : !shown.length ? (
          <Empty text="No posts found" />
        ) : (
          <div className="divide-y divide-gray-100">
            {shown.map((p) => (
              <div key={p.kind + p.slug} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image ? <img src={p.image.startsWith('http') || p.image.startsWith('/') ? p.image : '/' + p.image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" /> : <div className="h-14 w-20 shrink-0 rounded-lg bg-gray-100" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="truncate text-xs text-gray-500">
                    {p.cat} · /guides/{p.slug}
                    {p.date ? ' · ' + p.date : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.kind === 'post' && !p.auto && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">new post</span>}
                    {p.auto && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">Auto Publisher</span>}
                    {p.edited && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">edited</span>}
                    {!p.published && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">hidden</span>}
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', p.langs >= 18 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600')}>{p.langs + 1}/19 languages</span>
                  </div>
                </div>
                <a href={`/guides/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-gray-700" title="Open on the website">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Btn size="sm" variant="outline" onClick={() => setOpen({ kind: p.kind, slug: p.slug })}>
                  Edit
                </Btn>
                <Btn size="sm" variant="ghost" onClick={() => visibility(p, !p.published)} title={p.published ? 'Hide from the website' : 'Show on the website'}>
                  {p.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Btn>
                {p.kind === 'post' ? (
                  <Btn
                    size="sm"
                    variant="danger"
                    title="Delete"
                    onClick={async () => {
                      if (!(await confirmDialog(`Delete "${p.title}" for good (all languages)?`))) return;
                      await api(`${C}/post-delete`, 'POST', { kind: 'post', slug: p.slug });
                      toast('Post deleted');
                      load();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                ) : p.edited ? (
                  <Btn
                    size="sm"
                    variant="ghost"
                    title="Back to the original guide"
                    onClick={async () => {
                      if (!(await confirmDialog('Put this guide back to the original (your changes and their translations are removed)?'))) return;
                      await api(`${C}/guide-reset`, 'POST', { slug: p.slug });
                      toast('Guide back to the original');
                      load();
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Btn>
                ) : (
                  <span className="w-[34px]" />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const POST_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Title' },
  { key: 'cat', label: 'Category' },
  { key: 'excerpt', label: 'Summary', long: true },
  { key: 'body', label: 'Text', rich: true },
];
// an article of the Auto Publisher is finished HTML
const HTML_POST_FIELDS: FieldDef[] = [
  { key: 'title', label: 'Title' },
  { key: 'cat', label: 'Category' },
  { key: 'excerpt', label: 'Summary', long: true },
  { key: 'html', label: 'Text (HTML)', long: true, code: true },
];

function PostEditor({ kind, slug, cats, engine, onClose }: { kind: 'post' | 'guide'; slug?: string; cats: string[]; engine: { provider: string; problem: string } | null; onClose: () => void }) {
  const [p, setP] = useState<any>(slug ? null : { title: '', slug: '', cat: 'News', excerpt: '', image: '', body: '', published: true, date: new Date().toISOString().slice(0, 10), tr: {} });
  const [oldSlug, setOldSlug] = useState(slug || '');
  const [busy, setBusy] = useState(false);
  const [autoTr, setAutoTr] = useState(true);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const { run, bar } = useLangRunner();
  const english = useRef('');
  useEffect(() => {
    if (!slug) return;
    api(`${C}/post?kind=${kind}&slug=${slug}`).then((d) => {
      setP({ ...d.post, tr: d.post.tr || {} });
      english.current = JSON.stringify([d.post.title, d.post.cat, d.post.excerpt, d.post.body, d.post.html]);
    });
  }, [kind, slug]);
  if (!p) return <Spinner />;
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }));
  async function save() {
    setBusy(true);
    try {
      const body = { ...p, kind, oldSlug };
      const r = await api(`${C}/post`, 'POST', body);
      const saved = r.slug || p.slug;
      setOldSlug(saved);
      setP((x: any) => ({ ...x, slug: saved }));
      toast('Saved — live on the website');
      const now = JSON.stringify([p.title, p.cat, p.excerpt, p.body, p.html]);
      // English changed: the other languages follow (languages changed by hand are kept)
      if (autoTr && !engine?.problem && now !== english.current) {
        english.current = now;
        const next: TrMap = { ...(p.tr || {}) };
        await run(
          OTHER_LANGS.filter((l) => !next[l]?.manual),
          async (l) => {
            const d = await api(`${C}/translate`, 'POST', { kind: 'fields', lang: l, fields: { title: p.title, cat: p.cat, excerpt: p.excerpt, body: p.body, html: p.html } });
            if (!d.ok) throw new Error(d.error);
            next[l] = d.tr;
            setP((x: any) => ({ ...x, tr: { ...next } }));
          }
        );
        await api(`${C}/post`, 'POST', { ...p, slug: saved, kind, oldSlug: saved, tr: next });
        toast('Translations saved');
      }
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageTitle
        title={kind === 'guide' ? 'Edit guide' : slug ? 'Edit post' : 'New post'}
        subtitle={kind === 'guide' ? 'A built-in guide: your version replaces the original text (you can go back to the original any time).' : 'Shown on the Guides page and at its own address.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Btn>
            <Btn onClick={save} loading={busy}>
              <Save className="h-4 w-4" /> Save
            </Btn>
          </div>
        }
      />
      {bar && <div className="mb-4">{bar}</div>}
      <div className="mb-4 flex gap-2">
        {(['edit', 'preview'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('rounded-xl px-4 py-2 text-sm font-bold', tab === t ? 'bg-ink text-white' : 'bg-white ring-1 ring-gray-200')}>
            {t === 'edit' ? 'Write' : 'Preview'}
          </button>
        ))}
      </div>
      {tab === 'preview' ? (
        <Preview payload={{ type: 'post', ...p }} url={oldSlug ? `/guides/${oldSlug}` : undefined} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <Card title="English">
              <div className="space-y-3 p-5">
                <div>
                  <label className="admin-label">Title</label>
                  <input className="admin-input" value={p.title} onChange={(e) => set('title', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Summary (shown on the card, under the title and in Google)</label>
                  <textarea className="admin-input min-h-[70px]" value={p.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Text{typeof p.html === 'string' ? ' (HTML, written by the Auto Publisher)' : ''}</label>
                  {typeof p.html === 'string' ? (
                    <textarea spellCheck={false} className="admin-input min-h-[420px] font-mono text-[12px] leading-snug" value={p.html} onChange={(e) => set('html', e.target.value)} />
                  ) : (
                    <RichEditor value={p.body} onChange={(v) => set('body', v)} />
                  )}
                </div>
              </div>
            </Card>
            <TranslationsPanel
              english={{ title: p.title, cat: p.cat, excerpt: p.excerpt, body: p.body, html: p.html || '' }}
              fields={typeof p.html === 'string' ? HTML_POST_FIELDS : POST_FIELDS}
              tr={p.tr || {}}
              setTr={(t) => set('tr', t)}
              engine={engine}
            />
          </div>
          <div className="space-y-5">
            <Card title="Settings">
              <div className="space-y-3 p-5">
                <Toggle checked={p.published !== false} onChange={(v) => set('published', v)} label="Show on the website" />
                {kind === 'post' && (
                  <div>
                    <label className="admin-label">Address</label>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-gray-400">/guides/</span>
                      <input className="admin-input" placeholder="made from the title" value={p.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="admin-label">Category</label>
                  <input className="admin-input" list="vs-cats" value={p.cat} onChange={(e) => set('cat', e.target.value)} />
                  <datalist id="vs-cats">
                    {cats.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                {kind === 'post' && (
                  <div>
                    <label className="admin-label">Date</label>
                    <input type="date" className="admin-input" value={p.date || ''} onChange={(e) => set('date', e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="admin-label">Main picture</label>
                  <ImageInput value={p.image} onChange={(v) => set('image', v)} />
                </div>
                <Toggle checked={autoTr} onChange={setAutoTr} label="When the English changes, translate the other languages automatically" />
              </div>
            </Card>
            {kind === 'post' && oldSlug && (
              <Card>
                <div className="p-5">
                  <Btn
                    variant="danger"
                    onClick={async () => {
                      if (!(await confirmDialog('Delete this post for good (all languages)?'))) return;
                      await api(`${C}/post-delete`, 'POST', { kind: 'post', slug: oldSlug });
                      toast('Post deleted');
                      onClose();
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete post
                  </Btn>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================ PAGES */
type BuiltRow = { path: string; title: string; hidden: boolean; seo: boolean; html: boolean; styled: boolean };
type CustomRow = { slug: string; path: string; title: string; mode: 'simple' | 'html'; published: boolean; langs: number };

export function PagesAdmin() {
  const [d, setD] = useState<{ built: BuiltRow[]; custom: CustomRow[] } | null>(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'built' | 'custom'>('built');
  const [open, setOpen] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const { engine, reload } = useEngine();
  const load = useCallback(() => api(`${C}/pages`).then(setD), []);
  useEffect(() => {
    load();
  }, [load]);
  if (open !== null) {
    return (
      <PageEditorVs
        path={open}
        engine={engine}
        onClose={() => {
          setOpen(null);
          load();
          reload();
        }}
      />
    );
  }
  const ql = q.toLowerCase();
  const built = (d?.built || []).filter((p) => !q || (p.path + ' ' + p.title).toLowerCase().includes(ql));
  const custom = (d?.custom || []).filter((p) => !q || (p.path + ' ' + p.title).toLowerCase().includes(ql));
  return (
    <div>
      <PageTitle
        title="Pages"
        subtitle="Every page of the website. Change its texts in any language, its browser title and Google description, hide it, or edit its HTML. Add new pages written in the editor or copied from an existing page."
        actions={
          <Btn onClick={() => setCreate(true)}>
            <FilePlus2 className="h-4 w-4" /> New page
          </Btn>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
          {(['built', 'custom'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn('rounded-xl px-4 py-2 text-sm font-bold', tab === t ? 'bg-ink text-white' : 'bg-white ring-1 ring-gray-200')}>
              {t === 'built' ? `Website pages (${d?.built.length ?? '…'})` : `New pages (${d?.custom.length ?? '…'})`}
            </button>
          ))}
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="admin-input pl-9" placeholder="Find a page…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {!d ? (
          <Spinner />
        ) : tab === 'built' ? (
          <div className="max-h-[70vh] divide-y divide-gray-100 overflow-auto">
            {built.map((p) => (
              <div key={p.path} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="truncate font-mono text-[11px] text-gray-400">{p.path}</p>
                </div>
                {p.hidden && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">hidden</span>}
                {p.seo && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">title changed</span>}
                {p.html && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">HTML changed</span>}
                {p.styled && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">styled</span>}
                <a href={p.path} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-gray-700">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Btn size="sm" variant="outline" onClick={() => setOpen(p.path)}>
                  Edit
                </Btn>
              </div>
            ))}
          </div>
        ) : !custom.length ? (
          <Empty
            text="No new pages yet"
            action={
              <Btn onClick={() => setCreate(true)}>
                <FilePlus2 className="h-4 w-4" /> New page
              </Btn>
            }
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {custom.map((p) => (
              <div key={p.slug} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="truncate font-mono text-[11px] text-gray-400">
                    {p.path} · {p.mode === 'html' ? 'HTML page' : 'written in the editor'}
                    {p.mode === 'simple' ? ` · ${p.langs + 1}/19 languages` : ''}
                  </p>
                </div>
                {!p.published && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">draft</span>}
                <a href={p.path} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-gray-700">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Btn size="sm" variant="outline" onClick={() => setOpen(p.path)}>
                  Edit
                </Btn>
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (!(await confirmDialog(`Delete the page ${p.path} for good (all languages)?`))) return;
                    await api(`${C}/page-delete`, 'POST', { slug: p.slug });
                    toast('Page deleted');
                    load();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
      <NewPageModal
        open={create}
        pages={d?.built || []}
        onClose={() => setCreate(false)}
        onCreated={(path) => {
          setCreate(false);
          setOpen(path);
        }}
      />
    </div>
  );
}

function NewPageModal({ open, pages, onClose, onCreated }: { open: boolean; pages: BuiltRow[]; onClose: () => void; onCreated: (path: string) => void }) {
  const [mode, setMode] = useState<'simple' | 'copy'>('simple');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [from, setFrom] = useState('/about');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      if (mode === 'copy') {
        const r = await api(`${C}/page-copy`, 'POST', { from, title, slug: slug || title });
        onCreated('/' + r.page.slug);
      } else {
        const r = await api(`${C}/page`, 'POST', { mode: 'simple', title, slug: slug || title, subtitle: '', crumb: '', description: '', image: '', body: '## ' + (title || 'Heading') + '\n\nWrite the page here.', published: false });
        onCreated('/' + r.page.slug);
      }
      setTitle('');
      setSlug('');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New page"
      wide
      footer={
        <Btn onClick={go} loading={busy} disabled={!title.trim()}>
          Create page
        </Btn>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['simple', 'Write a new page', 'In the website design, written in the editor. Easy to translate into all languages.'],
              ['copy', 'Copy an existing page', 'Starts as an exact copy of a page (for example a visa page); you change its HTML.'],
            ] as const
          ).map(([m, t, s]) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-xl p-4 text-left ring-1', mode === m ? 'bg-amber-50 ring-gold' : 'ring-gray-200 hover:bg-gray-50')}>
              <p className="font-bold">{t}</p>
              <p className="mt-1 text-xs text-gray-500">{s}</p>
            </button>
          ))}
        </div>
        {mode === 'copy' && (
          <div>
            <label className="admin-label">Page to copy</label>
            <select className="admin-input" value={from} onChange={(e) => setFrom(e.target.value)}>
              {pages.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.title} — {p.path}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="admin-label">Title</label>
          <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="admin-label">Address (optional — made from the title)</label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-400">visit-saudi.ae/</span>
            <input className="admin-input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
          </div>
        </div>
        <p className="text-xs text-gray-500">The new page starts as a draft (not visible) until you switch on &quot;Show on the website&quot;.</p>
      </div>
    </Modal>
  );
}

function PageEditorVs({ path, engine, onClose }: { path: string; engine: { provider: string; problem: string } | null; onClose: () => void }) {
  const [d, setD] = useState<any>(null);
  const load = useCallback(() => api(`${C}/page?path=${encodeURIComponent(path)}`).then(setD), [path]);
  useEffect(() => {
    load();
  }, [load]);
  if (!d) return <Spinner />;
  if (d.kind === 'custom' && d.page.mode === 'simple') return <SimplePageEditor page={d.page} engine={engine} onClose={onClose} />;
  if (d.kind === 'custom') return <HtmlPageEditor page={d.page} engine={engine} onClose={onClose} />;
  return <BuiltPageEditor d={d} engine={engine} onClose={onClose} reload={load} />;
}

const PAGE_FIELDS: FieldDef[] = [
  { key: 'crumb', label: 'Small label above the title' },
  { key: 'title', label: 'Title' },
  { key: 'subtitle', label: 'Line under the title', long: true },
  { key: 'description', label: 'Google description', long: true },
  { key: 'body', label: 'Text', rich: true },
];

function SimplePageEditor({ page, engine, onClose }: { page: any; engine: { provider: string; problem: string } | null; onClose: () => void }) {
  const [p, setP] = useState<any>({ ...page, tr: page.tr || {} });
  const [oldSlug, setOldSlug] = useState(page.slug);
  const [busy, setBusy] = useState(false);
  const [autoTr, setAutoTr] = useState(true);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const { run, bar } = useLangRunner();
  const english = useRef(JSON.stringify([page.title, page.subtitle, page.crumb, page.description, page.body]));
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }));
  async function save() {
    setBusy(true);
    try {
      const r = await api(`${C}/page`, 'POST', { ...p, oldSlug });
      setOldSlug(r.page.slug);
      set('slug', r.page.slug);
      toast(p.published ? 'Saved — live on the website' : 'Saved (draft — not visible yet)');
      const now = JSON.stringify([p.title, p.subtitle, p.crumb, p.description, p.body]);
      if (autoTr && !engine?.problem && now !== english.current) {
        english.current = now;
        const next: TrMap = { ...(p.tr || {}) };
        await run(
          OTHER_LANGS.filter((l) => !next[l]?.manual),
          async (l) => {
            const t = await api(`${C}/translate`, 'POST', { kind: 'fields', lang: l, fields: { title: p.title, subtitle: p.subtitle, crumb: p.crumb, description: p.description, body: p.body } });
            if (!t.ok) throw new Error(t.error);
            next[l] = t.tr;
            setP((x: any) => ({ ...x, tr: { ...next } }));
          }
        );
        await api(`${C}/page`, 'POST', { ...p, slug: r.page.slug, oldSlug: r.page.slug, tr: next });
        toast('Translations saved');
      }
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageTitle
        title={`Page /${oldSlug}`}
        subtitle="A page in the website design, written in the editor."
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Btn>
            <Btn onClick={save} loading={busy}>
              <Save className="h-4 w-4" /> Save
            </Btn>
          </div>
        }
      />
      {bar && <div className="mb-4">{bar}</div>}
      <div className="mb-4 flex gap-2">
        {(['edit', 'preview'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('rounded-xl px-4 py-2 text-sm font-bold', tab === t ? 'bg-ink text-white' : 'bg-white ring-1 ring-gray-200')}>
            {t === 'edit' ? 'Write' : 'Preview'}
          </button>
        ))}
      </div>
      {tab === 'preview' ? (
        <Preview payload={{ type: 'page', ...p }} url={p.published ? '/' + oldSlug : undefined} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <Card title="English">
              <div className="space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                  <div>
                    <label className="admin-label">Small label above the title</label>
                    <input className="admin-input" placeholder="e.g. Visas" value={p.crumb} onChange={(e) => set('crumb', e.target.value)} />
                  </div>
                  <div>
                    <label className="admin-label">Title</label>
                    <input className="admin-input" value={p.title} onChange={(e) => set('title', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Line under the title</label>
                  <input className="admin-input" value={p.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Text</label>
                  <RichEditor value={p.body} onChange={(v) => set('body', v)} />
                </div>
              </div>
            </Card>
            <TranslationsPanel english={{ crumb: p.crumb, title: p.title, subtitle: p.subtitle, description: p.description, body: p.body }} fields={PAGE_FIELDS} tr={p.tr || {}} setTr={(t) => set('tr', t)} engine={engine} />
          </div>
          <div className="space-y-5">
            <Card title="Settings">
              <div className="space-y-3 p-5">
                <Toggle checked={!!p.published} onChange={(v) => set('published', v)} label="Show on the website" />
                <div>
                  <label className="admin-label">Address</label>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-gray-400">/</span>
                    <input className="admin-input" value={p.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Google description</label>
                  <textarea className="admin-input min-h-[70px]" value={p.description} onChange={(e) => set('description', e.target.value)} />
                </div>
                <div>
                  <label className="admin-label">Top picture (behind the title)</label>
                  <ImageInput value={p.image} onChange={(v) => set('image', v)} />
                </div>
                <Toggle checked={autoTr} onChange={setAutoTr} label="When the English changes, translate the other languages automatically" />
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <Btn
                  variant="danger"
                  onClick={async () => {
                    if (!(await confirmDialog(`Delete the page /${oldSlug} for good?`))) return;
                    await api(`${C}/page-delete`, 'POST', { slug: oldSlug });
                    toast('Page deleted');
                    onClose();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete page
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

/** HTML of a page (a website page or a copied page) */
function HtmlBox({ path, onSaved, allowReset, title }: { path: string; onSaved: () => void; allowReset: boolean; title?: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api(`${C}/page-html?path=${encodeURIComponent(path)}`).then((d) => {
      setHtml(d.html);
      setChanged(d.changed);
    });
  }, [path]);
  if (html === null) return <Spinner />;
  return (
    <Card
      title={title || 'HTML of this page'}
      actions={
        <div className="flex gap-2">
          {allowReset && changed && (
            <Btn
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!(await confirmDialog('Put the HTML back to the original page?'))) return;
                await api(`${C}/page-html`, 'POST', { path, reset: true });
                toast('Back to the original page');
                const d = await api(`${C}/page-html?path=${encodeURIComponent(path)}`);
                setHtml(d.html);
                setChanged(false);
                onSaved();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Original
            </Btn>
          )}
          <Btn
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`${C}/page-html`, 'POST', { path, html });
                setChanged(true);
                toast('HTML saved — live on the website');
                onSaved();
              } catch (e: any) {
                toast(e.message, 'error');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Save className="h-3.5 w-3.5" /> Save HTML
          </Btn>
        </div>
      }
    >
      <div className="p-4">
        <p className="mb-2 text-xs text-gray-500">The full page in English. Other languages translate its texts with the website&apos;s translations; new texts are translated with &quot;Translate new texts&quot;.</p>
        <textarea spellCheck={false} className="admin-input min-h-[60vh] font-mono text-[11px] leading-snug" value={html} onChange={(e) => setHtml(e.target.value)} />
      </div>
    </Card>
  );
}

function HtmlPageEditor({ page, engine, onClose }: { page: any; engine: { provider: string; problem: string } | null; onClose: () => void }) {
  const [p, setP] = useState<any>(page);
  const [oldSlug, setOldSlug] = useState(page.slug);
  const [busy, setBusy] = useState(false);
  const { run, busy: running, bar } = useLangRunner();
  async function save() {
    setBusy(true);
    try {
      const r = await api(`${C}/page`, 'POST', { ...p, oldSlug, html: undefined });
      setOldSlug(r.page.slug);
      toast('Saved');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageTitle
        title={`Page /${oldSlug}`}
        subtitle="A copied page, edited as HTML."
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Btn>
            <Btn
              variant="outline"
              disabled={running || !!engine?.problem}
              onClick={() =>
                run(OTHER_LANGS, async (l) => {
                  const d = await api(`${C}/translate`, 'POST', { kind: 'page', slug: oldSlug, lang: l, force: true });
                  if (!d.ok) throw new Error(d.error);
                })
              }
            >
              <Sparkles className="h-4 w-4" /> Translate new texts
            </Btn>
            <Btn onClick={save} loading={busy}>
              <Save className="h-4 w-4" /> Save settings
            </Btn>
          </div>
        }
      />
      <EngineNote engine={engine} />
      {bar && <div className="mb-4">{bar}</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <HtmlBox path={'/' + oldSlug} allowReset={false} onSaved={() => {}} />
        <Card title="Settings">
          <div className="space-y-3 p-5">
            <Toggle checked={!!p.published} onChange={(v) => setP({ ...p, published: v })} label="Show on the website" />
            <div>
              <label className="admin-label">Name in the admin</label>
              <input className="admin-input" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">Address</label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-gray-400">/</span>
                <input className="admin-input" value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
              </div>
            </div>
            <a href={'/' + oldSlug} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-gold-deep underline">
              Open the page <ExternalLink className="h-3 w-3" />
            </a>
            <div className="border-t border-gray-100 pt-3">
              <Btn
                variant="danger"
                onClick={async () => {
                  if (!(await confirmDialog(`Delete the page /${oldSlug} for good?`))) return;
                  await api(`${C}/page-delete`, 'POST', { slug: oldSlug });
                  toast('Page deleted');
                  onClose();
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete page
              </Btn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BuiltPageEditor({ d, engine, onClose, reload }: { d: any; engine: { provider: string; problem: string } | null; onClose: () => void; reload: () => void }) {
  const [tab, setTab] = useState<'texts' | 'settings' | 'html' | 'preview'>('texts');
  const [meta, setMeta] = useState<{ hidden?: boolean; title?: string; description?: string }>(d.meta || {});
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [allOf, setAllOf] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const { run, busy: running, bar } = useLangRunner();
  const path: string = d.path;
  const texts: { src: string; en: string; changed: boolean; done: number; pages: number }[] = d.texts;
  const shown = texts.filter((t) => !q || t.en.toLowerCase().includes(q.toLowerCase()));

  async function saveEnglish(src: string, value: string, follow: boolean) {
    setBusy(src);
    try {
      await api(`${C}/text`, 'POST', { src, values: { en: value } });
      toast(value.trim() ? 'English changed — live on the website' : 'Back to the original English');
      if (follow && value.trim() && !engine?.problem) {
        await run(OTHER_LANGS, async (l) => {
          const r = await api(`${C}/translate`, 'POST', { kind: 'text', src, lang: l });
          if (!r.ok) throw new Error(r.error);
        });
        toast('All languages follow the new English');
      }
      setDraft((x) => {
        const n = { ...x };
        delete n[src];
        return n;
      });
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  async function saveMeta(next: typeof meta, translate: boolean) {
    setBusy('meta');
    try {
      const r = await api(`${C}/page-meta`, 'POST', { path, ...next });
      setMeta(r.meta);
      toast('Saved — live on the website');
      if (translate && (next.title || next.description) && !engine?.problem) {
        await run(OTHER_LANGS, async (l) => {
          const x = await api(`${C}/translate`, 'POST', { kind: 'built', path, lang: l, force: true });
          if (!x.ok) throw new Error(x.error);
        });
        toast('Title and description translated');
      }
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  return (
    <div>
      <PageTitle
        title={d.title.split(' | ')[0] || path}
        subtitle={path}
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Btn>
            <a href={path} target="_blank" rel="noopener noreferrer">
              <Btn variant="outline">
                <ExternalLink className="h-4 w-4" /> Open
              </Btn>
            </a>
            <Btn
              variant={meta.hidden ? 'primary' : 'danger'}
              loading={busy === 'meta'}
              onClick={async () => {
                if (!meta.hidden && !(await confirmDialog(`Hide ${path} from the website in all languages? (It can be shown again any time.)`))) return;
                saveMeta({ ...meta, hidden: !meta.hidden }, false);
              }}
            >
              {meta.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {meta.hidden ? 'Show page again' : 'Hide page'}
            </Btn>
          </div>
        }
      />
      {meta.hidden && <div className="mb-4 rounded-xl bg-gray-100 p-3 text-sm font-semibold text-gray-700">This page is hidden: visitors get &quot;page not found&quot; and it is not in the sitemap.</div>}
      {bar && <div className="mb-4">{bar}</div>}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['texts', `Texts (${texts.length})`],
            ['settings', 'Title & Google'],
            ['html', 'HTML (advanced)'],
            ['preview', 'Preview'],
          ] as const
        ).map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('rounded-xl px-4 py-2 text-sm font-bold', tab === t ? 'bg-ink text-white' : 'bg-white ring-1 ring-gray-200')}>
            {label}
          </button>
        ))}
      </div>
      <EngineNote engine={engine} />
      {tab === 'texts' && (
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="admin-input pl-9" placeholder="Find a text on this page…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <p className="text-xs text-gray-500">Change the English and the other languages follow automatically — or open &quot;All languages&quot; to write each one yourself.</p>
          </div>
          <div className="max-h-[70vh] divide-y divide-gray-100 overflow-auto">
            {shown.map((t) => {
              const v = draft[t.src] ?? t.en;
              const long = t.en.length > 90;
              return (
                <div key={t.src} className="grid gap-2 p-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    {long ? (
                      <textarea className="admin-input min-h-[70px] text-sm" value={v} onChange={(e) => setDraft((x) => ({ ...x, [t.src]: e.target.value }))} />
                    ) : (
                      <input className="admin-input text-sm" value={v} onChange={(e) => setDraft((x) => ({ ...x, [t.src]: e.target.value }))} />
                    )}
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold">
                      {t.changed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">English changed</span>}
                      <span className={cn('rounded-full px-2 py-0.5', t.done >= 18 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600')}>{t.done + 1}/19 languages</span>
                      {t.pages > 1 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">on {t.pages} pages — a change shows on all of them</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <Btn size="sm" disabled={draft[t.src] === undefined || running} loading={busy === t.src} onClick={() => saveEnglish(t.src, v, true)}>
                      <Save className="h-3.5 w-3.5" /> Save
                    </Btn>
                    <Btn size="sm" variant="outline" onClick={() => setAllOf(t.src)}>
                      <Globe2 className="h-3.5 w-3.5" /> All languages
                    </Btn>
                    {t.changed && (
                      <Btn size="sm" variant="ghost" title="Original English" onClick={() => saveEnglish(t.src, '', false)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {tab === 'settings' && (
        <Card title="Browser title & Google description">
          <div className="space-y-3 p-5">
            <div>
              <label className="admin-label">Browser title (shown in Google results and on the browser tab)</label>
              <input className="admin-input" placeholder={d.title} value={meta.title || ''} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">Google description</label>
              <textarea className="admin-input min-h-[80px]" placeholder={d.description} value={meta.description || ''} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
            </div>
            <p className="text-xs text-gray-500">Leave empty to keep the original. A new title and description are translated into all languages automatically.</p>
            <Btn loading={busy === 'meta'} onClick={() => saveMeta(meta, true)}>
              <Save className="h-4 w-4" /> Save
            </Btn>
          </div>
        </Card>
      )}
      {tab === 'html' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Btn
              variant="outline"
              disabled={running || !!engine?.problem}
              onClick={() =>
                run(OTHER_LANGS, async (l) => {
                  const x = await api(`${C}/translate`, 'POST', { kind: 'built', path, lang: l });
                  if (!x.ok) throw new Error(x.error);
                })
              }
            >
              <Sparkles className="h-4 w-4" /> Translate new texts
            </Btn>
          </div>
          <HtmlBox path={path} allowReset onSaved={reload} />
        </div>
      )}
      {tab === 'preview' && <LivePreview path={path} />}
      <AllLanguagesModal src={allOf} engine={engine} onClose={() => setAllOf(null)} onSaved={reload} />
    </div>
  );
}

function LivePreview({ path }: { path: string }) {
  const [lang, setLang] = useState('');
  const [k, setK] = useState(0);
  const url = (lang ? '/' + lang : '') + (path === '/' && lang ? '' : path);
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Eye className="h-4 w-4" /> {url}
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <select className="admin-input !w-auto !py-1.5 text-xs" value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.keys(LANG_NAMES).map((l) => (
              <option key={l} value={l === 'en' ? '' : l}>
                {LANG_NAMES[l]}
              </option>
            ))}
          </select>
          <button type="button" className="text-xs font-bold text-gray-500 underline" onClick={() => setK((x) => x + 1)}>
            Refresh
          </button>
        </div>
      }
    >
      <iframe key={url + k} src={url} title="Preview" className="h-[75vh] w-full rounded-b-2xl bg-white" />
    </Card>
  );
}

/** One text of the website in all 19 languages */
function AllLanguagesModal({ src, engine, onClose, onSaved }: { src: string | null; engine: { provider: string; problem: string } | null; onClose: () => void; onSaved?: () => void }) {
  const [vals, setVals] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState('');
  useEffect(() => {
    setVals(null);
    if (src) api(`${C}/text?src=${encodeURIComponent(src)}`).then((d) => setVals(d.values));
  }, [src]);
  async function ai(l: string) {
    if (!vals) return;
    setAiBusy(l);
    try {
      const d = await api(`${C}/translate`, 'POST', { kind: 'fields', lang: l, fields: { title: vals.en } });
      if (!d.ok) throw new Error(d.error);
      setVals((v) => ({ ...v!, [l]: d.tr.title || v![l] }));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setAiBusy('');
    }
  }
  return (
    <Modal
      open={!!src}
      onClose={onClose}
      title="This text in every language"
      wide="xl"
      footer={
        <Btn
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`${C}/text`, 'POST', { src, values: vals });
              toast('Saved — live on the website');
              onSaved?.();
              onClose();
            } catch (e: any) {
              toast(e.message, 'error');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save className="h-4 w-4" /> Save all languages
        </Btn>
      }
    >
      {!vals ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-500">Original English: {src}</p>
          <EngineNote engine={engine} />
          {Object.keys(LANG_NAMES).map((l) => (
            <div key={l} className="grid items-start gap-2 sm:grid-cols-[110px_1fr_auto]">
              <span className="pt-2 text-xs font-bold text-gray-500">{LANG_NAMES[l]}</span>
              {(vals[l] || '').length > 80 || (vals.en || '').length > 80 ? (
                <textarea dir={RTL.has(l) ? 'rtl' : 'ltr'} className="admin-input min-h-[60px] text-sm" value={vals[l] || ''} onChange={(e) => setVals({ ...vals, [l]: e.target.value })} />
              ) : (
                <input dir={RTL.has(l) ? 'rtl' : 'ltr'} className="admin-input text-sm" value={vals[l] || ''} onChange={(e) => setVals({ ...vals, [l]: e.target.value })} />
              )}
              {l !== 'en' ? (
                <Btn size="sm" variant="ghost" title="Translate automatically" disabled={!!engine?.problem} loading={aiBusy === l} onClick={() => ai(l)}>
                  <Wand2 className="h-3.5 w-3.5" />
                </Btn>
              ) : (
                <span className="w-[34px]" />
              )}
            </div>
          ))}
          <p className="text-xs text-gray-500">Empty a field to go back to the website&apos;s original text in that language.</p>
        </div>
      )}
    </Modal>
  );
}

/* ================================================================ TRANSLATIONS */
const ENGINES = [
  { id: 'google', name: 'Google Translate', note: 'Free, no key needed. Good quality for short texts.' },
  { id: 'gemini', name: 'Google Gemini AI', note: 'Best natural wording. Needs a Gemini API key (aistudio.google.com).' },
  { id: 'claude', name: 'Claude AI', note: 'Very natural wording. Needs an Anthropic API key.' },
  { id: 'deepl', name: 'DeepL', note: 'Needs a DeepL key. No Hindi, Urdu or Croatian.' },
  { id: 'off', name: 'Off', note: 'No automatic translation; you write the languages yourself.' },
];

export function TranslationsAdmin() {
  const { engine, reload } = useEngine();
  const [cfg, setCfg] = useState<any>(null);
  const [savingCfg, setSavingCfg] = useState(false);
  const [test, setTest] = useState('');
  const [lang, setLang] = useState('ar');
  const [q, setQ] = useState('');
  const [page, setPage] = useState('');
  const [only, setOnly] = useState('');
  const [d, setD] = useState<any>(null);
  const [pages, setPages] = useState<{ path: string; title: string }[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [allOf, setAllOf] = useState<string | null>(null);
  const [bulk, setBulk] = useState<{ lang: string; left: number; done: number } | null>(null);
  const stop = useRef(false);

  useEffect(() => {
    api('/api/admin/settings/translation').then((r) => setCfg(r.value));
    api(`${C}/pages`).then((r) => setPages([...r.built.map((p: any) => ({ path: p.path, title: p.title })), ...r.custom.filter((p: any) => p.mode === 'html').map((p: any) => ({ path: p.path, title: p.title + ' (new)' }))]));
  }, []);
  const load = useCallback(async () => {
    const r = await api(`${C}/texts?lang=${lang}&q=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}&only=${only}`);
    setD(r);
    setDraft({});
  }, [lang, q, page, only]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function saveCfg() {
    setSavingCfg(true);
    try {
      // autoTranslate stays off here: it would re-translate content this website does not use
      await api('/api/admin/settings/translation', 'PUT', { value: { ...cfg, autoTranslate: false } });
      toast('Translation engine saved');
      reload();
      const r = await api('/api/admin/settings/translation');
      setCfg(r.value);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSavingCfg(false);
    }
  }
  async function runTest() {
    setTest('…');
    try {
      await api('/api/admin/settings/translation', 'PUT', { value: { ...cfg, autoTranslate: false } });
      reload();
      const r = await api('/api/admin/translations', 'POST', { action: 'test', locale: 'ar' });
      setTest('✓ ' + r.result);
    } catch (e: any) {
      setTest('✗ ' + e.message);
    }
  }
  async function save(src: string, value: string) {
    setBusy(src);
    try {
      await api(`${C}/text`, 'POST', { src, values: { [lang]: value } });
      toast(value.trim() ? 'Saved — live on the website' : 'Back to the original');
      if (lang === 'en' && value.trim() && !engine?.problem && (await confirmDialog('Translate the new English into the 18 other languages now?'))) {
        for (const l of OTHER_LANGS) {
          const r = await api(`${C}/translate`, 'POST', { kind: 'text', src, lang: l });
          if (!r.ok) {
            toast(r.error, 'error');
            break;
          }
        }
        toast('All languages follow the new English');
      }
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  async function ai(src: string, en: string) {
    setBusy('ai' + src);
    try {
      const r = await api(`${C}/translate`, 'POST', { kind: 'fields', lang, fields: { title: en } });
      if (!r.ok) throw new Error(r.error);
      setDraft((x) => ({ ...x, [src]: r.tr.title }));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  async function translateMissing(langs: string[]) {
    stop.current = false;
    for (const l of langs) {
      let left = 1;
      let done = 0;
      while (left > 0 && !stop.current) {
        setBulk({ lang: l, left, done });
        const r = await api(`${C}/translate`, 'POST', { kind: 'missing', lang: l });
        if (!r.ok) {
          toast(r.error, 'error');
          setBulk(null);
          return;
        }
        done += r.translated;
        left = r.remaining;
        if (!r.translated) break;
      }
      if (stop.current) break;
    }
    setBulk(null);
    toast('Missing translations filled in');
    load();
  }

  const eng = ENGINES.find((e) => e.id === cfg?.provider);
  return (
    <div>
      <PageTitle title="Translations" subtitle="Every text of the website in all 19 languages: search, correct by hand, or let the translation engine fill in what is missing. Changes are live at once." />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
            <select className="admin-input !w-auto" value={lang} onChange={(e) => setLang(e.target.value)}>
              {Object.keys(LANG_NAMES).map((l) => (
                <option key={l} value={l}>
                  {LANG_NAMES[l]}
                </option>
              ))}
            </select>
            <select className="admin-input !w-auto max-w-[260px]" value={page} onChange={(e) => setPage(e.target.value)}>
              <option value="">All pages</option>
              {pages.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.title} — {p.path}
                </option>
              ))}
            </select>
            <select className="admin-input !w-auto" value={only} onChange={(e) => setOnly(e.target.value)}>
              <option value="">All texts</option>
              {lang !== 'en' && <option value="missing">Not translated</option>}
              <option value="changed">Changed in the admin</option>
            </select>
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="admin-input pl-9" placeholder="Search English or this language…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          {d && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
              <span>
                {d.matches} of {d.total} texts{d.matches > 100 ? ' (first 100 shown — search to narrow)' : ''} · {d.changed} changed in {LANG_NAMES[lang]}
                {lang !== 'en' && ` · ${d.missing} not translated`}
              </span>
              {lang === 'en' && <span>English changes show in English; the other languages follow when you confirm.</span>}
            </div>
          )}
          {!d ? (
            <Spinner />
          ) : !d.strings.length ? (
            <Empty text="No text found" />
          ) : (
            <div className="divide-y divide-gray-100">
              {d.strings.map((s: any) => {
                const val = draft[s.src] ?? s.value;
                const long = s.en.length > 90;
                return (
                  <div key={s.src} className="grid gap-3 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">English{s.pages ? ` · on ${s.pages} page${s.pages > 1 ? 's' : ''}` : ''}</p>
                      <p className="mt-1 text-sm text-gray-700">{s.en}</p>
                      {s.changed && <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">changed</span>}
                      {!s.value && lang !== 'en' && <span className="mt-2 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">not translated — shows in English</span>}
                    </div>
                    <div>
                      {long ? (
                        <textarea dir={RTL.has(lang) ? 'rtl' : 'ltr'} className="admin-input min-h-[80px] text-sm" value={val} onChange={(e) => setDraft((x) => ({ ...x, [s.src]: e.target.value }))} />
                      ) : (
                        <input dir={RTL.has(lang) ? 'rtl' : 'ltr'} className="admin-input text-sm" value={val} onChange={(e) => setDraft((x) => ({ ...x, [s.src]: e.target.value }))} />
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Btn size="sm" disabled={draft[s.src] === undefined} loading={busy === s.src} onClick={() => save(s.src, val)}>
                          <Save className="h-3.5 w-3.5" /> Save
                        </Btn>
                        {lang !== 'en' && (
                          <Btn size="sm" variant="outline" disabled={!!engine?.problem} loading={busy === 'ai' + s.src} onClick={() => ai(s.src, s.en)}>
                            <Wand2 className="h-3.5 w-3.5" /> Translate
                          </Btn>
                        )}
                        <Btn size="sm" variant="ghost" onClick={() => setAllOf(s.src)}>
                          <Globe2 className="h-3.5 w-3.5" /> All languages
                        </Btn>
                        {s.changed && (
                          <Btn size="sm" variant="ghost" title="Original" onClick={() => save(s.src, '')}>
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Btn>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card
            title={
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Translation engine
              </span>
            }
          >
            {!cfg ? (
              <Spinner />
            ) : (
              <div className="space-y-3 p-5">
                <select className="admin-input" value={cfg.provider} onChange={(e) => setCfg({ ...cfg, provider: e.target.value })}>
                  {ENGINES.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                {eng && <p className="text-xs text-gray-500">{eng.note}</p>}
                {cfg.provider === 'gemini' && (
                  <>
                    <div>
                      <label className="admin-label">Gemini API key</label>
                      <input className="admin-input" type="password" autoComplete="off" value={cfg.geminiKey || ''} onChange={(e) => setCfg({ ...cfg, geminiKey: e.target.value })} />
                    </div>
                    <div>
                      <label className="admin-label">Model</label>
                      <input className="admin-input" value={cfg.geminiModel || ''} onChange={(e) => setCfg({ ...cfg, geminiModel: e.target.value })} />
                    </div>
                  </>
                )}
                {(cfg.provider === 'claude' || cfg.provider === 'deepl') && (
                  <div>
                    <label className="admin-label">{cfg.provider === 'claude' ? 'Anthropic API key' : 'DeepL API key'}</label>
                    <input className="admin-input" type="password" autoComplete="off" value={cfg.apiKey || ''} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} />
                  </div>
                )}
                {cfg.provider === 'claude' && (
                  <div>
                    <label className="admin-label">Model</label>
                    <input className="admin-input" value={cfg.model || ''} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Btn size="sm" loading={savingCfg} onClick={saveCfg}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </Btn>
                  <Btn size="sm" variant="outline" onClick={runTest}>
                    Test
                  </Btn>
                </div>
                {test && <p className={cn('rounded-lg p-2 text-sm', test.startsWith('✓') ? 'bg-emerald-50 text-emerald-800' : test === '…' ? 'bg-gray-50' : 'bg-red-50 text-red-700')}>{test}</p>}
                {engine?.problem && <p className="text-xs text-amber-700">{engine.problem}</p>}
              </div>
            )}
          </Card>
          <Card title="Fill in missing translations">
            <div className="space-y-3 p-5">
              <p className="text-xs text-gray-500">Texts without a translation show in English. The engine can translate them all; you can correct any of them afterwards.</p>
              {bulk ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">
                    {LANG_NAMES[bulk.lang]}: {bulk.done} done{bulk.left > 1 ? `, ${bulk.left} to go` : ''}…
                  </p>
                  <Btn size="sm" variant="ghost" onClick={() => (stop.current = true)}>
                    Stop
                  </Btn>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {lang !== 'en' && (
                    <Btn size="sm" variant="dark" disabled={!!engine?.problem} onClick={() => translateMissing([lang])}>
                      <Sparkles className="h-3.5 w-3.5" /> {LANG_NAMES[lang]} only
                    </Btn>
                  )}
                  <Btn size="sm" variant="outline" disabled={!!engine?.problem} onClick={() => translateMissing(OTHER_LANGS)}>
                    <Languages className="h-3.5 w-3.5" /> All 18 languages
                  </Btn>
                </div>
              )}
            </div>
          </Card>
          <Card title="Where else to translate">
            <div className="space-y-2 p-5 text-sm text-gray-600">
              <p>
                <b>Posts &amp; guides</b> and <b>new pages</b> have their own language tabs in their editor.
              </p>
              <p>
                <b>Website pages</b>: open a page in <a className="font-bold underline" href="/admin/site-pages">Pages</a> to change its texts — the other languages follow.
              </p>
              <a href="/admin/site-posts" className="inline-flex items-center gap-1 font-bold text-gold-deep underline">
                <Copy className="h-3.5 w-3.5" /> Posts &amp; guides
              </a>
            </div>
          </Card>
        </div>
      </div>
      <AllLanguagesModal src={allOf} engine={engine} onClose={() => setAllOf(null)} onSaved={load} />
    </div>
  );
}

