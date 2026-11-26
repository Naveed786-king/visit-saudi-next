// Every website page and file of visit-saudi.ae (all languages): served exactly as before from site/public.
import fs from 'fs';
import path from 'path';
import { renderPage, NOT_FOUND_HTML, I18N_DIR, MIME, LANG_LIST } from '@/lib/vs/render';
import { siteSources } from '@/lib/vs/sources';
import { markPlaces } from '@/lib/vs/visual-core';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';
import { readStored } from '@/lib/upload';
import { editsFor, getVs, stylingCss } from '@/lib/vs/store';
import { logView } from '@/lib/vs/apps';
import { payReturn } from '@/lib/vs/pay';
import { getChatConfig, widgetConfig } from '@/lib/chatbot/config';

// The AI assistant (Admin → Website chat): only when switched on, its script takes over the site's own chat panel
const chatCache: { at: number; on: boolean; cfg: Awaited<ReturnType<typeof getChatConfig>> | null } = { at: 0, on: false, cfg: null };
async function withChat(html: string, pathname: string) {
  if (Date.now() - chatCache.at > 15_000) {
    const cfg = await getChatConfig().catch(() => null);
    chatCache.at = Date.now();
    chatCache.cfg = cfg;
    chatCache.on = !!cfg?.enabled;
  }
  if (!chatCache.on || !chatCache.cfg || !html.includes('id="chatPanel"')) return html;
  const lang = (pathname.match(/^\/(ar|ru|de|es|fr|tr|zh|ur|hi|it|ro|pt|pl|hu|hr|sk|cs|id)(\/|$)/) || [])[1] || 'en';
  const conf = JSON.stringify(widgetConfig(chatCache.cfg, lang)).replace(/</g, '\\u003c');
  const tag = `<script>window.VS_CHAT=${conf}</script><script src="/vs-chat.js?v=3" defer></script>`;
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + tag : html.slice(0, i) + tag + html.slice(i);
}

/** The apply page (every language): steps on top, a password for the client dashboard, "Open your dashboard" at the end */
const APPLY_RE = /^\/((ar|ru|de|es|fr|tr|zh|ur|hi|it|ro|pt|pl|hu|hr|sk|cs|id)\/)?apply\/?$/;
const APPLY_TAG = '<script src="/vs-apply.js?v=1" defer></script>';
function withApplySteps(html: string, pathname: string) {
  if (!APPLY_RE.test(pathname) || !html.includes('id="wizard"')) return html;
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + APPLY_TAG : html.slice(0, i) + APPLY_TAG + html.slice(i);
}

/** Header: the account icon in place of "Track Application" (signed in: the dashboard, otherwise sign-in),
 * and the restyled language and currency buttons (vs-header.css / vs-header.js) */
const ACCT_LABEL: Record<string, string> = { en: 'My account', ar: 'حسابي', ru: 'Мой аккаунт', de: 'Mein Konto', es: 'Mi cuenta', fr: 'Mon compte', tr: 'Hesabım', zh: '我的账户', ur: 'میرا اکاؤنٹ', hi: 'मेरा खाता', it: 'Il mio account', ro: 'Contul meu', pt: 'A minha conta', pl: 'Moje konto', hu: 'Fiókom', hr: 'Moj račun', sk: 'Môj účet', cs: 'Můj účet', id: 'Akun saya' };
const ACCT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
const HEADER_CSS = '<link rel="stylesheet" href="/vs-header.css?v=2">';
const HEADER_JS = '<script src="/vs-header.js?v=1" defer></script>';
function withHeader(html: string, pathname: string) {
  const re = /<a class="nav-track mtrk" href="[^"]*">[\s\S]*?<\/a>/;
  if (!re.test(html)) return html;
  const lang = (pathname.match(/^\/(ar|ru|de|es|fr|tr|zh|ur|hi|it|ro|pt|pl|hu|hr|sk|cs|id)(\/|$)/) || [])[1] || 'en';
  const label = ACCT_LABEL[lang] || ACCT_LABEL.en;
  let out = html.replace(re, `<a class="vs-acct" href="/portal" aria-label="${label}" title="${label}">${ACCT_SVG}</a>`);
  const h = out.indexOf('</head>');
  if (h >= 0) out = out.slice(0, h) + HEADER_CSS + out.slice(h);
  const b = out.lastIndexOf('</body>');
  return b < 0 ? out + HEADER_JS : out.slice(0, b) + HEADER_JS + out.slice(b);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sources = siteSources;

