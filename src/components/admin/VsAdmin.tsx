'use client';
// Admin screens for the visit-saudi.ae website: page styling, website texts (19 languages), guides, news posts,
// reviews, visa prices & online payment, website stats, and the website card on an application.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Eye, RotateCcw, Save, Search, Trash2, Upload, Star, RefreshCw } from 'lucide-react';
import { Btn, Card, Empty, Modal, PageTitle, Spinner, Toggle, api, confirmDialog, toast } from './ui';
import { cn } from '@/lib/utils';

const LANG_NAMES: Record<string, string> = {
  en: 'English', ar: 'Arabic', ru: 'Russian', de: 'German', es: 'Spanish', fr: 'French', tr: 'Turkish', zh: 'Chinese', ur: 'Urdu', hi: 'Hindi',
  it: 'Italian', ro: 'Romanian', pt: 'Portuguese', pl: 'Polish', hu: 'Hungarian', hr: 'Croatian', sk: 'Slovak', cs: 'Czech', id: 'Indonesian',
};
const RTL = new Set(['ar', 'ur']);
const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

/* ---------------------------------------------------------------- Pages & styling */
const FONT_CHOICES = ['', 'Manrope', 'Inter', 'Poppins', 'Montserrat', 'Lato', 'Open Sans', 'Roboto', 'Nunito', 'Marcellus', 'Playfair Display', 'Cormorant Garamond', 'Cinzel', 'Lora', 'Tajawal', 'Cairo', 'Amiri'];

