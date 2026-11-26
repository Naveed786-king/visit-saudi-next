// The visual editor end to end: the page in edit mode (team only), a text, a colour, a picture and a hidden
// part saved and shown on the website (style and picture in every language), then everything undone.
// Usage: node scripts/ci/visual-test.mjs http://localhost:3000
const BASE = process.argv[2] || 'http://localhost:3000';
let failed = 0;
const expect = (label, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && extra ? ' — ' + extra : ''}`);
  if (!cond) failed++;
};
let cookie = '';
async function call(method, p, body) {
  const r = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const c = r.headers.getSetCookie?.() || [];
  if (c.length) cookie = c.map((x) => x.split(';')[0]).join('; ');
  const text = await r.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {}
  return { status: r.status, text, data };
}
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function page(p, want, tries = 12) {
  let t = '';
  for (let i = 0; i < tries; i++) {
    t = await (await fetch(BASE + p)).text();
    if (want(t)) return t;
    await wait(1000);
  }
  return t;
}

let r = await call('GET', '/?vs-edit=1');
expect('edit mode needs a team login', !r.text.includes('data-vsp=') && !r.text.includes('vs-edit.js'));
await call('POST', '/api/auth/login', { email: 'admin@example.com', password: 'CiPassword123', admin: true });
r = await call('GET', '/?vs-edit=1');
expect('edit mode marks every element and loads the editor', r.text.includes('data-vsp="') && r.text.includes('/vs-edit.js'));
expect('edit mode keeps the page in its own language', r.text.includes('localStorage.setItem("vsa_lang","en")'));
const tagKey = (html, re) => (re.exec(html) || [])[1];
const h1 = tagKey(r.text, /<h1\b[^>]*data-vsp="([\d.]+)"/);
const img = tagKey(r.text, /<img\b[^>]*data-vsp="([\d.]+)"/);
const p = tagKey(r.text, /<p\b[^>]*data-vsp="([\d.]+)"/);
expect('found a heading, a picture and a paragraph', !!(h1 && img && p), `${h1} ${img} ${p}`);

r = await call('POST', '/api/admin/visual', { path: '/', lang: 'en', key: h1, text: 'CI <b>visual</b> heading <script>x</script>', style: { color: '#ff0000', 'font-size': '44px', 'background-image': 'url(javascript:alert(1))' } });
expect('text and design saved', r.status === 200 && r.data?.ok, r.text.slice(0, 200));
expect('unsafe parts removed', !JSON.stringify(r.data?.item || {}).includes('script') && !JSON.stringify(r.data?.item || {}).includes('javascript'), JSON.stringify(r.data?.item));
r = await call('POST', '/api/admin/visual', { path: '/', lang: 'en', key: img, img: { src: '/assets/logo.svg', alt: 'CI picture' } });
expect('picture saved', r.status === 200 && r.data?.ok, r.text.slice(0, 200));
r = await call('POST', '/api/admin/visual', { path: '/', lang: 'en', key: p, hidden: true });
expect('hidden saved', r.status === 200 && r.data?.ok, r.text.slice(0, 200));

const en = await page('/', (t) => t.includes('CI <b>visual</b> heading'));
expect('English page shows the new text', en.includes('CI <b>visual</b> heading'));
expect('English page shows the colour and size', /color:#ff0000 !important;font-size:44px !important/.test(en));
expect('English page shows the new picture', /<img\b[^>]*src="\/assets\/logo.svg"[^>]*alt="CI picture"|<img\b[^>]*alt="CI picture"[^>]*src="\/assets\/logo.svg"/.test(en) || en.includes('src="/assets/logo.svg"'));
expect('English page hides the paragraph', en.includes('display:none !important'));
const ar = await page('/ar/', (t) => t.includes('color:#ff0000 !important'));
expect('Arabic page gets the colour and size too', ar.includes('color:#ff0000 !important;font-size:44px !important'));
expect('Arabic page gets the picture too', ar.includes('src="/assets/logo.svg"'));
expect('Arabic page keeps its own picture description', !ar.includes('alt="CI picture"'));
expect('Arabic page keeps its own text (English is not copied there)', !ar.includes('CI <b>visual</b> heading'));

r = await call('POST', '/api/admin/visual', { path: '/', lang: 'ar', key: h1, text: 'عنوان CI' });
const ar2 = await page('/ar/', (t) => t.includes('عنوان CI'));
expect('a text written on the Arabic page shows there', ar2.includes('عنوان CI'));

r = await call('GET', '/api/admin/visual?path=/');
expect('list of changes', r.data?.count >= 3, r.text.slice(0, 200));
r = await call('DELETE', '/api/admin/visual?path=/');
expect('undo all', r.status === 200);
const back = await page('/', (t) => !t.includes('CI <b>visual</b>'));
expect('page back to the original', !back.includes('CI <b>visual</b>') && !back.includes('color:#ff0000'));
r = await call('POST', '/api/admin/visual', { path: '/', lang: 'en', key: '9.9.9.9.9.9', text: 'x' });
expect('a place that does not exist is refused', r.status === 404);

console.log(failed ? `${failed} visual editor check(s) failed` : 'all visual editor checks passed');
if (failed) {
  console.log(`::error title=Visual editor::${failed} check(s) failed`);
  process.exit(1);
}
