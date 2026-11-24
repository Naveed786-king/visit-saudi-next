#!/usr/bin/env python3
"""Guide overrides (WordPress-style guide editing) + builtin media. Run once."""
import sys
P = "/home/hatch/workspace/visit-saudi/app/server.js"
s = open(P).read()
def rep(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        print("FAIL anchor x%d: %s" % (n, label)); sys.exit(1)
    s = s.replace(old, new); print("ok:", label)

# S1 helpers before SMTP section
rep('/* --- minimal SMTP sender (STARTTLS / implicit TLS / plain) --- */',
'''/* --- guide overrides: WordPress-style editing of the built-in guides --- */
const GUIDE_OVERRIDES_FILE = path.join(DATA, "guide-overrides.json");
let _govCache = null, _govMtime = 0;
function getGuideOverrides() {
  try { const st = fs.statSync(GUIDE_OVERRIDES_FILE); if (_govCache && _govMtime === st.mtimeMs) return _govCache; _govCache = JSON.parse(fs.readFileSync(GUIDE_OVERRIDES_FILE, "utf8")); _govMtime = st.mtimeMs; return _govCache; } catch (e) { return {}; }
}
function guideZone(html) { const a = html.indexOf('<h2 id="sec-'); if (a < 0) return null; const b = html.indexOf('<div class="authorcard">', a); if (b < 0) return null; return { a, b }; }
function zoneToText(zone) {
  const out = []; const re = /<(h2|h3|p|li)[^>]*>([\\s\\S]*?)<\\/\\1>/g; let m;
  while ((m = re.exec(zone))) { const t = decEnt(m[2].replace(/<[^>]+>/g, "")).replace(/\\s+/g, " ").trim(); if (!t) continue; out.push(m[1] === "h2" ? "## " + t : m[1] === "h3" ? "### " + t : t); }
  return out.join("\\n\\n");
}
function textToZone(text) {
  let sec = 0;
  return String(text || "").split(/\\n\\s*\\n/).map((block) => { const t = block.trim(); if (!t) return ""; if (t.indexOf("## ") === 0) return '<h2 id="sec-' + (sec++) + '">' + escText(t.slice(3)) + "</h2>"; if (t.indexOf("### ") === 0) return "<h3>" + escText(t.slice(4)) + "</h3>"; return "<p>" + escText(t).replace(/\\n/g, "<br>") + "</p>"; }).filter(Boolean).join("\\n");
}
function applyGuideOverride(html, ov) {
  if (ov.title) {
    html = html.replace(/<title>([\\s\\S]*?)<\\/title>/, (mm, t1) => { const i = t1.indexOf(" |"); return "<title>" + escText(ov.title) + (i >= 0 ? t1.slice(i) : "") + "</title>"; });
    html = html.replace(/(<h1[^>]*>)[\\s\\S]*?(<\\/h1>)/, (mm, o, c) => o + escText(ov.title) + c);
  }
  if (ov.excerpt) html = html.replace(/(<meta name="description" content=")[^"]*(")/, (mm, a, b) => a + escAttr(ov.excerpt) + b);
  if (ov.body) { const z = guideZone(html); if (z) html = html.slice(0, z.a) + textToZone(ov.body) + "\\n" + html.slice(z.b); }
  return html;
}
function applyIndexOverrides(html, govs) {
  return html.replace(/<article class="post[^"]*"[^>]*>[\\s\\S]*?<\\/article>/g, (card) => {
    const m = card.match(/href="\\/guides\\/([a-z0-9-]+)"/); if (!m) return card;
    const ov = govs[m[1]]; if (!ov) return card;
    if (ov.published === false) return "";
    let out = card;
    if (ov.title) out = out.replace(/(<h3><a[^>]*>)[\\s\\S]*?(<\\/a><\\/h3>)/, (mm, a, b) => a + escText(ov.title) + b);
    if (ov.excerpt) out = out.replace(/(<\\/h3>\\s*<p>)[\\s\\S]*?(<\\/p>)/, (mm, a, b) => a + escText(ov.excerpt) + b);
    if (ov.image) out = out.replace(/(<img[^>]*src=")[^"]*(")/, (mm, a, b) => a + escAttr(ov.image) + b);
    if (ov.cat) { out = out.replace(/data-cat="[^"]*"/, 'data-cat="' + escAttr(ov.cat) + '"'); out = out.replace(/(<span class="pill">)[\\s\\S]*?(<\\/span>)/, (mm, a, b) => a + escText(ov.cat) + b); }
    if (ov.title || ov.excerpt || ov.cat) { const q = ((ov.title || "") + " " + (ov.excerpt || "") + " " + (ov.cat || "")).toLowerCase(); out = out.replace(/data-q="[^"]*"/, 'data-q="' + escAttr(q) + '"'); }
    return out;
  });
}
function listBuiltGuides() {
  const gdir = path.join(ROOT, "guides");
  let files = []; try { files = fs.readdirSync(gdir).filter((f) => f.endsWith(".html")); } catch (e) {}
  let indexHtml = ""; try { indexHtml = fs.readFileSync(path.join(ROOT, "guides.html"), "utf8"); } catch (e) {}
  const cards = {};
  indexHtml.replace(/<article class="post[^"]*"[^>]*>[\\s\\S]*?<\\/article>/g, (card) => { const m = card.match(/href="\\/guides\\/([a-z0-9-]+)"/); if (m) { const cm = card.match(/data-cat="([^"]*)"/); const im = card.match(/<img[^>]*src="([^"]*)"/); cards[m[1]] = { cat: cm ? decEnt(cm[1]) : "", image: im ? im[1] : "" }; } return card; });
  return files.map((f) => { const slug = f.slice(0, -5); let title = slug, excerpt = ""; try { const h = fs.readFileSync(path.join(gdir, f), "utf8"); const hm = h.match(/<h1[^>]*>([\\s\\S]*?)<\\/h1>/); if (hm) title = decEnt(hm[1].replace(/<[^>]+>/g, "")).trim(); const dm = h.match(/<meta name="description" content="([^"]*)"/); if (dm) excerpt = decEnt(dm[1]); } catch (e) {} return { slug, title, excerpt, cat: (cards[slug] || {}).cat || "", image: (cards[slug] || {}).image || "" }; });
}

/* --- minimal SMTP sender (STARTTLS / implicit TLS / plain) --- */''',
"S1 guide helpers")

# S2 gate guides
rep('const ADMIN_ONLY = ["/api/admin/settings", "/api/admin/test-email", "/api/admin/blog", "/api/admin/reviews", "/api/admin/content", "/api/admin/backup", "/api/admin/restore", "/api/admin/media"];',
    'const ADMIN_ONLY = ["/api/admin/settings", "/api/admin/test-email", "/api/admin/blog", "/api/admin/reviews", "/api/admin/content", "/api/admin/backup", "/api/admin/restore", "/api/admin/media", "/api/admin/guides"];',
    "S2 gate guides")

# S3 guides admin endpoints before customers GET
rep('''      if (p === "/api/admin/customers" && req.method === "GET") {''',
'''      if (p === "/api/admin/guides" && req.method === "GET") {
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
        const list = listBuiltGuides().map((g) => { const ov = govs[g.slug]; return ov ? Object.assign({}, g, { title: ov.title || g.title, cat: ov.cat || g.cat, edited: true, published: ov.published !== false }) : Object.assign({}, g, { edited: false, published: true }); });
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
      if (p === "/api/admin/customers" && req.method === "GET") {''',
"S3 guides endpoints")

# S4 media builtin
rep('''      if (p === "/api/admin/media" && req.method === "GET") {
        const files = fs.existsSync(MEDIA_DIR) ? fs.readdirSync(MEDIA_DIR).filter((f) => /\\.(png|jpe?g|webp)$/i.test(f)).sort().reverse().map((f) => ({ name: f, url: "/media/" + f })) : [];
        return send(res, 200, { ok: true, files });
      }''',
'''      if (p === "/api/admin/media" && req.method === "GET") {
        const up = fs.existsSync(MEDIA_DIR) ? fs.readdirSync(MEDIA_DIR).filter((f) => /\\.(png|jpe?g|webp)$/i.test(f)).sort().reverse().map((f) => ({ name: f, url: "/media/" + f, builtin: false })) : [];
        const bl = [];
        (function walk(d, pre) { let ents = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } ents.forEach((en) => { if (en.isDirectory()) walk(path.join(d, en.name), pre + en.name + "/"); else if (/\\.(png|jpe?g|webp|svg)$/i.test(en.name)) bl.push({ name: pre + en.name, url: "/assets/img/" + pre + en.name, builtin: true }); }); })(path.join(ROOT, "assets", "img"), "");
        bl.sort((a, b) => (a.name < b.name ? -1 : 1));
        return send(res, 200, { ok: true, files: up.concat(bl) });
      }''',
"S4 media builtin")

# S5 serve-time application before en-edits branch
rep('''    if (!reqLang && fp.endsWith(".html") && !fp.endsWith("admin.html")) {
      const edEn = getEdits("en");''',
'''    if (fp.endsWith(".html") && !fp.endsWith("admin.html")) {
      const govs = getGuideOverrides();
      if (Object.keys(govs).length) {
        const gm = p.match(/^\\/guides\\/([a-z0-9-]+)$/);
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
      const edEn = getEdits("en");''',
"S5 serve-time overrides")

open(P, "w").write(s)
print("ALL GUIDE PATCHES APPLIED")
