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
    // the apply page's step tabs and dashboard password (vs-apply.js) are the one intended addition
    // and the header's account icon with the restyled language / currency buttons (vs-header.css / .js)
    if (b.status === 200 && /^text\/html/.test(String(a.type || 'text/html'))) {
      let s = a.body.toString('utf8');
      if (s.includes('vs-header.js')) {
        s = s.replace('<link rel="stylesheet" href="/vs-header.css?v=1">', '').replace('<script src="/vs-header.js?v=1" defer></script>', '');
        const old = b.body.toString('utf8').match(/<a class="nav-track mtrk" href="[^"]*">[\s\S]*?<\/a>/);
        if (old) s = s.replace(/<a class="vs-acct" href="\/portal"[^>]*>[\s\S]*?<\/a>/, old[0]);
        a.body = Buffer.from(s, 'utf8');
      }
    }
    if (/^\/([a-z]{2}\/)?apply$/.test(u)) a.body = Buffer.from(a.body.toString('utf8').replace('<script src="/vs-apply.js?v=1" defer></script>', ''), 'utf8');
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
