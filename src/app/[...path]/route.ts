// Every website page and file of visit-saudi.ae (all languages): served exactly as before from site/public.
import fs from 'fs';
import path from 'path';
import { renderPage, NOT_FOUND_HTML, I18N_DIR, MIME } from '@/lib/vs/render';
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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function extra() {
  const [pages, posts, meta, html, chrome] = await Promise.all([getVs('vs.pages'), getVs('vs.posts'), getVs('vs.pageMeta'), getVs('vs.html'), getVs('vs.chrome')]);
  return { pages, posts, meta, html, chrome };
}
const sources = { edits: editsFor, guides: () => getVs('vs.guides'), styling: stylingCss, extra };

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
    if (r.status === 200 && !r.mime) r.body = await withChat(r.body, pathname);
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
