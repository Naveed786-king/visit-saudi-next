#!/usr/bin/env node
/* Visit Saudi (visit-saudi.ae) - zero-dependency Node app.
   Serves the public site, receives applications with document uploads,
   powers the live tracking page and the password-protected admin panel.
   Data lives in DATA_DIR (default ./data). Admin switches on when
   ADMIN_PASS is set in the environment. */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* Load .env at startup (stdlib only, no dependency) so the app always has
 * its keys no matter how it is started — PM2 auto-start after a server
 * reboot, the xCloud Restart button, or a plain pm2 restart. Only fills in
 * variables that are not already set, so env injected by PM2 or the shell
 * always wins. Same pattern as DVP's loader (live since 2026-11-15).
 * NOTE: visit-saudi has no licence tamper guard, so a bare start does NOT
 * suspend the site — it silently runs with admin login off (no ADMIN_PASS)
 * and payments unconfigured (no ZIINA_API_KEY). This loader is what stops
 * a reboot from quietly taking payments and admin offline.
 */
(function loadDotEnv() {
  try {
    const text = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    let loaded = 0;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      if (process.env[key] !== undefined) continue;
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
          (val.startsWith("'") && val.endsWith("'") && val.length >= 2)) {
        val = val.slice(1, -1);
      } else {
        const hash = val.indexOf(" #");
        if (hash !== -1) val = val.slice(0, hash).trim();
      }
      process.env[key] = val;
      loaded++;
    }
    if (loaded > 0) console.log("dotenv: loaded " + loaded + " key(s) from .env");
  } catch (e) {
    // No .env (test trees, local dev) — env comes from the process instead.
  }
})();

const PORT = parseInt(process.env.PORT || "8420", 10);
const ROOT = path.join(__dirname, "public");
const DATA = process.env.DATA_DIR || path.join(__dirname, "data");
const I18N_DIR = path.join(__dirname, "i18n");
const LANG_LIST = ["ar","ru","de","es","fr","tr","zh","ur","hi","it","ro","pt","pl","hu","hr","sk","cs","id"];
const LANG_RE = new RegExp("^\\/(" + LANG_LIST.join("|") + ")(\\/(.*))?$");
const RTL_LANGS_S = { ar: 1, ur: 1 };
const _i18nCache = {};
function loadLangMap(lang) {
  const fp = path.join(I18N_DIR, lang + ".json");
  try {
    const st = fs.statSync(fp);
    const c = _i18nCache[lang];
    if (c && c.mtime === st.mtimeMs) return c.map;
    const map = JSON.parse(fs.readFileSync(fp, "utf8"));
    _i18nCache[lang] = { mtime: st.mtimeMs, map };
    return map;
  } catch (e) { return {}; }
}
function escAttr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }
function decEnt(s) { return String(s).replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos|copy|nbsp|rsquo|lsquo|ldquo|rdquo|hellip|mdash|ndash);/g, (m, e) => {
  if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isNaN(n) ? m : String.fromCodePoint(n); }
  return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", copy: "©", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", mdash: "—", ndash: "–" }[e] || m; }); }
function escText(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function translateHtml(html, lang, cleanPath) {
  const map = Object.assign({}, loadLangMap(lang) || {}, getEdits(lang) || {});
  if (!Object.keys(map).length) return html;
  const tokens = html.split(/(<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/g);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok[0] === "<") {
      if (/^<(script|style)/i.test(tok)) continue;
      if (/^<html/i.test(tok)) { tokens[i] = tok.replace('<html lang="en">', '<html lang="' + lang + '"' + (RTL_LANGS_S[lang] ? ' dir="rtl"' : '') + '>'); continue; }
      tokens[i] = tok.replace(/\b(alt|title|placeholder|content)="([^"]*)"/g, (m, a, v) => { const tr = map[v] || map[decEnt(v)]; return tr ? a + '="' + escAttr(tr) + '"' : m; });
    } else {
      const core = tok.trim();
      if (core) { const tr = map[core] || map[decEnt(core)]; if (tr) tokens[i] = tok.replace(core, escText(tr)); }
    }
  }
  let out = tokens.join("");
  const base = cleanPath === "/" ? "" : cleanPath;
  const alts = ['<link rel="alternate" hreflang="x-default" href="' + (base || "/") + '">', '<link rel="alternate" hreflang="en" href="' + (base || "/") + '">']
    .concat(LANG_LIST.map(l => '<link rel="alternate" hreflang="' + l + '" href="/' + l + base + '">')).join("");
  out = out.replace("</head>", alts + "</head>");
  return out;
}
const UPLOADS = path.join(DATA, "uploads");
const APPS_FILE = path.join(DATA, "applications.jsonl");
const ENQ_FILE = path.join(DATA, "enquiries.jsonl");
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const ADMIN_PATH = "/manage-jg0ojxafgt"; /* secret admin entrance - the public /admin path returns 404 */
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const STAFF_USER = process.env.STAFF_USER || "staff";
const STAFF_PASS = process.env.STAFF_PASS || "";

const STAGES = [
  "Application received",
  "Expert document check",
  "Submitted to the authority",
  "With the authority",
  "Decision received",
  "eVisa ready",
];
const DEMO = { ref: "VSA-DEMO26", pass: "X1234567", name: "Sample Applicant", visa: "tourist", stage: 2, demo: true };

fs.mkdirSync(UPLOADS, { recursive: true });

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain", ".ico": "image/x-icon", ".json": "application/json", ".pdf": "application/pdf" };

function readJsonl(file) {
  try {
    return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  } catch (e) { return []; }
}
function writeJsonl(file, rows) {
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), { mode: 0o600 });
}
function appendJsonl(file, row) {
  fs.appendFileSync(file, JSON.stringify(row) + "\n", { mode: 0o600 });
}
function newRef(apps) {
  let ref;
  do { ref = "VSA-" + crypto.randomBytes(3).toString("hex").toUpperCase(); } while (apps.some((a) => a.ref === ref));
  return ref;
}
function magicOk(buf, name) {
  if (!buf || buf.length < 4) return false;
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (buf[0] === 0xff && buf[1] === 0xd8) return ext === "jpg" || ext === "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return ext === "png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return ext === "webp";
  if (buf.slice(0, 4).toString() === "%PDF") return ext === "pdf";
  return false;
}
function send(res, code, obj, headers) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({ "Content-Type": typeof obj === "string" ? "text/plain" : "application/json" }, headers || {}));
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > 14 * 1024 * 1024) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
async function readJson(req) {
  const raw = await readBody(req);
  try { return JSON.parse(raw || "{}"); } catch (e) { return {}; }
}


/* --- blog / reviews / settings stores --- */
const net = require("net");
const tls = require("tls");
const BLOG_FILE = path.join(DATA, "blog.json");
const REVIEWS_FILE = path.join(DATA, "reviews.json");
const SETTINGS_FILE = path.join(DATA, "settings.json");
function readStore(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; } }
function writeStore(file, val) { fs.writeFileSync(file, JSON.stringify(val, null, 1), { mode: 0o600 }); }
function getSettings() {
  const d = { whatsapp: "971566556645", email: "info@visit-saudi.ae", notifyEmail: "", prices: {}, smtp: { host: "", port: 587, user: "", pass: "", from: "" }, payments: { enabled: false, provider: "", mode: "test", pubKey: "", secretKey: "", webhookSecret: "" } };
  const s = readStore(SETTINGS_FILE, {});
  return Object.assign({}, d, s, { smtp: Object.assign({}, d.smtp, s.smtp || {}), payments: Object.assign({}, d.payments, s.payments || {}), prices: (s.prices && Object.keys(s.prices).length) ? s.prices : { "one-year-multiple": { amount: 300, currency: "USD" }, "ninety-day-multiple": { amount: 200, currency: "USD" }, "umrah": { amount: 250, currency: "USD" } } });
}
function slugify(s) { return String(s || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "post"; }

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
  const tokens = html.split(/(<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/g);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok || tok[0] === "<") continue;
    const core = tok.trim();
    if (core && ed[core]) tokens[i] = tok.replace(core, escText(ed[core]));
  }
  return tokens.join("");
}