export function SitePagesAdmin() {
  const [d, setD] = useState<any>(null);
  const [pages, setPages] = useState<{ path: string; title: string; styled: boolean }[]>([]);
  const [st, setSt] = useState<{ vars: Record<string, string>; googleFonts: string[]; css: string; pages: Record<string, string> }>({ vars: {}, googleFonts: [], css: '', pages: {} });
  const [q, setQ] = useState('');
  const [page, setPage] = useState<string>('');
  const [preview, setPreview] = useState('/');
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    Promise.all([api('/api/admin/vs/styling'), api('/api/admin/vs/pages')]).then(([s, p]) => {
      setD(s);
      setPages(p.pages);
      const cur = s.styling || {};
      setSt({ vars: cur.vars || {}, googleFonts: cur.googleFonts || [], css: cur.css || '', pages: cur.pages || {} });
    });
  }, []);

  const filtered = useMemo(() => pages.filter((p) => !q || (p.path + ' ' + p.title).toLowerCase().includes(q.toLowerCase())), [pages, q]);
  const fontVar = (key: string, font: string, fallback: string) => (font ? `'${font}',${fallback}` : '');

  async function save() {
    setSaving(true);
    try {
      await api('/api/admin/vs/styling', 'POST', st);
      toast('Styling saved — live on the website');
      if (frame.current) frame.current.src = frame.current.src;
      setPages((ps) => ps.map((p) => ({ ...p, styled: !!st.pages[p.path]?.trim() })));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }
  if (!d) return <Spinner />;
  const vars: { key: string; label: string; def: string; kind: string }[] = d.vars;
  const font = (key: string) => {
    const v = st.vars[key] || '';
    const m = v.match(/^'([^']+)'/);
    return m ? m[1] : '';
  };
  const setFont = (key: string, f: string, fallback: string) =>
    setSt((s) => {
      const vars2 = { ...s.vars };
      const val = fontVar(key, f, fallback);
      if (val) vars2[key] = val;
      else delete vars2[key];
      const used = [font('--font-body'), font('--font-display')].map((x, i) => (i === (key === '--font-body' ? 0 : 1) ? f : x)).filter((x) => x && !['Manrope', 'Marcellus'].includes(x));
      return { ...s, vars: vars2, googleFonts: Array.from(new Set(used)) };
    });
  const previewUrl = (lang ? '/' + lang : '') + (preview === '/' && lang ? '' : preview);

  return (
    <div>
      <PageTitle
        title="Page styling"
        subtitle="The website looks exactly as designed until you change something here. Colours and fonts apply to every page in all 19 languages; extra CSS can target one page."
        actions={
          <Btn onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save styling
          </Btn>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <Card title="Colours">
            <div className="grid grid-cols-2 gap-3 p-5">
              {vars
                .filter((v) => v.kind === 'color')
                .map((v) => (
                  <label key={v.key} className="flex items-center gap-2 text-sm">
                    <input type="color" className="h-9 w-11 cursor-pointer rounded border border-gray-200" value={st.vars[v.key] || v.def} onChange={(e) => setSt((s) => ({ ...s, vars: { ...s.vars, [v.key]: e.target.value } }))} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{v.label}</span>
                      <span className="block font-mono text-[11px] text-gray-400">{st.vars[v.key] || v.def}</span>
                    </span>
                  </label>
                ))}
            </div>
            <div className="flex justify-end px-5 pb-4">
              <Btn size="sm" variant="ghost" onClick={() => setSt((s) => ({ ...s, vars: Object.fromEntries(Object.entries(s.vars).filter(([k]) => k.startsWith('--font') || k === '--radius')) }))}>
                <RotateCcw className="h-3.5 w-3.5" /> Original colours
              </Btn>
            </div>
          </Card>
          <Card title="Fonts & corners">
            <div className="space-y-3 p-5">
              <div>
                <label className="admin-label">Heading font</label>
                <select className="admin-input" value={font('--font-display')} onChange={(e) => setFont('--font-display', e.target.value, "Georgia,'Times New Roman',serif")}>
                  {FONT_CHOICES.map((f) => (
                    <option key={f} value={f}>
                      {f || 'Original (Marcellus)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label">Text font</label>
                <select className="admin-input" value={font('--font-body')} onChange={(e) => setFont('--font-body', e.target.value, "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif")}>
                  {FONT_CHOICES.map((f) => (
                    <option key={f} value={f}>
                      {f || 'Original (Manrope)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label">Corner roundness</label>
                <input type="range" min={0} max={32} className="w-full" value={parseInt(st.vars['--radius'] || '18', 10)} onChange={(e) => setSt((s) => ({ ...s, vars: { ...s.vars, '--radius': e.target.value + 'px' } }))} />
                <p className="text-xs text-gray-500">{st.vars['--radius'] || '18px'} (original 18px)</p>
              </div>
            </div>
          </Card>
          <Card title="Extra CSS for every page">
            <div className="p-5">
              <textarea className="admin-input min-h-[140px] font-mono text-xs" placeholder=".hero h1{letter-spacing:.5px}" value={st.css} onChange={(e) => setSt((s) => ({ ...s, css: e.target.value }))} />
            </div>
          </Card>
          <Card title={`Pages (${pages.length})`}>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input className="admin-input pl-9" placeholder="Find a page…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="max-h-[420px] divide-y divide-gray-100 overflow-auto rounded-xl ring-1 ring-gray-100">
                {filtered.slice(0, 400).map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => {
                      setPage(p.path);
                      setPreview(p.path);
                    }}
                    className={cn('flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50', page === p.path && 'bg-amber-50')}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.title}</span>
                      <span className="block truncate font-mono text-[11px] text-gray-400">{p.path}</span>
                    </span>
                    {st.pages[p.path]?.trim() && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">styled</span>}
                  </button>
                ))}
              </div>
            </div>
          </Card>
          {page && (
            <Card title={`CSS for ${page} only`}>
              <div className="space-y-2 p-5">
                <textarea className="admin-input min-h-[140px] font-mono text-xs" placeholder={`.hero{background-position:center 30%}`} value={st.pages[page] || ''} onChange={(e) => setSt((s) => ({ ...s, pages: { ...s.pages, [page]: e.target.value } }))} />
                <p className="text-xs text-gray-500">Applies to this page in every language. Save, then the preview reloads.</p>
              </div>
            </Card>
          )}
        </div>
        <Card
          title={
            <span className="flex flex-wrap items-center gap-2">
              <Eye className="h-4 w-4" /> Live preview <span className="font-mono text-xs text-gray-400">{previewUrl}</span>
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
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-gold-deep underline">
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          }
        >
          <iframe ref={frame} key={previewUrl} src={previewUrl} className="h-[78vh] w-full rounded-b-2xl bg-white" title="Preview" />
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Website texts */
export function SiteTextsAdmin() {
  const [lang, setLang] = useState('en');
  const [q, setQ] = useState('');
  const [d, setD] = useState<any>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const r = await api(`/api/admin/vs/texts?lang=${lang}&q=${encodeURIComponent(q)}`);
    setD(r);
    setDraft({});
  }, [lang, q]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  async function save(src: string, value: string) {
    setBusy(src);
    try {
      await api('/api/admin/vs/texts', 'POST', { lang, src, value });
      toast(value && value !== src ? 'Saved — live on the website' : 'Back to the original text');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  return (
    <div>
      <PageTitle title="Website texts" subtitle="Change any sentence of the website in any of the 19 languages. Search for the English text; the change shows on every page that uses it." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <select className="admin-input !w-auto" value={lang} onChange={(e) => setLang(e.target.value)}>
            {Object.keys(LANG_NAMES).map((l) => (
              <option key={l} value={l}>
                {LANG_NAMES[l]}
              </option>
            ))}
          </select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="admin-input pl-9" placeholder="Search a word or sentence (English or this language)…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {d && (
            <p className="text-xs text-gray-500">
              {d.matches} of {d.total} texts{d.matches > 80 ? ' (first 80 shown — search to narrow)' : ''} · {d.editedCount} changed in {LANG_NAMES[lang]}
            </p>
          )}
        </div>
        {!d ? (
          <Spinner />
        ) : !d.strings.length ? (
          <Empty text="No text found" />
        ) : (
          <div className="divide-y divide-gray-100">
            {d.strings.map((s: any) => {
              const val = draft[s.src] ?? s.current;
              const long = s.src.length > 90;
              return (
                <div key={s.src} className="grid gap-3 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">English original</p>
                    <p className="mt-1 text-sm text-gray-700">{s.src}</p>
                    {s.edited && <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">changed</span>}
                  </div>
                  <div>
                    {long ? (
                      <textarea dir={RTL.has(lang) ? 'rtl' : 'ltr'} className="admin-input min-h-[80px] text-sm" value={val} onChange={(e) => setDraft((x) => ({ ...x, [s.src]: e.target.value }))} />
                    ) : (
                      <input dir={RTL.has(lang) ? 'rtl' : 'ltr'} className="admin-input text-sm" value={val} onChange={(e) => setDraft((x) => ({ ...x, [s.src]: e.target.value }))} />
                    )}
                    <div className="mt-2 flex gap-2">
                      <Btn size="sm" disabled={draft[s.src] === undefined} loading={busy === s.src} onClick={() => save(s.src, val)}>
                        <Save className="h-3.5 w-3.5" /> Save
                      </Btn>
                      {s.edited && (
                        <Btn size="sm" variant="ghost" onClick={() => save(s.src, '')}>
                          <RotateCcw className="h-3.5 w-3.5" /> Original
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
    </div>
  );
}

/* ---------------------------------------------------------------- Guides */
export function GuidesAdmin() {
  const [list, setList] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api('/api/admin/vs/guides').then((d) => setList(d.guides));
  useEffect(() => {
    load();
  }, []);
  async function open(slug: string) {
    const d = await api(`/api/admin/vs/guides?slug=${slug}`);
    setEdit({ ...d.guide, body: d.bodyText, edited: d.edited, published: d.guide.published !== false });
  }
  async function save(reset = false) {
    setBusy(true);
    try {
      await api('/api/admin/vs/guides', 'POST', reset ? { slug: edit.slug, reset: true } : edit);
      toast(reset ? 'Guide back to the original' : 'Guide saved — live on the website');
      setEdit(null);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  const shown = (list || []).filter((g) => !q || (g.title + ' ' + g.cat + ' ' + g.slug).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageTitle title="Guides" subtitle="The 68 travel and visa guides of the website. Edit the title, summary, picture and text, or hide a guide. Translations keep using the original texts until changed in Website texts." />
      <Card>
        <div className="border-b border-gray-100 p-4">
          <input className="admin-input" placeholder="Find a guide…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {!list ? (
          <Spinner />
        ) : (
          <div className="divide-y divide-gray-100">
            {shown.map((g) => (
              <div key={g.slug} className="flex items-center gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.image ? <img src={g.image} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" /> : <div className="h-14 w-20 shrink-0 rounded-lg bg-gray-100" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.title}</p>
                  <p className="truncate text-xs text-gray-500">
                    {g.cat} · /guides/{g.slug}
                  </p>
                </div>
                {g.edited && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">edited</span>}
                {!g.published && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">hidden</span>}
                <a href={`/guides/${g.slug}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Btn size="sm" variant="outline" onClick={() => open(g.slug)}>
                  Edit
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Edit guide"
        wide
        footer={
          edit && (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {edit.edited ? (
                <Btn variant="ghost" onClick={async () => (await confirmDialog('Put this guide back to the original text?')) && save(true)}>
                  <RotateCcw className="h-4 w-4" /> Original
                </Btn>
              ) : (
                <span />
              )}
              <Btn onClick={() => save()} loading={busy}>
                <Save className="h-4 w-4" /> Save guide
              </Btn>
            </div>
          )
        }
      >
        {edit && (
          <div className="space-y-3">
            <div>
              <label className="admin-label">Title</label>
              <input className="admin-input" value={edit.title || ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="admin-label">Category</label>
                <input className="admin-input" value={edit.cat || ''} onChange={(e) => setEdit({ ...edit, cat: e.target.value })} />
              </div>
              <div>
                <label className="admin-label">Card picture (link)</label>
                <input className="admin-input" value={edit.image || ''} onChange={(e) => setEdit({ ...edit, image: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="admin-label">Summary (search results and the guide card)</label>
              <textarea className="admin-input min-h-[70px]" value={edit.excerpt || ''} onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">Text — "## " starts a section, "### " a sub-heading, an empty line a new paragraph</label>
              <textarea className="admin-input min-h-[360px] font-mono text-xs" value={edit.body || ''} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            </div>
            <Toggle checked={edit.published !== false} onChange={(v) => setEdit({ ...edit, published: v })} label="Show this guide on the website" />
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------- News posts */
export function NewsAdmin() {
  const [posts, setPosts] = useState<any[] | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api('/api/admin/vs/blog').then((d) => setPosts(d.posts));
  useEffect(() => {
    load();
  }, []);
  async function save() {
    setBusy(true);
    try {
      await api('/api/admin/vs/blog', 'POST', edit);
      toast('Post saved');
      setEdit(null);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageTitle
        title="News posts"
        subtitle="Short news shown with the guides on the website."
        actions={<Btn onClick={() => setEdit({ title: '', cat: 'News', excerpt: '', body: '', image: '', published: true })}>New post</Btn>}
      />
      <Card>
        {!posts ? (
          <Spinner />
        ) : !posts.length ? (
          <Empty text="No news posts yet" />
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((p) => (
              <div key={p.slug} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="text-xs text-gray-500">
                    {p.cat} · {p.date} {p.published === false && '· hidden'}
                  </p>
                </div>
                <Btn size="sm" variant="outline" onClick={() => setEdit(p)}>
                  Edit
                </Btn>
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (!(await confirmDialog('Delete this post?'))) return;
                    await api('/api/admin/vs/blog', 'POST', { delete: p.slug });
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
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.slug ? 'Edit post' : 'New post'} wide footer={<Btn onClick={save} loading={busy}>Save post</Btn>}>
        {edit && (
          <div className="space-y-3">
            <input className="admin-input" placeholder="Title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="admin-input" placeholder="Category" value={edit.cat} onChange={(e) => setEdit({ ...edit, cat: e.target.value })} />
              <input className="admin-input" placeholder="Picture link" value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} />
            </div>
            <textarea className="admin-input min-h-[70px]" placeholder="Summary" value={edit.excerpt} onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })} />
            <textarea className="admin-input min-h-[260px]" placeholder="Text" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            <Toggle checked={edit.published !== false} onChange={(v) => setEdit({ ...edit, published: v })} label="Published" />
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------- Reviews */
export function ReviewsAdmin() {
  const [list, setList] = useState<any[] | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const load = () => api('/api/admin/vs/reviews').then((d) => setList(d.reviews));
  useEffect(() => {
    load();
  }, []);
  const act = async (body: any) => {
    const d = await api('/api/admin/vs/reviews', 'POST', body);
    setList(d.reviews);
  };
  return (
    <div>
      <PageTitle
        title="Reviews"
        subtitle="Only real reviews from real clients. The reviews section shows on the website only when at least one visible review exists."
        actions={<Btn onClick={() => setEdit({ name: '', country: '', visa: '', rating: 5, text: '', visible: true })}>Add review</Btn>}
      />
      <Card>
        {!list ? (
          <Spinner />
        ) : !list.length ? (
          <Empty text="No reviews yet" />
        ) : (
          <div className="divide-y divide-gray-100">
            {list.map((r, i) => (
              <div key={i} className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.name} <span className="text-xs font-normal text-gray-500">{[r.country, r.visa, r.date].filter(Boolean).join(' · ')}</span>
                  </p>
                  <p className="my-1 flex text-amber-500">
                    {Array.from({ length: r.rating }).map((_, k) => (
                      <Star key={k} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </p>
                  <p className="text-sm text-gray-700">{r.text}</p>
                </div>
                <Toggle checked={r.visible !== false} onChange={() => act({ toggle: i })} label="Visible" />
                <Btn size="sm" variant="outline" onClick={() => setEdit({ ...r, index: i })}>
                  Edit
                </Btn>
                <Btn size="sm" variant="danger" onClick={async () => (await confirmDialog('Delete this review?')) && act({ remove: i })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.index !== undefined ? 'Edit review' : 'Add review'}
        footer={
          <Btn
            onClick={async () => {
              try {
                await act(edit);
                setEdit(null);
                toast('Review saved');
              } catch (e: any) {
                toast(e.message, 'error');
              }
            }}
          >
            Save
          </Btn>
        }
      >
        {edit && (
          <div className="space-y-3">
            <input className="admin-input" placeholder="Client name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-3">
              <input className="admin-input" placeholder="Country" value={edit.country} onChange={(e) => setEdit({ ...edit, country: e.target.value })} />
              <input className="admin-input" placeholder="Visa" value={edit.visa} onChange={(e) => setEdit({ ...edit, visa: e.target.value })} />
              <select className="admin-input" value={edit.rating} onChange={(e) => setEdit({ ...edit, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </div>
            <textarea className="admin-input min-h-[120px]" placeholder="Review text" value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
            <Toggle checked={edit.visible !== false} onChange={(v) => setEdit({ ...edit, visible: v })} label="Show on the website" />
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------- Visa prices & online payment */
const PRICE_LABELS: Record<string, string> = {
  'one-year-multiple': '1 Year Multiple Entry Visa',
  'ninety-day-multiple': '90 Days Multiple Entry Visa',
  umrah: 'Umrah Visa',
  tourist: 'Tourist eVisa',
  family: 'Family & Friends Visit Visa',
  business: 'Business Visit Visa',
  medical: 'Medical Treatment Visa',
  personal: 'Personal Visit Visa',
  transit: 'Stopover Transit Visa',
};
export function PricesAdmin() {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/api/admin/vs/site').then(setD);
  }, []);
  if (!d) return <Spinner />;
  const s = d.site;
  const set = (patch: any) => setD({ ...d, site: { ...s, ...patch } });
  const price = (k: string) => s.prices?.[k] || { amount: '', currency: 'USD' };
  async function save() {
    setBusy(true);
    try {
      await api('/api/admin/vs/site', 'POST', s);
      toast('Saved — live on the website');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageTitle
        title="Visa prices & pay online"
        subtitle="Visas with a price get a “Pay now” button after applying and on the tracking page. Visas without a price get their total confirmed in writing first."
        actions={
          <Btn onClick={save} loading={busy}>
            <Save className="h-4 w-4" /> Save
          </Btn>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Prices shown on the website">
          <div className="divide-y divide-gray-100">
            {Object.keys(PRICE_LABELS).map((k) => (
              <div key={k} className="flex items-center gap-3 px-5 py-3">
                <p className="min-w-0 flex-1 text-sm font-semibold">{PRICE_LABELS[k]}</p>
                <input
                  className="admin-input !w-28"
                  type="number"
                  min={0}
                  placeholder="no price"
                  value={price(k).amount}
                  onChange={(e) => set({ prices: { ...s.prices, [k]: { ...price(k), amount: e.target.value } } })}
                />
                <select className="admin-input !w-24" value={price(k).currency} onChange={(e) => set({ prices: { ...s.prices, [k]: { ...price(k), currency: e.target.value } } })}>
                  {['USD', 'AED', 'SAR', 'EUR'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Pay online (Ziina)">
            <div className="space-y-3 p-5">
              <Toggle checked={!!s.payments?.enabled && s.payments?.provider === 'ziina'} onChange={(v) => set({ payments: { enabled: v, provider: v ? 'ziina' : '' } })} label="Show “Pay now” for visas with a price" />
              <p className={cn('rounded-lg p-3 text-xs', d.ziinaKeySet ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
                {d.ziinaKeySet ? 'Ziina key is set (from the server or Admin → Online payments).' : 'No Ziina key yet: add it in Admin → Online payments (or ZIINA_API_KEY on the server). Payments stay off until then.'}
              </p>
              <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800">
                Never register a Ziina webhook for this site: the Ziina account allows one webhook and Dubai Visa Portal uses it. Payments here are confirmed by checking Ziina when the client returns, on the tracking page, and with “Check payment” on the application.
              </p>
            </div>
          </Card>
          <Card title="Contact on the website">
            <div className="space-y-3 p-5">
              <div>
                <label className="admin-label">WhatsApp number (digits, with country code)</label>
                <input className="admin-input" value={s.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
              </div>
              <div>
                <label className="admin-label">Email shown on the website</label>
                <input className="admin-input" value={s.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Website stats */
export function SiteStatsAdmin() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    api('/api/admin/vs/stats').then(setD);
  }, []);
  if (!d) return <Spinner />;
  const days = Object.entries(d.days as Record<string, number>).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-30);
  const max = Math.max(1, ...days.map((x) => x[1]));
  const f = d.funnel;
  return (
    <div>
      <PageTitle title="Website stats" subtitle="Last 90 days: page views, eligibility checks, applications and WhatsApp clicks." />
      <div className="mb-5 grid gap-4 sm:grid-cols-5">
        {[
          ['Page views', f.view],
          ['Eligibility checks', f.checker],
          ['Applications started', f.apply_start],
          ['Applications sent', f.apply_done],
          ['WhatsApp clicks', f.whatsapp],
        ].map(([k, v]) => (
          <Card key={k as string}>
            <div className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{k}</p>
              <p className="mt-1 text-2xl font-bold">{Number(v).toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>
      <Card title="Page views per day (last 30 days)">
        <div className="flex h-48 items-end gap-1 p-5">
          {days.map(([day, n]) => (
            <div key={day} className="group relative flex-1" title={`${day}: ${n}`}>
              <div className="rounded-t bg-emerald-700/80" style={{ height: `${Math.max(2, (n / max) * 160)}px` }} />
            </div>
          ))}
          {!days.length && <p className="text-sm text-gray-500">No visits recorded yet.</p>}
        </div>
      </Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {[
          ['Top pages', d.topPages],
          ['Nationalities checked', d.topNats],
          ['Languages', (d.langs || []).map((x: any) => ({ k: LANG_NAMES[x.k] || x.k, v: x.v }))],
        ].map(([title, rows]) => (
          <Card key={title as string} title={title as string}>
            <div className="divide-y divide-gray-100">
              {(rows as any[]).map((r) => (
                <div key={r.k} className="flex justify-between gap-3 px-5 py-2 text-sm">
                  <span className="truncate">{r.k}</span>
                  <b>{r.v}</b>
                </div>
              ))}
              {!(rows as any[]).length && <p className="p-5 text-sm text-gray-500">Nothing yet.</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Website card on an application */
export function VsFileCard({ id }: { id: string }) {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [res, setRes] = useState<any>(null);
  const issuedRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const load = useCallback(() => api(`/api/admin/vs-file/${id}`).then((x) => {
    setD(x);
    setRes(x.vs?.resolution || { status: '', amount: '', date: '', comment: '' });
  }), [id]);
  useEffect(() => {
    load();
  }, [load]);
  async function act(body: any, msg: string) {
    setBusy(body.action);
    try {
      const x = await api(`/api/admin/vs-file/${id}`, 'POST', body);
      setD(x);
      toast(msg);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  if (!d) return null;
  const vs = d.vs || {};
  const pay = vs.pay || {};
  return (
    <Card title="Website application (visit-saudi.ae)">
      <div className="space-y-4 p-5 text-sm">
        {d.website && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-xs">
            <span className="text-gray-500">Visa</span>
            <b>{d.visa}</b>
            {vs.entry && (
              <>
                <span className="text-gray-500">Entry / exit</span>
                <b>
                  {vs.entry}
                  {vs.exit ? ` → ${vs.exit}` : ''}
                </b>
              </>
            )}
            {vs.passexp && (
              <>
                <span className="text-gray-500">Passport expiry</span>
                <b>{vs.passexp}</b>
              </>
            )}
            {vs.prof && (
              <>
                <span className="text-gray-500">Profession</span>
                <b>{vs.prof}</b>
              </>
            )}
            {vs.city && (
              <>
                <span className="text-gray-500">City</span>
                <b>{vs.city}</b>
              </>
            )}
            {vs.purpose && (
              <>
                <span className="text-gray-500">Purpose</span>
                <b>{vs.purpose}</b>
              </>
            )}
            <span className="text-gray-500">Express</span>
            <b>{vs.express ? 'Yes' : 'No'}</b>
          </div>
        )}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Website payment</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', d.paid ? 'bg-emerald-100 text-emerald-800' : pay.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600')}>
              {d.paid ? `Paid ${pay.amountPaid || ''}` : pay.status === 'pending' ? 'Payment started' : pay.status === 'failed' ? 'Cancelled / failed' : 'Not paid online'}
            </span>
            {!!pay.intent && !d.paid && (
              <Btn size="sm" variant="outline" loading={busy === 'checkPayment'} onClick={() => act({ action: 'checkPayment' }, 'Checked with Ziina')}>
                <RefreshCw className="h-3.5 w-3.5" /> Check payment
              </Btn>
            )}
          </div>
        </div>
        <div>
          <label className="admin-label">Official application number (shown on the tracking page)</label>
          <div className="flex gap-2">
            <input className="admin-input" defaultValue={vs.officialRef || ''} id={`oref-${id}`} />
            <Btn size="sm" loading={busy === 'officialRef'} onClick={() => act({ action: 'officialRef', value: (document.getElementById(`oref-${id}`) as HTMLInputElement).value }, 'Saved')}>
              Save
            </Btn>
          </div>
        </div>
        <div>
          <label className="admin-label">Note for the client on the tracking page</label>
          <div className="flex gap-2">
            <input className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Your photo was replaced with a better one" />
            <Btn size="sm" disabled={!note.trim()} loading={busy === 'clientNote'} onClick={() => act({ action: 'clientNote', value: note }, 'Note added').then(() => setNote(''))}>
              Add
            </Btn>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Issued eVisa</p>
          {vs.issuedDoc ? (
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{vs.issuedDoc.name}</span>
              <Btn size="sm" variant="ghost" onClick={() => act({ action: 'issued', remove: true }, 'Removed from the tracking page')}>
                <Trash2 className="h-3.5 w-3.5" />
              </Btn>
            </div>
          ) : (
            <p className="text-xs text-gray-500">The client downloads it from the tracking page and the dashboard.</p>
          )}
          <input
            ref={issuedRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              await act({ action: 'issued', data: await fileToDataUrl(f), name: f.name, notify: true }, 'eVisa uploaded — the client is told');
              e.target.value = '';
            }}
          />
          <Btn size="sm" variant="outline" className="mt-2" loading={busy === 'issued'} onClick={() => issuedRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload eVisa
          </Btn>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Refund / resolution (shown on the tracking page)</p>
          {res && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select className="admin-input" value={res.status} onChange={(e) => setRes({ ...res, status: e.target.value })}>
                  {['', 'Refund approved', 'Refund processed', 'Additional documents requested', 'Case resolved', 'Other update'].map((o) => (
                    <option key={o} value={o}>
                      {o || 'None — nothing shown'}
                    </option>
                  ))}
                </select>
                <input className="admin-input" placeholder="Amount" value={res.amount} onChange={(e) => setRes({ ...res, amount: e.target.value })} />
                <input className="admin-input" type="date" value={res.date} onChange={(e) => setRes({ ...res, date: e.target.value })} />
              </div>
              <textarea className="admin-input min-h-[56px]" placeholder="Comment for the client" value={res.comment} onChange={(e) => setRes({ ...res, comment: e.target.value })} />
              <input ref={proofRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-xs" />
              <Btn
                size="sm"
                loading={busy === 'resolution'}
                onClick={async () => {
                  const f = proofRef.current?.files?.[0];
                  await act({ action: 'resolution', ...res, proofData: f ? await fileToDataUrl(f) : '', proofName: f?.name || '' }, 'Saved');
                }}
              >
                Save resolution
              </Btn>
              {res.proof && <p className="text-xs text-gray-500">Proof: {res.proof.name}</p>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