async function handle(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  // Ziina sends visitors back to /pay/success or /<lang>/pay/success
  const pm = pathname.match(/^(?:\/[a-z]{2})?\/pay\/(success|cancel)$/);
  if (pm) return payReturn(pm[1] as 'success' | 'cancel', url);
  // translation dictionaries used by the site's script
  const im = pathname.match(/^\/i18n\/([a-z]{2})\.json$/);
  if (im) {
    const fp = path.join(I18N_DIR, im[1] + '.json');
    if (!fs.existsSync(fp)) return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    // texts changed or added in Admin → Translations also reach the texts the site's script shows
    const ed = await editsFor(im[1]);
    if (Object.keys(ed).length) {
      try {
        const merged = { ...JSON.parse(fs.readFileSync(fp, 'utf8')), ...ed };
        return new Response(JSON.stringify(merged), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
      } catch {
        /* unreadable file: serve as it is */
      }
    }
    return new Response(fs.readFileSync(fp), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
  }
  // pictures from Admin → Media library
  const mm = pathname.match(/^\/media\/([A-Za-z0-9._-]+)$/);
  if (mm) {
    const buf = await readStored('media/' + mm[1]);
    if (!buf) return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    return new Response(new Uint8Array(buf), { headers: { 'Content-Type': MIME[path.extname(mm[1]).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' } });
  }
  // the old secret admin address opens the new admin
  if (pathname === '/manage-jg0ojxafgt') return new Response(null, { status: 302, headers: { Location: '/admin/login' } });
  try {
    const r = await renderPage(pathname, url.search, sources);
    if (r.kind === 'redirect') return new Response(null, { status: r.status, headers: { Location: r.location } });
    if (r.kind === 'file') {
      const body = fs.readFileSync(r.path);
      return new Response(new Uint8Array(body), { status: 200, headers: { 'Content-Type': r.mime, 'Cache-Control': r.cache } });
    }
    if (r.status === 200 && req.method === 'GET') logView(pathname).catch(() => {});
    if (r.status === 200 && !r.mime) r.body = await withChat(withApplySteps(withHeader(r.body, pathname), pathname), pathname);
    // Admin → Pages → Visual editor: the page with the place of every element and the editor's script (team only)
    if (r.status === 200 && !r.mime && url.searchParams.get('vs-edit') === '1') {
      const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value).catch(() => null);
      if (s && (s.role === 'ADMIN' || s.role === 'EDITOR')) {
        let body = markPlaces(r.body);
        // the site's script sends a page to the visitor's last language: in the editor the page stays in its own language
        const pl = (pathname.match(/^\/([a-z]{2})(\/|$)/) || [])[1] || 'en';
        const keep = `<script>try{localStorage.setItem("vsa_lang","${LANG_LIST.includes(pl) ? pl : 'en'}")}catch(e){}</script>`;
        const hd = body.search(/<head[^>]*>/i);
        if (hd >= 0) {
          const he = body.indexOf('>', hd) + 1;
          body = body.slice(0, he) + keep + body.slice(he);
        }
        const tag = `<script src="/vs-edit.js?v=5" data-langs="${LANG_LIST.join(',')}" defer></script>`;
        const i = body.lastIndexOf('</body>');
        body = i < 0 ? body + tag : body.slice(0, i) + tag + body.slice(i);
        return new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
      }
    }
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': r.mime || 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
  } catch (e) {
    console.error('[page]', pathname, (e as Error).message);
    return new Response(NOT_FOUND_HTML, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

export const GET = handle;
export async function HEAD(req: Request) {
  const r = await handle(req);
  return new Response(null, { status: r.status, headers: r.headers });
}
