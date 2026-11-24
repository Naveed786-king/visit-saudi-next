// Small helpers for the website's own API answers (same JSON as the old server)
export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    const len = Number(req.headers.get('content-length') || 0);
    if (len > 14 * 1024 * 1024) return {};
    const t = await req.text();
    if (t.length > 14 * 1024 * 1024) return {};
    const v = JSON.parse(t || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
