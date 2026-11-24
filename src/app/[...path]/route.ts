// Every website page and file of visit-saudi.ae (all languages): served exactly as before from site/public.
import fs from 'fs';
import path from 'path';
import { renderPage, NOT_FOUND_HTML, I18N_DIR, MIME } from '@/lib/vs/render';
import { readStored } from '@/lib/upload';
import { editsFor, getVs, stylingCss } from '@/lib/vs/store';
import { logView } from '@/lib/vs/apps';
import { payReturn } from '@/lib/vs/pay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sources = { edits: editsFor, guides: () => getVs('vs.guides'), styling: stylingCss };

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
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
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
