#!/usr/bin/env python3
"""Admin upgrade patches for app/server.js (run once). Exact-anchor replacements."""
import sys

P = "/home/hatch/workspace/visit-saudi/app/server.js"
s = open(P).read()

def rep(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        print("FAIL anchor x%d: %s" % (n, label)); sys.exit(1)
    s = s.replace(old, new)
    print("ok:", label)

# A1 staff env consts
rep('const ADMIN_PASS = process.env.ADMIN_PASS || "";\nconst ADMIN_USER = process.env.ADMIN_USER || "admin";',
    'const ADMIN_PASS = process.env.ADMIN_PASS || "";\nconst ADMIN_USER = process.env.ADMIN_USER || "admin";\nconst STAFF_USER = process.env.STAFF_USER || "staff";\nconst STAFF_PASS = process.env.STAFF_PASS || "";',
    "A1 staff consts")

# A2 settings prices merge
rep('''function getSettings() {
  const d = { whatsapp: "971566556645", email: "info@visit-saudi.ae", notifyEmail: "", smtp: { host: "", port: 587, user: "", pass: "", from: "" } };
  const s = readStore(SETTINGS_FILE, {});
  return Object.assign({}, d, s, { smtp: Object.assign({}, d.smtp, s.smtp || {}) });
}''',
'''function getSettings() {
  const d = { whatsapp: "971566556645", email: "info@visit-saudi.ae", notifyEmail: "", prices: {}, smtp: { host: "", port: 587, user: "", pass: "", from: "" } };
  const s = readStore(SETTINGS_FILE, {});
  return Object.assign({}, d, s, { smtp: Object.assign({}, d.smtp, s.smtp || {}), prices: s.prices || {} });
}''',
    "A2 settings prices")

# A3 helpers after slugify
rep('function slugify(s) { return String(s || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/\\^-|-+$/g, "").slice(0, 70) || "post"; }' if False else 'function slugify(s) { return String(s || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "post"; }',
'''function slugify(s) { return String(s || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "post"; }

/* --- admin upgrade stores: content edits, customers, stats, media --- */
const CONTENT_FILE = path.join(DATA, "content-edits.json");
const CUSTOMERS_FILE = path.join(DATA, "customers.json");
const STATS_FILE = path.join(DATA, "stats.jsonl");
const MEDIA_DIR = path.join(DATA, "media");
try { fs.mkdirSync(MEDIA_DIR, { recursive: true }); } catch (e) {}
const _editsCache = {};
function getEdits(lang) {
  try {
    const st = fs.statSync(CONTENT_FILE);
    const c = _editsCache[lang];
    if (c && c.m === st.mtimeMs) return c.v;
    const all = JSON.parse(fs.readFileSync(CONTENT_FILE, "utf8"));
    const v = all[lang] || {};
    _editsCache[lang] = { m: st.mtimeMs, v };
    return v;
  } catch (e) { return {}; }
}
function getAllEdits() { return readStore(CONTENT_FILE, {}); }
function applyEditsEn(html) {
  const ed = getEdits("en");
  if (!ed || !Object.keys(ed).length) return html;
  const tokens = html.split(/(<!--[\\s\\S]*?-->|<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>|<[^>]+>)/g);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok || tok[0] === "<") continue;
    const core = tok.trim();
    if (core && ed[core]) tokens[i] = tok.replace(core, escText(ed[core]));
  }
  return tokens.join("");
}''',
    "A3 helpers")

# A4 translateHtml edits priority
rep('''function translateHtml(html, lang, cleanPath) {
  const map = loadLangMap(lang);
  if (!map || !Object.keys(map).length) return html;''',
'''function translateHtml(html, lang, cleanPath) {
  const map = Object.assign({}, loadLangMap(lang) || {}, getEdits(lang) || {});
  if (!Object.keys(map).length) return html;''',
    "A4 translateHtml")

# A5 sessions -> roles
rep('''const sessions = new Map();
function adminAuth(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/vsa_admin=([a-f0-9]{64})/);
  if (!m) return false;
  const s = sessions.get(m[1]);
  if (!s || s.exp < Date.now()) return false;
  return true;
}''',
'''const sessions = new Map();
function adminSess(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/vsa_admin=([a-f0-9]{64})/);
  if (!m) return null;
  const s = sessions.get(m[1]);
  if (!s || s.exp < Date.now()) return null;
  return s;
}
function adminAuth(req) { return !!adminSess(req); }
function isAdminRole(req) { const s = adminSess(req); return !!s && s.role === "admin"; }''',
    "A5 sessions roles")

# A6 login with roles
rep('''      const b = await readJson(req);
      const okUser = String(b.user || "") === ADMIN_USER;
      const given = Buffer.from(String(b.password || "")); const want = Buffer.from(ADMIN_PASS);
      const okPass = given.length === want.length && crypto.timingSafeEqual(given, want);
      if (!okUser || !okPass) return send(res, 401, { ok: false, error: "Wrong username or password." });
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { exp: Date.now() + 12 * 60 * 60 * 1000 });
      return send(res, 200, { ok: true }, { "Set-Cookie": "vsa_admin=" + token + "; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200" });''',
'''      const b = await readJson(req);
      const userIn = String(b.user || ""), passIn = String(b.password || "");
      let role = null;
      const tryPass = (want) => { const g = Buffer.from(passIn); const w = Buffer.from(want); return g.length === w.length && crypto.timingSafeEqual(g, w); };
      if (userIn === ADMIN_USER && tryPass(ADMIN_PASS)) role = "admin";
      else if (STAFF_PASS && userIn === STAFF_USER && tryPass(STAFF_PASS)) role = "staff";
      if (!role) return send(res, 401, { ok: false, error: "Wrong username or password." });
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { exp: Date.now() + 12 * 60 * 60 * 1000, role, user: userIn });
      return send(res, 200, { ok: true, role }, { "Set-Cookie": "vsa_admin=" + token + "; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200" });''',
    "A6 login roles")

# A7 gate + me before apps GET
rep('''      if (p === "/api/admin/apps" && req.method === "GET") {''',
'''      const ADMIN_ONLY = ["/api/admin/settings", "/api/admin/test-email", "/api/admin/blog", "/api/admin/reviews", "/api/admin/content", "/api/admin/backup", "/api/admin/restore", "/api/admin/media"];
      if (ADMIN_ONLY.some((x) => p === x || p.startsWith(x + "/")) && !isAdminRole(req)) return send(res, 403, { ok: false, error: "Admin role required for this section." });
      if (p === "/api/admin/me" && req.method === "GET") { const ms = adminSess(req); return send(res, 200, { ok: true, role: ms.role, user: ms.user }); }
      if (p === "/api/admin/apps" && req.method === "GET") {''',
    "A7 gate + me")

# A8 public reviews visible-only
rep('if (p === "/api/reviews" && req.method === "GET") return send(res, 200, { ok: true, reviews: readStore(REVIEWS_FILE, []) });',
    'if (p === "/api/reviews" && req.method === "GET") return send(res, 200, { ok: true, reviews: readStore(REVIEWS_FILE, []).filter((x) => x.visible !== false) });',
    "A8 reviews public filter")

# A9 config with prices
rep('if (p === "/api/config" && req.method === "GET") { const s = getSettings(); return send(res, 200, { ok: true, whatsapp: s.whatsapp, email: s.email }); }',
    'if (p === "/api/config" && req.method === "GET") { const s = getSettings(); return send(res, 200, { ok: true, whatsapp: s.whatsapp, email: s.email, prices: s.prices || {} }); }',
    "A9 config prices")

# A10 reviews POST visible flag
rep("text: String(b.text).slice(0, 600), date: new Date().toISOString().slice(0, 10) });",
    "text: String(b.text).slice(0, 600), date: new Date().toISOString().slice(0, 10), visible: b.visible !== false });",
    "A10 review visible")

# A11 settings GET prices
rep("return send(res, 200, { ok: true, settings: { whatsapp: s.whatsapp, email: s.email, notifyEmail: s.notifyEmail, smtp: { host: s.smtp.host, port: s.smtp.port, user: s.smtp.user, from: s.smtp.from, hasPass: !!s.smtp.pass } } });",
    "return send(res, 200, { ok: true, settings: { whatsapp: s.whatsapp, email: s.email, notifyEmail: s.notifyEmail, prices: s.prices || {}, smtp: { host: s.smtp.host, port: s.smtp.port, user: s.smtp.user, from: s.smtp.from, hasPass: !!s.smtp.pass } } });",
    "A11 settings GET prices")

# A12 settings POST prices
rep('if (b.smtp.pass) s.smtp.pass = String(b.smtp.pass).slice(0, 200); }\n        writeStore(SETTINGS_FILE, s);',
'''if (b.smtp.pass) s.smtp.pass = String(b.smtp.pass).slice(0, 200); }
        if (b.prices && typeof b.prices === "object") { s.prices = {}; for (const k of Object.keys(b.prices).slice(0, 20)) { const v = b.prices[k] || {}; const amt = parseFloat(v.amount); if (!isNaN(amt) && amt > 0) s.prices[String(k).slice(0, 40)] = { amount: amt, currency: String(v.currency || "AED").slice(0, 5).toUpperCase() }; } }
        writeStore(SETTINGS_FILE, s);''',
    "A12 settings POST prices")

# A13 blog POST image
rep('const post = { slug, title: String(b.title).slice(0, 140), cat: String(b.cat || "News").slice(0, 40), excerpt: String(b.excerpt || "").slice(0, 300), body: String(b.body || "").slice(0, 30000), date: new Date().toISOString().slice(0, 10), published: b.published !== false };',
    'const post = { slug, title: String(b.title).slice(0, 140), cat: String(b.cat || "News").slice(0, 40), excerpt: String(b.excerpt || "").slice(0, 300), body: String(b.body || "").slice(0, 30000), image: String(b.image || "").slice(0, 300), date: new Date().toISOString().slice(0, 10), published: b.published !== false };',
    "A13 blog image")

# A14 public blog list image
rep("posts: posts.map((x) => ({ slug: x.slug, title: x.title, cat: x.cat, excerpt: x.excerpt, date: x.date }))",
    "posts: posts.map((x) => ({ slug: x.slug, title: x.title, cat: x.cat, excerpt: x.excerpt, date: x.date, image: x.image || \"\" }))",
    "A14 blog list image")

# A15 /api/event before /api/blog
rep('''    if (p === "/api/blog" && req.method === "GET") {''',
'''    if (p === "/api/event" && req.method === "POST") {
      const b = await readJson(req);
      const t = String(b.t || "").slice(0, 20);
      if (["checker", "apply_start", "apply_done", "whatsapp"].indexOf(t) < 0) return send(res, 400, { ok: false });
      appendJsonl(STATS_FILE, { t, nat: String(b.nat || "").slice(0, 60), path: String(b.path || "").slice(0, 80), day: new Date().toISOString().slice(0, 10), at: new Date().toISOString() });
      return send(res, 200, { ok: true });
    }
    if (p === "/api/blog" && req.method === "GET") {''',
    "A15 api event")

# A16 new admin endpoints before download handler
rep('''      if (p === "/api/admin/download" && req.method === "GET") {''',
'''      if (p === "/api/admin/reviews/visible" && req.method === "POST") {
        const b = await readJson(req);
        const list = readStore(REVIEWS_FILE, []); const i = parseInt(b.index, 10) || 0;
        if (list[i]) { list[i].visible = b.visible !== false; writeStore(REVIEWS_FILE, list); }
        return send(res, 200, { ok: true, reviews: list });
      }
      if (p === "/api/admin/customers" && req.method === "GET") {
        const apps = readJsonl(APPS_FILE);
        const notes = readStore(CUSTOMERS_FILE, {});
        const by = {};
        apps.forEach((a) => { const key = (a.email || a.pass || a.ref).toLowerCase(); if (!by[key]) by[key] = { key, name: a.name, email: a.email, phone: a.phone, pass: a.pass, nat: a.nat, apps: [], lastAt: a.created, note: notes[key] || "" }; by[key].apps.push({ ref: a.ref, visa: a.visa, stage: a.stage, created: a.created }); if (a.created > by[key].lastAt) by[key].lastAt = a.created; });
        return send(res, 200, { ok: true, customers: Object.values(by).sort((x, y) => (y.lastAt < x.lastAt ? -1 : 1)) });
      }
      if (p === "/api/admin/customers/note" && req.method === "POST") {
        const b = await readJson(req); const notes = readStore(CUSTOMERS_FILE, {});
        notes[String(b.key || "").slice(0, 160)] = String(b.note || "").slice(0, 1000);
        writeStore(CUSTOMERS_FILE, notes);
        return send(res, 200, { ok: true });
      }
      if (p === "/api/admin/content" && req.method === "GET") {
        const langIn = url.searchParams.get("lang") || "en";
        const lang = LANG_LIST.concat(["en"]).indexOf(langIn) >= 0 ? langIn : "en";
        const q = String(url.searchParams.get("q") || "").toLowerCase();
        const dict = loadLangMap("ar");
        const keys = Object.keys(dict || {});
        const ed = getAllEdits()[lang] || {};
        const target = lang === "en" ? {} : loadLangMap(lang);
        const out = keys.filter((k) => !q || k.toLowerCase().indexOf(q) >= 0).slice(0, 60).map((k) => ({ src: k, current: ed[k] !== undefined ? ed[k] : (lang === "en" ? k : (target[k] || "")), edited: ed[k] !== undefined }));
        return send(res, 200, { ok: true, lang, total: keys.length, strings: out });
      }
      if (p === "/api/admin/content" && req.method === "POST") {
        const b = await readJson(req);
        if (LANG_LIST.concat(["en"]).indexOf(b.lang || "") < 0 || !b.src) return send(res, 400, { ok: false });
        const all = getAllEdits(); all[b.lang] = all[b.lang] || {};
        const src = String(b.src).slice(0, 500); const val = String(b.value || "").slice(0, 2000);
        if (!val || val === src) delete all[b.lang][src]; else all[b.lang][src] = val;
        writeStore(CONTENT_FILE, all); delete _editsCache[b.lang];
        return send(res, 200, { ok: true });
      }
      if (p === "/api/admin/stats" && req.method === "GET") {
        const rows = readJsonl(STATS_FILE);
        const days = {}; const tops = {}; const nats = {}; const funnel = { view: 0, checker: 0, apply_start: 0, apply_done: 0, whatsapp: 0 };
        rows.forEach((r) => { if (funnel[r.t] !== undefined) funnel[r.t]++; if (r.t === "view") { days[r.day] = (days[r.day] || 0) + 1; if (r.path) tops[r.path] = (tops[r.path] || 0) + 1; } if (r.t === "checker" && r.nat) nats[r.nat] = (nats[r.nat] || 0) + 1; });
        const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, v }));
        return send(res, 200, { ok: true, days, funnel, topPages: top(tops, 12), topNats: top(nats, 12) });
      }
      if (p === "/api/admin/media" && req.method === "GET") {
        const files = fs.existsSync(MEDIA_DIR) ? fs.readdirSync(MEDIA_DIR).filter((f) => /\\.(png|jpe?g|webp)$/i.test(f)).sort().reverse().map((f) => ({ name: f, url: "/media/" + f })) : [];
        return send(res, 200, { ok: true, files });
      }
      if (p === "/api/admin/media" && req.method === "POST") {
        const b = await readJson(req);
        const buf = Buffer.from(String(b.data || "").split(",").pop(), "base64");
        if (!buf.length || buf.length > 6 * 1024 * 1024 || !magicOk(buf, b.name || "x.jpg")) return send(res, 400, { ok: false, error: "Image rejected - JPG, PNG or WebP, max 6MB." });
        const ext = (String(b.name || "img.jpg").split(".").pop() || "jpg").toLowerCase().replace(/[^a-z]/g, "") || "jpg";
        const name = Date.now().toString(36) + "-" + crypto.randomBytes(2).toString("hex") + "." + ext;
        fs.writeFileSync(path.join(MEDIA_DIR, name), buf, { mode: 0o600 });
        return send(res, 200, { ok: true, url: "/media/" + name, name });
      }
      if (p === "/api/admin/media/delete" && req.method === "POST") {
        const b = await readJson(req); const f = path.join(MEDIA_DIR, path.basename(String(b.name || "")));
        try { fs.unlinkSync(f); } catch (e) {}
        return send(res, 200, { ok: true });
      }
      if (p === "/api/admin/backup" && req.method === "GET") {
        const s = getSettings();
        const data = { exportedAt: new Date().toISOString(), apps: readJsonl(APPS_FILE), enquiries: readJsonl(ENQ_FILE), blog: readStore(BLOG_FILE, []), reviews: readStore(REVIEWS_FILE, []), settings: Object.assign({}, s, { smtp: Object.assign({}, s.smtp, { pass: "" }) }), contentEdits: getAllEdits(), customerNotes: readStore(CUSTOMERS_FILE, {}) };
        res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=\\"visit-saudi-backup.json\\"" });
        return res.end(JSON.stringify(data, null, 1));
      }
      if (p === "/api/admin/restore" && req.method === "POST") {
        const b = await readJson(req); const d = b.data || b;
        if (Array.isArray(d.apps)) writeJsonl(APPS_FILE, d.apps);
        if (Array.isArray(d.enquiries)) writeJsonl(ENQ_FILE, d.enquiries);
        if (Array.isArray(d.blog)) writeStore(BLOG_FILE, d.blog);
        if (Array.isArray(d.reviews)) writeStore(REVIEWS_FILE, d.reviews);
        if (d.settings) { const cur = getSettings(); const ns = Object.assign({}, cur, d.settings, { smtp: Object.assign({}, cur.smtp, (d.settings.smtp || {}), { pass: (d.settings.smtp && d.settings.smtp.pass) || cur.smtp.pass }) }); writeStore(SETTINGS_FILE, ns); }
        if (d.contentEdits) writeStore(CONTENT_FILE, d.contentEdits);
        if (d.customerNotes) writeStore(CUSTOMERS_FILE, d.customerNotes);
        return send(res, 200, { ok: true });
      }
      if (p === "/api/admin/download" && req.method === "GET") {''',
    "A16 new endpoints")

# A17 inline download
rep('"Content-Disposition": "attachment; filename=\\"" + file + "\\"" });',
    '"Content-Disposition": (url.searchParams.get("inline") ? "inline" : "attachment") + "; filename=\\"" + file + "\\"" });',
    "A17 inline download")

# A18a media public route before i18n route
rep('''    if (req.method === "GET" && /^\\/i18n\\/[a-z]{2}\\.json$/.test(p)) {''',
'''    if (req.method === "GET" && p.startsWith("/media/")) {
      const mf = path.join(MEDIA_DIR, path.basename(p));
      if (fs.existsSync(mf)) { res.writeHead(200, { "Content-Type": MIME[path.extname(mf).toLowerCase()] || "application/octet-stream", "Cache-Control": "public, max-age=86400" }); return fs.createReadStream(mf).pipe(res); }
      return send(res, 404, { ok: false });
    }
    if (req.method === "GET" && /^\\/i18n\\/[a-z]{2}\\.json$/.test(p)) {''',
    "A18a media route")

# A18b page view logging before let rel
rep('''    let rel = p === "/" ? "/index.html" : p;''',
'''    if (req.method === "GET" && !p.startsWith("/assets/") && p !== "/admin") { try { appendJsonl(STATS_FILE, { t: "view", path: p, lang: reqLang || "en", day: new Date().toISOString().slice(0, 10), at: new Date().toISOString() }); } catch (e) {} }
    let rel = p === "/" ? "/index.html" : p;''',
    "A18b view logging")

# A18c english edits in static serve
rep('''    if (reqLang && fp.endsWith(".html") && !fp.endsWith("admin.html")) {''',
'''    if (!reqLang && fp.endsWith(".html") && !fp.endsWith("admin.html")) {
      const edEn = getEdits("en");
      if (edEn && Object.keys(edEn).length) { res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" }); return res.end(applyEditsEn(fs.readFileSync(fp, "utf8"))); }
    }
    if (reqLang && fp.endsWith(".html") && !fp.endsWith("admin.html")) {''',
    "A18c english edits")

open(P, "w").write(s)
print("ALL PATCHES APPLIED")
