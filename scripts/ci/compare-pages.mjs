// CI: every page in every language from the new app must be byte-identical to the old server's answer.
import fs from 'fs';
const NEW = process.argv[2] || 'http://localhost:3000';
const OLD = process.argv[3] || 'http://localhost:8324';
const LANGS = ['ar', 'ru', 'de', 'es', 'fr', 'tr', 'zh', 'ur', 'hi', 'it', 'ro', 'pt', 'pl', 'hu', 'hr', 'sk', 'cs', 'id'];
const sm = fs.readFileSync('site/public/sitemap.xml', 'utf8');
const urls = [...sm.matchAll(/<loc>https:\/\/visit-saudi\.ae([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const all = urls.concat(LANGS.flatMap((l) => urls.map((u) => '/' + l + (u === '/' ? '' : u))));
const extra = ['/blog', '/ar/blog/umrah', '/index.html', '/countries/india.html', '/does-not-exist', '/assets/css/main.css', '/assets/js/app.js', '/robots.txt', '/sitemap.xml', '/i18n/ar.json', '/ar/assets/img/logo-mark.svg'];
let same = 0;
const bad = [];
async function get(base, u) {
  const r = await fetch(base + u, { redirect: 'manual' });
  return { status: r.status, loc: r.headers.get('location') || '', body: Buffer.from(await r.arrayBuffer()) };
}
let i = 0;
async function worker() {
  while (i < all.length + extra.length) {
    const k = i++;
    const u = k < all.length ? all[k] : extra[k - all.length];
    const [a, b] = await Promise.all([get(NEW, u), get(OLD, u)]);
    if (a.status === b.status && a.loc === b.loc && a.body.equals(b.body)) same++;
    else bad.push(`${u}: new ${a.status} ${a.loc} ${a.body.length}B / old ${b.status} ${b.loc} ${b.body.length}B`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`${same} of ${all.length + extra.length} addresses identical to the old site`);
if (bad.length) {
  console.log(bad.slice(0, 30).join('\n'));
  process.exit(1);
}