/* --- guide overrides: WordPress-style editing of the built-in guides --- */
const GUIDE_OVERRIDES_FILE = path.join(DATA, "guide-overrides.json");
let _govCache = null, _govMtime = 0;
function getGuideOverrides() {
  try { const st = fs.statSync(GUIDE_OVERRIDES_FILE); if (_govCache && _govMtime === st.mtimeMs) return _govCache; _govCache = JSON.parse(fs.readFileSync(GUIDE_OVERRIDES_FILE, "utf8")); _govMtime = st.mtimeMs; return _govCache; } catch (e) { return {}; }
}
function guideZone(html) { const a = html.indexOf('<h2 id="sec-'); if (a < 0) return null; const b = html.indexOf('<div class="authorcard">', a); if (b < 0) return null; return { a, b }; }
function zoneToText(zone) {
  const out = []; const re = /<(h2|h3|p|li)[^>]*>([\s\S]*?)<\/\1>/g; let m;
  while ((m = re.exec(zone))) { const t = decEnt(m[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(); if (!t) continue; out.push(m[1] === "h2" ? "## " + t : m[1] === "h3" ? "### " + t : t); }
  return out.join("\n\n");
}
function textToZone(text) {
  let sec = 0;
  return String(text || "").split(/\n\s*\n/).map((block) => { const t = block.trim(); if (!t) return ""; if (t.indexOf("## ") === 0) return '<h2 id="sec-' + (sec++) + '">' + escText(t.slice(3)) + "</h2>"; if (t.indexOf("### ") === 0) return "<h3>" + escText(t.slice(4)) + "</h3>"; return "<p>" + escText(t).replace(/\n/g, "<br>") + "</p>"; }).filter(Boolean).join("\n");
}
function applyGuideOverride(html, ov) {
  if (ov.title) {
    html = html.replace(/<title>([\s\S]*?)<\/title>/, (mm, t1) => { const i = t1.indexOf(" |"); return "<title>" + escText(ov.title) + (i >= 0 ? t1.slice(i) : "") + "</title>"; });
    html = html.replace(/(<h1[^>]*>)[\s\S]*?(<\/h1>)/, (mm, o, c) => o + escText(ov.title) + c);
  }
  if (ov.excerpt) html = html.replace(/(<meta name="description" content=")[^"]*(")/, (mm, a, b) => a + escAttr(ov.excerpt) + b);
  if (ov.body) { const z = guideZone(html); if (z) html = html.slice(0, z.a) + textToZone(ov.body) + "\n" + html.slice(z.b); }
  return html;
}
function applyIndexOverrides(html, govs) {
  return html.replace(/<article class="post[^"]*"[^>]*>[\s\S]*?<\/article>/g, (card) => {
    const m = card.match(/href="\/guides\/([a-z0-9-]+)"/); if (!m) return card;
    const ov = govs[m[1]]; if (!ov) return card;
    if (ov.published === false) return "";
    let out = card;
    if (ov.title) out = out.replace(/(<h3><a[^>]*>)[\s\S]*?(<\/a><\/h3>)/, (mm, a, b) => a + escText(ov.title) + b);
    if (ov.excerpt) out = out.replace(/(<\/h3>\s*<p>)[\s\S]*?(<\/p>)/, (mm, a, b) => a + escText(ov.excerpt) + b);
    if (ov.image) out = out.replace(/(<img[^>]*src=")[^"]*(")/, (mm, a, b) => a + escAttr(ov.image) + b);
    if (ov.cat) { out = out.replace(/data-cat="[^"]*"/, 'data-cat="' + escAttr(ov.cat) + '"'); out = out.replace(/(<span class="pill">)[\s\S]*?(<\/span>)/, (mm, a, b) => a + escText(ov.cat) + b); }
    if (ov.title || ov.excerpt || ov.cat) { const q = ((ov.title || "") + " " + (ov.excerpt || "") + " " + (ov.cat || "")).toLowerCase(); out = out.replace(/data-q="[^"]*"/, 'data-q="' + escAttr(q) + '"'); }
    return out;
  });
}
function listBuiltGuides() {
  const gdir = path.join(ROOT, "guides");
  let files = []; try { files = fs.readdirSync(gdir).filter((f) => f.endsWith(".html")); } catch (e) {}
  let indexHtml = ""; try { indexHtml = fs.readFileSync(path.join(ROOT, "guides.html"), "utf8"); } catch (e) {}
  const cards = {};
  indexHtml.replace(/<article class="post[^"]*"[^>]*>[\s\S]*?<\/article>/g, (card) => { const m = card.match(/href="\/guides\/([a-z0-9-]+)"/); if (m) { const cm = card.match(/data-cat="([^"]*)"/); const im = card.match(/<img[^>]*src="([^"]*)"/); cards[m[1]] = { cat: cm ? decEnt(cm[1]) : "", image: im ? im[1] : "" }; } return card; });
  return files.map((f) => { const slug = f.slice(0, -5); let title = slug, excerpt = ""; try { const h = fs.readFileSync(path.join(gdir, f), "utf8"); const hm = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/); if (hm) title = decEnt(hm[1].replace(/<[^>]+>/g, "")).trim(); const dm = h.match(/<meta name="description" content="([^"]*)"/); if (dm) excerpt = decEnt(dm[1]); } catch (e) {} return { slug, title, excerpt, cat: (cards[slug] || {}).cat || "", image: (cards[slug] || {}).image || "" }; });
}

/* --- minimal SMTP sender (STARTTLS / implicit TLS / plain) --- */
function smtpSend(to, subject, text) {
  return new Promise((resolve) => {
    const s = getSettings().smtp;
    if (!s.host || !s.user || !s.pass || !to) return resolve(false);
    const from = s.from || s.user;
    let sock, buf = "", waiters = [];
    const fail = () => { try { sock && sock.destroy(); } catch (e) {} resolve(false); };
    const timer = setTimeout(fail, 20000);
    function onData(d) {
      buf += d.toString("utf8");
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1);
        if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) { const w = waiters.shift(); if (w) w(line); }
      }
    }
    function cmd(c, code) { return new Promise((res2, rej) => { waiters.push((line) => { (code && !line.startsWith(code)) ? rej(new Error(line)) : res2(line); }); sock.write(c + "\r\n"); }); }
    function greet() { return new Promise((res2) => { waiters.push(() => res2()); }); }
    async function run() {
      await greet();
      await cmd("EHLO visit-saudi.ae", "250");
      if (Number(s.port) === 587) {
        await cmd("STARTTLS", "220");
        await new Promise((res2, rej) => { const up = tls.connect({ socket: sock, servername: s.host }, () => res2()); up.on("error", rej); sock = up; sock.on("data", onData); });
        await cmd("EHLO visit-saudi.ae", "250");
      }
      await cmd("AUTH LOGIN", "334");
      await cmd(Buffer.from(s.user).toString("base64"), "334");
      await cmd(Buffer.from(s.pass).toString("base64"), "235");
      await cmd("MAIL FROM:<" + from + ">", "250");
      await cmd("RCPT TO:<" + to + ">", "250");
      await cmd("DATA", "354");
      const msg = "From: Visit Saudi <" + from + ">\r\nTo: " + to + "\r\nSubject: " + subject + "\r\nDate: " + new Date().toUTCString() + "\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n" + text.replace(/\n\./g, "\n..") + "\r\n.";
      await cmd(msg, "250");
      await cmd("QUIT", "221");
      clearTimeout(timer); try { sock.end(); } catch (e) {}
      resolve(true);
    }
    const onErr = () => { clearTimeout(timer); fail(); };
    if (Number(s.port) === 465) { sock = tls.connect({ host: s.host, port: 465, servername: s.host }, () => {}); }
    else { sock = net.connect({ host: s.host, port: Number(s.port) || 587 }); }
    sock.on("data", onData); sock.on("error", onErr);
    run().catch(() => { clearTimeout(timer); fail(); });
  });
}
function storeDoc(ref, dataUrl, name) {
  if (!dataUrl || !name) return null;
  const buf = Buffer.from(String(dataUrl).split(",").pop(), "base64");
  if (buf.length > 8 * 1024 * 1024 || !magicOk(buf, name)) return null;
  const safe = String(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const dir = path.join(UPLOADS, ref); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, safe), buf, { mode: 0o600 });
  return safe;
}

/* --- admin sessions --- */
const sessions = new Map();
function adminSess(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/vsa_admin=([a-f0-9]{64})/);
  if (!m) return null;
  const s = sessions.get(m[1]);
  if (!s || s.exp < Date.now()) return null;
  const IDLE_MS = Number(process.env.ADMIN_IDLE_MS || 30 * 60 * 1000);
  if (s.idle && s.idle < Date.now()) { sessions.delete(m[1]); return null; }
  s.idle = Date.now() + IDLE_MS;
  return s;
}
function adminAuth(req) { return !!adminSess(req); }
function isAdminRole(req) { const s = adminSess(req); return !!s && s.role === "admin"; }
const loginHits = new Map();
function loginLimited(ip) {
  const now = Date.now(); const arr = (loginHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now); loginHits.set(ip, arr);
  return arr.length > 8;
}

/* ---------- Ziina payments (same account as dubaivisaportal.ae) ----------
 * Pay-after-apply, mirroring DVP: visitor submits -> confirmation shows
 * "Pay now" for priced visas -> Ziina hosted page (card / Apple Pay /
 * Google Pay) -> /pay/success re-reads the intent from Ziina and only
 * then marks the application paid, so a fabricated success visit can
 * never fake a payment. No card data ever touches this server.
 * IMPORTANT: Ziina allows ONE webhook URL per account, and DVP's
 * webhook already points at dubaivisaportal.ae. This site therefore
 * registers NO webhook: if a visitor closes the browser after paying,
 * the payment is picked up when they (or the team) re-check — the
 * tracking page re-verifies the stored intent, and Admin -> Applications
 * has a "Check payment" button.
 * Env: ZIINA_API_KEY (xCloud, never in chat), ZIINA_TEST=true for test
 * intents (test card 4242..., no money moves), SITE_URL.
 * Only status "completed" counts as paid. */
const https = require("https");
function ziinaKey() { return (process.env.ZIINA_API_KEY || "").trim(); }
function ziinaConfigured() { return ziinaKey().length > 10; }
function ziinaTest() { return (process.env.ZIINA_TEST || "").trim().toLowerCase() === "true"; }
function ziinaSiteUrl() { return (process.env.SITE_URL || "https://visit-saudi.ae").replace(/\/$/, ""); }
function ziinaPaymentsLive() { const s = getSettings(); return !!s.payments.enabled && String(s.payments.provider || "").toLowerCase() === "ziina" && ziinaConfigured(); }
function ziinaPrice(visa) { const s = getSettings(); const p = (s.prices || {})[visa]; return (p && Number(p.amount) > 0) ? { amount: Number(p.amount), currency: String(p.currency || "USD").toUpperCase() } : null; }
function ziinaRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const req = https.request({
      host: "api-v2.ziina.com", port: 443, path: apiPath, method,
      headers: { "Authorization": "Bearer " + ziinaKey(), "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      timeout: 20000,
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        let data = {};
        try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch (e) { reject(new Error("Ziina: unreadable response")); return; }
        if (res.statusCode >= 200 && res.statusCode < 300) { resolve(data); return; }
        const msg = (data && (data.message || (data.error && data.error.message))) || ("Ziina error " + res.statusCode);
        const err = new Error(String(msg).slice(0, 200)); err.statusCode = res.statusCode; reject(err);
      });
    });
    req.on("timeout", () => { req.destroy(new Error("Ziina: request timed out")); });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
async function ziinaCreateIntent(app, price, lang) {
  const prefix = (lang && LANG_LIST.indexOf(lang) >= 0) ? "/" + lang : "";
  const body = {
    amount: Math.round(price.amount * 100), // minor units: USD cents
    currency_code: price.currency,
    message: "Visit Saudi - " + (app.visa || "visa application") + " - " + app.ref,
    success_url: ziinaSiteUrl() + prefix + "/pay/success?ref=" + encodeURIComponent(app.ref) + "&intent_id={PAYMENT_INTENT_ID}",
    cancel_url: ziinaSiteUrl() + prefix + "/pay/cancel?ref=" + encodeURIComponent(app.ref),
    failure_url: ziinaSiteUrl() + prefix + "/pay/cancel?ref=" + encodeURIComponent(app.ref),
    test: ziinaTest(),
  };
  const z = await ziinaRequest("POST", "/api/payment_intent", body);
  if (!z || !z.id || !z.redirect_url) throw new Error("Ziina: unexpected response creating the payment");
  return { id: z.id, url: z.redirect_url };
}
async function ziinaGetIntent(id) { return ziinaRequest("GET", "/api/payment_intent/" + encodeURIComponent(id), null); }
function ziinaUpdateApp(ref, patch) {
  const apps = readJsonl(APPS_FILE);
  const a = apps.find((x) => x.ref === ref);
  if (!a) return null;
  Object.assign(a, patch, { updated: new Date().toISOString() });
  writeJsonl(APPS_FILE, apps);
  return a;
}
function ziinaMarkPaid(ref, info) {
  info = info || {};
  const app = readJsonl(APPS_FILE).find((a) => a.ref === ref);
  if (!app) return null;
  if (app.paid) return app; // already paid — re-checks are no-ops
  return ziinaUpdateApp(ref, { paid: true, pay_status: "paid", paid_at: new Date().toISOString(),
    amount_paid: info.amountLabel || app.amount_paid || "", ziina_intent: info.intentId || app.ziina_intent || "" });
}
function ziinaMarkFailed(ref) {
  const app = readJsonl(APPS_FILE).find((a) => a.ref === ref);
  if (!app || app.paid) return;
  ziinaUpdateApp(ref, { pay_status: "failed" });
}
async function ziinaVerifyIntentFor(app) {
  if (!app) return { paid: false };
  if (app.paid) return { paid: true };
  if (!app.ziina_intent) return { paid: false };
  try {
    const z = await ziinaGetIntent(app.ziina_intent);
    const price = ziinaPrice(app.visa);
    const amountOk = !app.ziina_amount || (z.amount != null && Math.round(Number(z.amount) / 100) === Number(app.ziina_amount));
    const curOk = !app.ziina_currency || !z.currency_code || String(z.currency_code).toUpperCase() === String(app.ziina_currency).toUpperCase();
    if (z && z.status === "completed" && amountOk && curOk) {
      const amt = app.ziina_amount || (price ? price.amount : "");
      const cur = app.ziina_currency || (price ? price.currency : "USD");
      ziinaMarkPaid(app.ref, { intentId: app.ziina_intent, amountLabel: amt ? (cur + " " + amt) : "" });
      return { paid: true };
    }
    return { paid: false, status: z ? z.status : "" };
  } catch (e) { return { paid: false, error: e.message }; }
}
function ziinaPayPage(kind, ref) {
  const ok = kind === "success";
  const heading = ok ? "Thank you - payment received." : (kind === "cancel" ? "Payment cancelled" : "Payment not completed");
  const body = ok
    ? "<p>Your payment for application <b>" + escText(ref) + "</b> is confirmed. Our team will now proceed with your visa application and keep you updated on WhatsApp.</p><p class=\"mut\">You can also <a href=\"/track?ref=" + encodeURIComponent(ref) + "\">track your application</a> any time with your reference and passport number.</p>"
    : "<p>No charge was made for application <b>" + escText(ref) + "</b>. You can try again whenever you are ready - your application is saved.</p><p><a class=\"btn\" href=\"/track?ref=" + encodeURIComponent(ref) + "\">Back to tracking</a></p>";
  return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    + "<title>" + (ok ? "Payment received" : "Payment cancelled") + " - Visit Saudi</title><style>"
    + ":root{--green:#0B3D2A;--gold:#C9A227;--ink:#1d2b26;--mut:#5d6f68;--bg:#F7F5EF}"
    + "*{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;background:var(--bg);color:var(--ink)}"
    + ".wrap{max-width:640px;margin:0 auto;padding:56px 20px;text-align:center}"
    + ".seal{width:74px;height:74px;margin:0 auto 18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:" + (ok ? "#0f7a4d" : "#8a8f8c") + ";color:#fff;font-size:34px}"
    + "h1{color:var(--green);font-size:30px;margin:0 0 12px}p{line-height:1.65}.mut{color:var(--mut);font-size:14px}"
    + ".ref{display:inline-block;margin:14px 0;padding:10px 22px;border:1.5px dashed var(--gold);border-radius:10px;font-family:ui-monospace,monospace;font-size:18px;letter-spacing:1px;background:#fff}"
    + ".btn{display:inline-block;margin-top:14px;padding:12px 26px;border-radius:999px;background:var(--green);color:#fff;text-decoration:none;font-weight:bold}a{color:var(--green)}"
    + "</style></head><body><div class=\"wrap\"><div class=\"seal\">" + (ok ? "&#10003;" : "&#10005;") + "</div><h1>" + heading + "</h1>"
    + "<div class=\"ref\">" + escText(ref) + "</div>" + body
    + "<p class=\"mut\" style=\"margin-top:28px\">Visit Saudi - visit-saudi.ae<br>Secure payment processed by Ziina. We never see or store your card details.</p>"
    + "</div></body></html>";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let p = url.pathname;
  const xfProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  if (xfProto === "http" && req.headers.host && !/^(localhost|127\.|\[::1\])/.test(req.headers.host)) {
    res.writeHead(req.method === "GET" || req.method === "HEAD" ? 301 : 308, { Location: "https://" + req.headers.host + req.url });
    return res.end();
  }
  let reqLang = null;
  const langMatch = p.match(LANG_RE);
  if (langMatch) { reqLang = langMatch[1]; p = "/" + (langMatch[3] || ""); }
  if (p === "/blog" || p === "/blog/" || p.startsWith("/blog/")) {
    res.writeHead(301, { Location: (reqLang ? "/" + reqLang : "") + "/guides" + p.slice(5) + (url.search || "") });
    return res.end();
  }
  try {
    /* ---------- public APIs ---------- */
    if (p === "/api/apply" && req.method === "POST") {
      const b = await readJson(req);
      const reqFields = ["visa", "name", "nat", "pass", "email", "phone", "entry"];
      for (const f of reqFields) if (!b[f] || String(b[f]).trim() === "") return send(res, 400, { ok: false, error: "Missing field: " + f });
      if (!/^\S+@\S+\.\S+$/.test(b.email)) return send(res, 400, { ok: false, error: "Invalid email" });
      const apps = readJsonl(APPS_FILE);
      const ref = newRef(apps);
      const docs = [];
      if (Array.isArray(b.docs)) {
        const dir = path.join(UPLOADS, ref); fs.mkdirSync(dir, { recursive: true });
        for (const d of b.docs.slice(0, 6)) {
          if (!d || !d.data || !d.name) continue;
          const buf = Buffer.from(String(d.data).split(",").pop(), "base64");
          if (buf.length > 5 * 1024 * 1024) continue;
          if (!magicOk(buf, d.name)) continue;
          const safe = String(d.name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
          fs.writeFileSync(path.join(dir, safe), buf, { mode: 0o600 });
          docs.push({ kind: String(d.kind || "document").slice(0, 30), name: safe });
        }
      }
      const app = {
        ref, visa: String(b.visa).slice(0, 30), name: String(b.name).slice(0, 90), nat: String(b.nat).slice(0, 60),
        pass: String(b.pass).toUpperCase().slice(0, 30), dob: String(b.dob || "").slice(0, 12),
        email: String(b.email).slice(0, 120), phone: String(b.phone).slice(0, 40),
        entry: String(b.entry).slice(0, 12), exit: String(b.exit || "").slice(0, 12),
        prof: String(b.prof || "").slice(0, 60), passexp: String(b.passexp || "").slice(0, 12),
        city: String(b.city || "").slice(0, 60), purpose: String(b.purpose || "").slice(0, 60),
        stage: 0, express: !!b.express, docs, created: new Date().toISOString(), updated: new Date().toISOString(),
        history: [{ stage: 0, at: new Date().toISOString(), by: "system", note: "Application received" }],
      };
      appendJsonl(APPS_FILE, app);
      const st0 = getSettings();
      if (st0.notifyEmail) smtpSend(st0.notifyEmail, "New Saudi visa application " + ref, "A new application was submitted on visit-saudi.ae.\n\nReference: " + ref + "\nName: " + app.name + "\nVisa: " + app.visa + "\nNationality: " + app.nat + "\nEmail: " + app.email + "\nPhone: " + app.phone + "\nEntry: " + app.entry + "\n\nOpen the admin panel to review it.");
      return send(res, 200, { ok: true, ref });
    }
    if (p === "/api/track" && req.method === "POST") {
      const b = await readJson(req);
      const ref = String(b.ref || "").toUpperCase().trim(), pass = String(b.pass || "").toUpperCase().trim();
      if (ref === DEMO.ref && pass === DEMO.pass) {
        return send(res, 200, { ok: true, ref: DEMO.ref, name: DEMO.name, visa: DEMO.visa, stage: DEMO.stage, demo: true, stages: STAGES, paid: false, pay_status: "", payable: false,
          history: [{ stage: 0, at: "2026-11-01T09:12:00Z" }, { stage: 1, at: "2026-11-01T15:40:00Z" }, { stage: 2, at: "2026-11-02T10:05:00Z" }] });
      }
      const app = readJsonl(APPS_FILE).find((a) => a.ref === ref && a.pass === pass);
      if (!app) return send(res, 404, { ok: false });
      if (app.ziina_intent && !app.paid) await ziinaVerifyIntentFor(app);
      const fresh = readJsonl(APPS_FILE).find((a) => a.ref === ref) || app;
      const tprice = ziinaPrice(fresh.visa);
      const payable = !fresh.paid && !!tprice && ziinaPaymentsLive();
      return send(res, 200, { ok: true, ref: fresh.ref, name: fresh.name, visa: fresh.visa, stage: fresh.stage, stages: STAGES,
        officialRef: fresh.officialRef || "", issuedDoc: fresh.issuedDoc ? fresh.issuedDoc.name : "",
        resolution: fresh.resolution || null, messages: fresh.messages || [],
        paid: !!fresh.paid, pay_status: fresh.pay_status || "", amount_paid: fresh.amount_paid || "", paid_at: fresh.paid_at || "",
        pay_total: (payable && tprice) ? { amount: tprice.amount, currency: tprice.currency } : null, payable,
        history: fresh.history.map((h) => ({ stage: h.stage, at: h.at, note: h.clientNote || "" })) });
    }
    if (p === "/api/contact" && req.method === "POST") {
      const b = await readJson(req);
      if (!b.name || !b.msg || (!b.email && !b.phone)) return send(res, 400, { ok: false });
      appendJsonl(ENQ_FILE, { name: String(b.name).slice(0, 90), email: String(b.email || "").slice(0, 120), phone: String(b.phone || "").slice(0, 40), topic: String(b.topic || "").slice(0, 60), msg: String(b.msg).slice(0, 2000), at: new Date().toISOString() });
      return send(res, 200, { ok: true });
    }

    if (p === "/api/event" && req.method === "POST") {
      const b = await readJson(req);
      const t = String(b.t || "").slice(0, 20);
      if (["checker", "apply_start", "apply_done", "whatsapp"].indexOf(t) < 0) return send(res, 400, { ok: false });
      appendJsonl(STATS_FILE, { t, nat: String(b.nat || "").slice(0, 60), path: String(b.path || "").slice(0, 80), day: new Date().toISOString().slice(0, 10), at: new Date().toISOString() });
      return send(res, 200, { ok: true });
    }
    if (p === "/api/blog" && req.method === "GET") {
      const posts = readStore(BLOG_FILE, []).filter((x) => x.published !== false);
      const slug = url.searchParams.get("slug");
      if (slug) { const one = posts.find((x) => x.slug === slug); return one ? send(res, 200, { ok: true, post: one }) : send(res, 404, { ok: false }); }
      return send(res, 200, { ok: true, posts: posts.map((x) => ({ slug: x.slug, title: x.title, cat: x.cat, excerpt: x.excerpt, date: x.date, image: x.image || "" })) });
    }
    if (p === "/api/reviews" && req.method === "GET") return send(res, 200, { ok: true, reviews: readStore(REVIEWS_FILE, []).filter((x) => x.visible !== false) });
    if (p === "/api/config" && req.method === "GET") { const s = getSettings(); return send(res, 200, { ok: true, whatsapp: s.whatsapp, email: s.email, prices: s.prices || {}, payments: { enabled: !!s.payments.enabled, provider: s.payments.provider || "", configured: ziinaConfigured() } }); }
    /* ---------- Ziina checkout ---------- */
    if (p === "/api/pay" && req.method === "POST") {
      const b = await readJson(req);
      const ref = String(b.ref || "").toUpperCase().trim();
      const apps = readJsonl(APPS_FILE);
      const app = apps.find((a) => a.ref === ref);
      if (!app) return send(res, 404, { ok: false, error: "Application not found." });
      if (app.paid) return send(res, 200, { ok: true, paid: true });
      const price = ziinaPrice(app.visa);
      if (!price) return send(res, 400, { ok: false, error: "This visa has no published online total yet - your total is confirmed in writing first." });
      if (!ziinaPaymentsLive()) return send(res, 400, { ok: false, error: "Online payments are not switched on yet - please contact us on WhatsApp." });
      if (app.ziina_intent && app.pay_status === "pending" && app.ziina_url && app.ziina_at) {
        const ageMin = (Date.now() - new Date(app.ziina_at).getTime()) / 60000;
        if (ageMin < 60) return send(res, 200, { ok: true, url: app.ziina_url });
      }
      try {
        const z = await ziinaCreateIntent(app, price, String(b.lang || "").slice(0, 5));
        ziinaUpdateApp(ref, { pay_status: "pending", ziina_intent: z.id, ziina_url: z.url, ziina_at: new Date().toISOString(), ziina_amount: price.amount, ziina_currency: price.currency });
        return send(res, 200, { ok: true, url: z.url });
      } catch (e) { return send(res, 502, { ok: false, error: "The payment page could not be opened - please try again or contact us on WhatsApp." }); }
    }
    if (p === "/api/pay/status" && req.method === "POST") {
      const b = await readJson(req);
      const ref = String(b.ref || "").toUpperCase().trim(), pass = String(b.pass || "").toUpperCase().trim();
      const app = readJsonl(APPS_FILE).find((a) => a.ref === ref && a.pass === pass);
      if (!app) return send(res, 404, { ok: false });
      const v = await ziinaVerifyIntentFor(app);
      const fresh = readJsonl(APPS_FILE).find((a) => a.ref === ref) || app;
      return send(res, 200, { ok: true, paid: !!fresh.paid, pay_status: fresh.pay_status || "", amount_paid: fresh.amount_paid || "" });
    }
    if (p === "/pay/success" && req.method === "GET") {
      const ref = String(url.searchParams.get("ref") || "").toUpperCase().trim();
      const intentId = String(url.searchParams.get("intent_id") || "").trim();
      const app = readJsonl(APPS_FILE).find((a) => a.ref === ref);
      if (!app || !intentId) { res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }); return res.end(ziinaPayPage("failed", ref || "unknown")); }
      try {
        const z = await ziinaGetIntent(intentId);
        const price = ziinaPrice(app.visa);
        const amountOk = !app.ziina_amount || (z.amount != null && Math.round(Number(z.amount) / 100) === Number(app.ziina_amount));
        const curOk = !app.ziina_currency || !z.currency_code || String(z.currency_code).toUpperCase() === String(app.ziina_currency).toUpperCase();
        if (z && z.status === "completed" && amountOk && curOk) {
          const amt = app.ziina_amount || (price ? price.amount : "");
          const cur = app.ziina_currency || (price ? price.currency : "USD");
          ziinaMarkPaid(ref, { intentId, amountLabel: amt ? (cur + " " + amt) : "" });
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(ziinaPayPage("success", ref));
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(ziinaPayPage("failed", ref));
      } catch (e) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(ziinaPayPage("failed", ref));
      }
    }
    if (p === "/pay/cancel" && req.method === "GET") {
      const ref = String(url.searchParams.get("ref") || "").toUpperCase().trim();
      if (ref) ziinaMarkFailed(ref);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(ziinaPayPage("cancel", ref || "unknown"));
    }
    if (p === "/api/message" && req.method === "POST") {
      const b = await readJson(req);
      const apps = readJsonl(APPS_FILE);
      const app = apps.find((a) => a.ref === String(b.ref || "").toUpperCase().trim() && a.pass === String(b.pass || "").toUpperCase().trim());
      if (!app) return send(res, 404, { ok: false });
      const text = String(b.text || "").trim().slice(0, 1000);
      if (!text) return send(res, 400, { ok: false });
      app.messages = app.messages || []; app.messages.push({ from: "client", text, at: new Date().toISOString() });
      app.updated = new Date().toISOString(); writeJsonl(APPS_FILE, apps);
      return send(res, 200, { ok: true, messages: app.messages });
    }
    if (p === "/api/doc" && req.method === "POST") {
      const b = await readJson(req);
      const app = readJsonl(APPS_FILE).find((a) => a.ref === String(b.ref || "").toUpperCase().trim() && a.pass === String(b.pass || "").toUpperCase().trim());
      if (!app) return send(res, 404, { ok: false });
      const meta = b.kind === "resolution" ? (app.resolution && app.resolution.proof) : app.issuedDoc;
      if (!meta) return send(res, 404, { ok: false });
      const fp = path.join(UPLOADS, app.ref, path.basename(meta.file || meta.name));
      if (!fp.startsWith(UPLOADS) || !fs.existsSync(fp)) return send(res, 404, { ok: false });
      res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream", "Content-Disposition": "attachment; filename=\"" + path.basename(fp) + "\"" });
      return fs.createReadStream(fp).pipe(res);
    }
    /* ---------- admin APIs ---------- */
    if (p === "/api/admin/login" && req.method === "POST") {
      if (!ADMIN_PASS) return send(res, 503, { ok: false, error: "Admin is not switched on yet - set ADMIN_PASS on the server." });
      const ip = req.socket.remoteAddress || "?";
      if (loginLimited(ip)) return send(res, 429, { ok: false, error: "Too many attempts - try again in a few minutes." });
      const b = await readJson(req);
      const userIn = String(b.user || ""), passIn = String(b.password || "");
      let role = null;
      const tryPass = (want) => { const g = Buffer.from(passIn); const w = Buffer.from(want); return g.length === w.length && crypto.timingSafeEqual(g, w); };
      if (userIn === ADMIN_USER && tryPass(ADMIN_PASS)) role = "admin";
      else if (STAFF_PASS && userIn === STAFF_USER && tryPass(STAFF_PASS)) role = "staff";
      if (!role) return send(res, 401, { ok: false, error: "Wrong username or password." });
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { exp: Date.now() + 12 * 60 * 60 * 1000, idle: Date.now() + Number(process.env.ADMIN_IDLE_MS || 30 * 60 * 1000), role, user: userIn });
      return send(res, 200, { ok: true, role }, { "Set-Cookie": "vsa_admin=" + token + "; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200; Secure" });
    }
    if (p.startsWith("/api/admin/")) {
      if (!adminAuth(req)) return send(res, 401, { ok: false, error: "Not signed in." });
      if (p === "/api/admin/logout" && req.method === "POST") {
        const m = (req.headers.cookie || "").match(/vsa_admin=([a-f0-9]{64})/); if (m) sessions.delete(m[1]);
        return send(res, 200, { ok: true }, { "Set-Cookie": "vsa_admin=; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=Lax" });
      }
      const ADMIN_ONLY = ["/api/admin/settings", "/api/admin/test-email", "/api/admin/blog", "/api/admin/reviews", "/api/admin/content", "/api/admin/backup", "/api/admin/restore", "/api/admin/media", "/api/admin/guides", "/api/admin/pay/check"];
      if (ADMIN_ONLY.some((x) => p === x || p.startsWith(x + "/")) && !isAdminRole(req)) return send(res, 403, { ok: false, error: "Admin role required for this section." });
      if (p === "/api/admin/me" && req.method === "GET") { const ms = adminSess(req); return send(res, 200, { ok: true, role: ms.role, user: ms.user }); }
      if (p === "/api/admin/apps" && req.method === "GET") {
        const apps = readJsonl(APPS_FILE).slice().reverse();
        return send(res, 200, { ok: true, apps, stages: STAGES });
      }
      if (p === "/api/admin/enquiries" && req.method === "GET") {
        return send(res, 200, { ok: true, enquiries: readJsonl(ENQ_FILE).slice().reverse() });
      }
      if (p === "/api/admin/status" && req.method === "POST") {
        const b = await readJson(req);
        const apps = readJsonl(APPS_FILE);
        const app = apps.find((a) => a.ref === String(b.ref || "").toUpperCase());
        if (!app) return send(res, 404, { ok: false });
        const stage = Math.max(0, Math.min(STAGES.length - 1, parseInt(b.stage, 10) || 0));
        app.stage = stage; app.updated = new Date().toISOString();
        app.history.push({ stage, at: app.updated, by: "admin", note: String(b.note || "").slice(0, 300), clientNote: String(b.clientNote || "").slice(0, 300), officialRef: String(b.officialRef || "").slice(0, 60) });
        if (b.officialRef) app.officialRef = String(b.officialRef).slice(0, 60);
        writeJsonl(APPS_FILE, apps);
        if (app.email) smtpSend(app.email, "Your Saudi visa application " + app.ref + " - update", "Dear " + app.name + ",\n\nYour Saudi visa application " + app.ref + " has moved to: " + STAGES[stage] + "." + (b.clientNote ? "\n\nMessage from our team: " + String(b.clientNote) : "") + "\n\nTrack your application any time at https://visit-saudi.ae/track with your reference and passport number.\n\nVisit Saudi (visit-saudi.ae) - Brightlink Management Consultancy LLC");
        return send(res, 200, { ok: true, stage });
      }
      if (p === "/api/admin/pay/check" && req.method === "POST") {
        const b = await readJson(req);
        const app = readJsonl(APPS_FILE).find((a) => a.ref === String(b.ref || "").toUpperCase().trim());
        if (!app) return send(res, 404, { ok: false });
        await ziinaVerifyIntentFor(app);
        const fresh = readJsonl(APPS_FILE).find((a) => a.ref === app.ref) || app;
        return send(res, 200, { ok: true, paid: !!fresh.paid, pay_status: fresh.pay_status || "", amount_paid: fresh.amount_paid || "" });
      }
      if (p === "/api/admin/create" && req.method === "POST") {
        const b = await readJson(req);
        if (!b.name || !b.pass) return send(res, 400, { ok: false, error: "Name and passport number are required." });
        const apps = readJsonl(APPS_FILE);
        const ref = newRef(apps);
        const now = new Date().toISOString();
        apps.push({ ref, visa: String(b.visa || "tourist").slice(0, 30), name: String(b.name).slice(0, 90), nat: String(b.nat || "").slice(0, 60), pass: String(b.pass).toUpperCase().slice(0, 30), dob: "", email: String(b.email || "").slice(0, 120), phone: String(b.phone || "").slice(0, 40), entry: String(b.entry || "").slice(0, 12), exit: "", city: "", purpose: "", stage: 0, docs: [], created: now, updated: now, history: [{ stage: 0, at: now, by: "admin", note: "Created manually in admin" }] });
        writeJsonl(APPS_FILE, apps);
        return send(res, 200, { ok: true, ref });
      }

      if (p === "/api/admin/blog" && req.method === "GET") return send(res, 200, { ok: true, posts: readStore(BLOG_FILE, []) });
      if (p === "/api/admin/blog" && req.method === "POST") {
        const b = await readJson(req);
        if (!b.title) return send(res, 400, { ok: false, error: "Title required" });
        let posts = readStore(BLOG_FILE, []);
        const slug = slugify(b.slug || b.title);
        const post = { slug, title: String(b.title).slice(0, 140), cat: String(b.cat || "News").slice(0, 40), excerpt: String(b.excerpt || "").slice(0, 300), body: String(b.body || "").slice(0, 30000), image: String(b.image || "").slice(0, 300), date: new Date().toISOString().slice(0, 10), published: b.published !== false };
        const i = posts.findIndex((x) => x.slug === slug);
        if (i >= 0) posts[i] = post; else posts.unshift(post);
        writeStore(BLOG_FILE, posts);
        return send(res, 200, { ok: true, slug });
      }
      if (p === "/api/admin/blog/delete" && req.method === "POST") {
        const b = await readJson(req);
        writeStore(BLOG_FILE, readStore(BLOG_FILE, []).filter((x) => x.slug !== b.slug));
        return send(res, 200, { ok: true });
      }
      if (p === "/api/admin/reviews" && req.method === "GET") return send(res, 200, { ok: true, reviews: readStore(REVIEWS_FILE, []) });
      if (p === "/api/admin/reviews" && req.method === "POST") {
        const b = await readJson(req);
        if (!b.name || !b.text) return send(res, 400, { ok: false, error: "Name and review text required" });
        const list = readStore(REVIEWS_FILE, []);
        list.unshift({ name: String(b.name).slice(0, 60), country: String(b.country || "").slice(0, 60), visa: String(b.visa || "").slice(0, 40), rating: Math.max(1, Math.min(5, parseInt(b.rating, 10) || 5)), text: String(b.text).slice(0, 600), date: new Date().toISOString().slice(0, 10), visible: b.visible !== false });
        writeStore(REVIEWS_FILE, list);
        return send(res, 200, { ok: true, reviews: list });
      }
      if (p === "/api/admin/reviews/delete" && req.method === "POST") {
        const b = await readJson(req);
        const list = readStore(REVIEWS_FILE, []); list.splice(parseInt(b.index, 10) || 0, 1);
        writeStore(REVIEWS_FILE, list);
        return send(res, 200, { ok: true, reviews: list });
      }
      if (p === "/api/admin/settings" && req.method === "GET") {
        const s = getSettings();
        return send(res, 200, { ok: true, settings: { whatsapp: s.whatsapp, email: s.email, notifyEmail: s.notifyEmail, prices: s.prices || {}, smtp: { host: s.smtp.host, port: s.smtp.port, user: s.smtp.user, from: s.smtp.from, hasPass: !!s.smtp.pass }, payments: { enabled: !!s.payments.enabled, provider: s.payments.provider, mode: s.payments.mode, pubKey: s.payments.pubKey, hasSecret: !!s.payments.secretKey, hasWebhook: !!s.payments.webhookSecret } } });
      }
      if (p === "/api/admin/settings" && req.method === "POST") {
        const b = await readJson(req); const s = getSettings();
        s.whatsapp = String(b.whatsapp || s.whatsapp).replace(/[^0-9]/g, "").slice(0, 20);
        s.email = String(b.email || s.email).slice(0, 120);
        s.notifyEmail = String(b.notifyEmail !== undefined ? b.notifyEmail : s.notifyEmail).slice(0, 120);
        if (b.smtp) { s.smtp.host = String(b.smtp.host || "").slice(0, 80); s.smtp.port = parseInt(b.smtp.port, 10) || 587; s.smtp.user = String(b.smtp.user || "").slice(0, 120); s.smtp.from = String(b.smtp.from || "").slice(0, 120); if (b.smtp.pass) s.smtp.pass = String(b.smtp.pass).slice(0, 200); }
        if (b.payments && typeof b.payments === "object") { s.payments.enabled = !!b.payments.enabled; s.payments.provider = String(b.payments.provider || "").slice(0, 40); s.payments.mode = b.payments.mode === "live" ? "live" : "test"; s.payments.pubKey = String(b.payments.pubKey || "").slice(0, 200); if (b.payments.secretKey) s.payments.secretKey = String(b.payments.secretKey).slice(0, 300); if (b.payments.webhookSecret) s.payments.webhookSecret = String(b.payments.webhookSecret).slice(0, 300); }
        if (b.prices && typeof b.prices === "object") { s.prices = {}; for (const k of Object.keys(b.prices).slice(0, 20)) { const v = b.prices[k] || {}; const amt = parseFloat(v.amount); if (!isNaN(amt) && amt > 0) s.prices[String(k).slice(0, 40)] = { amount: amt, currency: String(v.currency || "AED").slice(0, 5).toUpperCase() }; } }
        writeStore(SETTINGS_FILE, s);
        return send(res, 200, { ok: true });
      }
      if (p === "/api/admin/test-email" && req.method === "POST") {
        const b = await readJson(req);
        const ok = await smtpSend(String(b.to || "").slice(0, 120), "visit-saudi.ae email test", "This is a test email from your visit-saudi.ae website. Email notifications are working.");
        return send(res, 200, { ok });
      }
      if (p === "/api/admin/message" && req.method === "POST") {
        const b = await readJson(req);
        const apps = readJsonl(APPS_FILE); const app = apps.find((a) => a.ref === String(b.ref || "").toUpperCase());
        if (!app) return send(res, 404, { ok: false });
        app.messages = app.messages || []; app.messages.push({ from: "team", text: String(b.text || "").slice(0, 1000), at: new Date().toISOString() });
        app.updated = new Date().toISOString(); writeJsonl(APPS_FILE, apps);
        return send(res, 200, { ok: true, messages: app.messages });
      }
      if (p === "/api/admin/resolution" && req.method === "POST") {
        const b = await readJson(req);
        const apps = readJsonl(APPS_FILE); const app = apps.find((a) => a.ref === String(b.ref || "").toUpperCase());
        if (!app) return send(res, 404, { ok: false });
        if (!b.status) { app.resolution = null; }
        else {
          app.resolution = app.resolution || {};
          app.resolution.status = String(b.status).slice(0, 30); app.resolution.amount = String(b.amount || "").slice(0, 30);
          app.resolution.date = String(b.date || "").slice(0, 12); app.resolution.comment = String(b.comment || "").slice(0, 500);
          if (b.proofData) { const f = storeDoc(app.ref, b.proofData, b.proofName || "refund-proof.pdf"); if (f) app.resolution.proof = { name: String(b.proofName || f).slice(0, 80), file: f }; }
        }
        app.updated = new Date().toISOString(); writeJsonl(APPS_FILE, apps);
        return send(res, 200, { ok: true, resolution: app.resolution });
      }
      if (p === "/api/admin/issued" && req.method === "POST") {
        const b = await readJson(req);
        const apps = readJsonl(APPS_FILE); const app = apps.find((a) => a.ref === String(b.ref || "").toUpperCase());
        if (!app) return send(res, 404, { ok: false });
        const f = storeDoc(app.ref, b.data, b.name || "evisa.pdf");
        if (!f) return send(res, 400, { ok: false, error: "File rejected - PDF or image, max 8MB." });
        app.issuedDoc = { name: String(b.name || f).slice(0, 80), file: f };
        app.updated = new Date().toISOString(); writeJsonl(APPS_FILE, apps);
        return send(res, 200, { ok: true, issuedDoc: app.issuedDoc });
      }
      if (p === "/api/admin/reviews/visible" && req.method === "POST") {
        const b = await readJson(req);
        const list = readStore(REVIEWS_FILE, []); const i = parseInt(b.index, 10) || 0;
        if (list[i]) { list[i].visible = b.visible !== false; writeStore(REVIEWS_FILE, list); }
        return send(res, 200, { ok: true, reviews: list });
      }
      if (p === "/api/admin/guides" && req.method === "GET") {
        const slug = url.searchParams.get("slug");
        const govs = getGuideOverrides();
        if (slug) {
          const g = listBuiltGuides().find((x) => x.slug === slug);
          if (!g) return send(res, 404, { ok: false });
          const ov = govs[slug];
          let bodyText = ov && ov.body ? ov.body : "";
          if (!bodyText) { try { const h = fs.readFileSync(path.join(ROOT, "guides", slug + ".html"), "utf8"); const z = guideZone(h); bodyText = z ? zoneToText(h.slice(z.a, z.b)) : ""; } catch (e) {} }
          const merged = Object.assign({}, g, ov || {}, { slug }); delete merged.body;
          return send(res, 200, { ok: true, guide: merged, bodyText, edited: !!ov });
        }
        const list = listBuiltGuides().map((g) => { const ov = govs[g.slug]; return ov ? Object.assign({}, g, { title: ov.title || g.title, cat: ov.cat || g.cat, excerpt: ov.excerpt || g.excerpt, image: ov.image || g.image, edited: true, published: ov.published !== false }) : Object.assign({}, g, { edited: false, published: true }); });
        return send(res, 200, { ok: true, guides: list });
      }
      if (p === "/api/admin/guides/edit" && req.method === "POST") {
        const b = await readJson(req);
        const slug = String(b.slug || "");
        if (!listBuiltGuides().some((x) => x.slug === slug)) return send(res, 404, { ok: false, error: "Guide not found" });
        const govs = getGuideOverrides();
        govs[slug] = { title: String(b.title || "").slice(0, 140), cat: String(b.cat || "").slice(0, 40), excerpt: String(b.excerpt || "").slice(0, 300), image: String(b.image || "").slice(0, 300), body: String(b.body || "").slice(0, 60000), published: b.published !== false, updatedAt: new Date().toISOString() };
        writeStore(GUIDE_OVERRIDES_FILE, govs); _govCache = null;
        return send(res, 200, { ok: true });
      }
      if (p === "/api/admin/guides/reset" && req.method === "POST") {
        const b = await readJson(req);
        const govs = getGuideOverrides(); delete govs[String(b.slug || "")];
        writeStore(GUIDE_OVERRIDES_FILE, govs); _govCache = null;
        return send(res, 200, { ok: true });
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
        const up = fs.existsSync(MEDIA_DIR) ? fs.readdirSync(MEDIA_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort().reverse().map((f) => ({ name: f, url: "/media/" + f, builtin: false })) : [];
        const bl = [];
        (function walk(d, pre) { let ents = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } ents.forEach((en) => { if (en.isDirectory()) walk(path.join(d, en.name), pre + en.name + "/"); else if (/\.(png|jpe?g|webp|svg)$/i.test(en.name)) bl.push({ name: pre + en.name, url: "/assets/img/" + pre + en.name, builtin: true }); }); })(path.join(ROOT, "assets", "img"), "");
        bl.sort((a, b) => (a.name < b.name ? -1 : 1));
        return send(res, 200, { ok: true, files: up.concat(bl) });
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
        const data = { exportedAt: new Date().toISOString(), apps: readJsonl(APPS_FILE), enquiries: readJsonl(ENQ_FILE), blog: readStore(BLOG_FILE, []), reviews: readStore(REVIEWS_FILE, []), settings: Object.assign({}, s, { smtp: Object.assign({}, s.smtp, { pass: "" }), payments: Object.assign({}, s.payments, { secretKey: "", webhookSecret: "" }) }), contentEdits: getAllEdits(), customerNotes: readStore(CUSTOMERS_FILE, {}) };
        res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=\"visit-saudi-backup.json\"" });
        return res.end(JSON.stringify(data, null, 1));
      }
      if (p === "/api/admin/restore" && req.method === "POST") {
        const b = await readJson(req); const d = b.data || b;
        if (Array.isArray(d.apps)) writeJsonl(APPS_FILE, d.apps);
        if (Array.isArray(d.enquiries)) writeJsonl(ENQ_FILE, d.enquiries);
        if (Array.isArray(d.blog)) writeStore(BLOG_FILE, d.blog);
        if (Array.isArray(d.reviews)) writeStore(REVIEWS_FILE, d.reviews);
        if (d.settings) { const cur = getSettings(); const ns = Object.assign({}, cur, d.settings, { smtp: Object.assign({}, cur.smtp, (d.settings.smtp || {}), { pass: (d.settings.smtp && d.settings.smtp.pass) || cur.smtp.pass }), payments: Object.assign({}, cur.payments, (d.settings.payments || {}), { secretKey: (d.settings.payments && d.settings.payments.secretKey) || cur.payments.secretKey, webhookSecret: (d.settings.payments && d.settings.payments.webhookSecret) || cur.payments.webhookSecret }) }); writeStore(SETTINGS_FILE, ns); }
        if (d.contentEdits) writeStore(CONTENT_FILE, d.contentEdits);
        if (d.customerNotes) writeStore(CUSTOMERS_FILE, d.customerNotes);
        return send(res, 200, { ok: true });
      }
      if (p === "/api/admin/download" && req.method === "GET") {
        const ref = String(url.searchParams.get("ref") || "").toUpperCase();
        const file = path.basename(String(url.searchParams.get("file") || ""));
        const fp = path.join(UPLOADS, ref, file);
        if (!fp.startsWith(UPLOADS) || !fs.existsSync(fp)) return send(res, 404, { ok: false });
        res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream", "Content-Disposition": (url.searchParams.get("inline") ? "inline" : "attachment") + "; filename=\"" + file + "\"" });
        return fs.createReadStream(fp).pipe(res);
      }
      return send(res, 404, { ok: false });
    }
    if (p.startsWith("/api/")) return send(res, 404, { ok: false });
    if (req.method === "GET" && p.startsWith("/media/")) {
      const mf = path.join(MEDIA_DIR, path.basename(p));
      if (fs.existsSync(mf)) { res.writeHead(200, { "Content-Type": MIME[path.extname(mf).toLowerCase()] || "application/octet-stream", "Cache-Control": "public, max-age=86400" }); return fs.createReadStream(mf).pipe(res); }
      return send(res, 404, { ok: false });
    }
    if (req.method === "GET" && /^\/i18n\/[a-z]{2}\.json$/.test(p)) {
      const fp2 = path.join(I18N_DIR, path.basename(p));
      if (fs.existsSync(fp2)) { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }); return fs.createReadStream(fp2).pipe(res); }
      return send(res, 404, { ok: false });
    }
    /* ---------- static ---------- */
    if (p.endsWith(".html")) {
      let clean = p.slice(0, -5);
      if (clean === "/index") clean = "/";
      else if (clean.endsWith("/index")) clean = clean.slice(0, -5);
      res.writeHead(301, { Location: (reqLang ? "/" + reqLang : "") + clean + (url.search || "") });
      return res.end();
    }
    if (req.method === "GET" && !p.startsWith("/assets/") && p !== "/admin" && p !== ADMIN_PATH) { try { appendJsonl(STATS_FILE, { t: "view", path: p, lang: reqLang || "en", day: new Date().toISOString().slice(0, 10), at: new Date().toISOString() }); } catch (e) {} }
    let rel = p === "/" ? "/index.html" : p;
    if (p === "/admin") { res.writeHead(404, { "Content-Type": "text/html" }); return res.end("<h1 style='font-family:sans-serif'>Page not found</h1><p><a href='/'>Visit Saudi - home</a></p>"); }
    if (rel === ADMIN_PATH) rel = "/admin.html";
    if (!path.extname(rel)) rel = rel + ".html";
    const fp = path.join(ROOT, decodeURIComponent(rel));
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/html" });
      return res.end("<h1 style='font-family:sans-serif'>Page not found</h1><p><a href='/'>Visit Saudi - home</a></p>");
    }
    if (fp.endsWith(".html") && !fp.endsWith("admin.html")) {
      const govs = getGuideOverrides();
      if (Object.keys(govs).length) {
        const gm = p.match(/^\/guides\/([a-z0-9-]+)$/);
        let govHtml = null;
        if (gm && govs[gm[1]]) {
          if (govs[gm[1]].published === false) { res.writeHead(404, { "Content-Type": "text/html" }); return res.end("<h1 style='font-family:sans-serif'>Page not found</h1><p><a href='/'>Visit Saudi - home</a></p>"); }
          govHtml = applyGuideOverride(fs.readFileSync(fp, "utf8"), govs[gm[1]]);
        } else if (p === "/guides") {
          govHtml = applyIndexOverrides(fs.readFileSync(fp, "utf8"), govs);
        }
        if (govHtml !== null) {
          let out = govHtml;
          if (reqLang) out = translateHtml(out, reqLang, p); else out = applyEditsEn(out);
          res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" });
          return res.end(out);
        }
      }
    }
    if (!reqLang && fp.endsWith(".html") && !fp.endsWith("admin.html")) {
      const edEn = getEdits("en");
      if (edEn && Object.keys(edEn).length) { res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" }); return res.end(applyEditsEn(fs.readFileSync(fp, "utf8"))); }
    }
    if (reqLang && fp.endsWith(".html") && !fp.endsWith("admin.html")) {
      res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" });
      return res.end(translateHtml(fs.readFileSync(fp, "utf8"), reqLang, p));
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp).toLowerCase()] || "application/octet-stream", "Cache-Control": fp.endsWith(".html") ? "no-cache" : "public, max-age=86400" });
    fs.createReadStream(fp).pipe(res);
  } catch (e) {
    send(res, 500, { ok: false, error: "Server error" });
  }
});
server.listen(PORT, () => console.log("Visit Saudi app listening on port " + PORT + " (data: " + DATA + ", admin: " + (ADMIN_PASS ? "on" : "off - set ADMIN_PASS") + ")"));
