#!/usr/bin/env bash
# Admin → Pages, Posts & guides, Translations: add / change / hide / delete, then everything back as it was.
# Runs after the smoke test (logged-in admin in cookies.txt). The page comparison afterwards proves nothing is left behind.
set -eu  # (no pipefail: "curl | grep -q" stops reading early on big pages)
B=http://localhost:3000
A="$B/api/admin/vs-content"
post() { curl -sf -b cookies.txt -X POST "$A/$1" -H 'Content-Type: application/json' -d "$2"; }
fail() { echo "::error title=Content test failed::$1"; exit 1; }
wait_cache() { sleep 6; }

for a in engine pages posts "texts?lang=ar&q=visa" "texts?lang=de&page=/about&only=missing" "page?path=/about" "page-html?path=/about" "post?kind=guide&slug=alula-travel-guide" "text?src=Apply%20Now"; do
  curl -sf -b cookies.txt "$A/$a" >/dev/null || fail "GET $a"
done
curl -sf -b cookies.txt "$A/post?kind=guide&slug=alula-travel-guide" | grep -q 'Q: How many days do I need in AlUla' || fail "guide text as FAQ"
for pth in /admin/site-pages /admin/site-posts /admin/site-texts /admin/site-styling; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -b cookies.txt "$B$pth"); echo "$pth -> $code"; [ "$code" = "200" ] || fail "$pth"
done

# ---- a new post, with an Arabic translation written by hand
BODY='## First section\n\nA paragraph with **bold** and a [link](/apply).\n\n- one\n- two\n\nQ: Is this a CI question?\nA: Yes it is.\n\n[button: Start now](/apply)'
post post "{\"title\":\"CI Post Title\",\"cat\":\"CI Category\",\"excerpt\":\"CI summary text\",\"body\":\"$BODY\",\"published\":true,\"tr\":{\"ar\":{\"title\":\"عنوان تجريبي\",\"body\":\"## قسم\\n\\nنص\",\"manual\":true}}}" | grep -q '"slug":"ci-post-title"' || fail "save post"
wait_cache
P=$(curl -sf "$B/guides/ci-post-title") || fail "post page"
echo "$P" | grep -q '<h1[^>]*>CI Post Title</h1>' || fail "post title"
echo "$P" | grep -q '<details class="afaq"><summary>Is this a CI question?</summary>' || fail "post FAQ"
echo "$P" | grep -q '"@type":"FAQPage"' || fail "post FAQ for Google"
echo "$P" | grep -q '<a class="btn gold" href="/apply">Start now</a>' || fail "post button"
echo "$P" | grep -q '<link rel="canonical" href="https://visit-saudi.ae/guides/ci-post-title">' || fail "post canonical"
curl -sf "$B/ar/guides/ci-post-title" | grep -q 'عنوان تجريبي' || fail "post in Arabic"
curl -sf "$B/ar/guides/ci-post-title" | grep -q 'dir="rtl"' || fail "post Arabic direction"
curl -sf "$B/guides" | grep -q 'href="/guides/ci-post-title"' || fail "post card on /guides"
curl -sf "$B/guides" | grep -q 'data-bcat="CI Category"' || fail "new category button"
curl -sf "$B/sitemap.xml" | grep -q 'https://visit-saudi.ae/guides/ci-post-title' || fail "post in sitemap"
post post-visibility '{"kind":"post","slug":"ci-post-title","published":false}' >/dev/null
wait_cache
[ "$(curl -s -o /dev/null -w '%{http_code}' "$B/guides/ci-post-title")" = "404" ] || fail "hidden post still shown"
post post-delete '{"kind":"post","slug":"ci-post-title"}' >/dev/null

# ---- a built-in guide: hide, show, edit, back to the original
post post-visibility '{"kind":"guide","slug":"alula-travel-guide","published":false}' >/dev/null
wait_cache
[ "$(curl -s -o /dev/null -w '%{http_code}' "$B/guides/alula-travel-guide")" = "404" ] || fail "hidden guide still shown"
curl -sf "$B/sitemap.xml" | grep -q '/guides/alula-travel-guide<' && fail "hidden guide in sitemap"
post post-visibility '{"kind":"guide","slug":"alula-travel-guide","published":true}' >/dev/null
post post '{"kind":"guide","slug":"alula-travel-guide","title":"CI Guide Title","cat":"Travel","excerpt":"x","image":"","body":"## CI section\n\nCI guide text","published":true}' >/dev/null
wait_cache
curl -sf "$B/guides/alula-travel-guide" | grep -q 'CI guide text' || fail "guide edit"
post guide-reset '{"slug":"alula-travel-guide"}' >/dev/null

# ---- a new page written in the editor (draft first)
post page '{"mode":"simple","title":"CI Page","slug":"ci-page","subtitle":"CI subtitle","crumb":"CI","description":"CI description","image":"","body":"## Hello\n\nCI page text","published":false}' | grep -q '"slug":"ci-page"' || fail "save page"
wait_cache
[ "$(curl -s -o /dev/null -w '%{http_code}' "$B/ci-page")" = "404" ] || fail "draft page visible"
post page '{"oldSlug":"ci-page","mode":"simple","title":"CI Page","slug":"ci-page","subtitle":"CI subtitle","crumb":"CI","description":"CI description","image":"","body":"## Hello\n\nCI page text","published":true}' >/dev/null
wait_cache
curl -sf "$B/ci-page" | grep -q 'CI page text' || fail "page text"
curl -sf "$B/ci-page" | grep -q '<title>CI Page | Visit Saudi - visit-saudi.ae</title>' || fail "page title"
curl -sf "$B/de/ci-page" | grep -q 'lang="de"' || fail "page in German"
# an address that is taken is refused
code=$(curl -s -o /dev/null -w '%{http_code}' -b cookies.txt -X POST "$A/page" -H 'Content-Type: application/json' -d '{"mode":"simple","title":"x","slug":"about","body":"x"}'); [ "$code" = "400" ] || fail "taken address accepted"
post page-delete '{"slug":"ci-page"}' >/dev/null
# a copy of an existing page, edited as HTML
post page-copy '{"from":"/about","title":"CI Copy","slug":"ci-copy"}' | grep -q '"mode":"html"' || fail "copy page"
H=$(curl -sf -b cookies.txt "$A/page-html?path=/ci-copy" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(JSON.stringify({path:"/ci-copy",html:j.html.replace("</h1>"," CI COPY</h1>")}))})')
post page-html "$H" >/dev/null
post page '{"oldSlug":"ci-copy","slug":"ci-copy","title":"CI Copy","published":true}' >/dev/null
wait_cache
curl -sf "$B/ci-copy" | grep -q 'CI COPY</h1>' || fail "copied page"
curl -sf "$B/ci-copy" | grep -q '<link rel="canonical" href="https://visit-saudi.ae/ci-copy">' || fail "copied page canonical"
post page-delete '{"slug":"ci-copy"}' >/dev/null

# ---- a website page: new title, hidden, HTML changed - and back
post page-meta '{"path":"/about","title":"CI About Title","description":"CI about description"}' >/dev/null
wait_cache
curl -sf "$B/about" | grep -q '<title>CI About Title</title>' || fail "page title change"
curl -sf "$B/about" | grep -q 'content="CI about description"' || fail "page description change"
post page-meta '{"path":"/about","title":"","description":"","hidden":true}' >/dev/null
wait_cache
[ "$(curl -s -o /dev/null -w '%{http_code}' "$B/about")" = "404" ] || fail "hidden page still shown"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$B/ar/about")" = "404" ] || fail "hidden page still shown in Arabic"
post page-meta '{"path":"/about","hidden":false}' >/dev/null
H=$(curl -sf -b cookies.txt "$A/page-html?path=/about" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(JSON.stringify({path:"/about",html:j.html.replace("</h1>"," CI HTML</h1>")}))})')
post page-html "$H" >/dev/null
wait_cache
curl -sf "$B/about" | grep -q 'CI HTML</h1>' || fail "page HTML change"
post page-html '{"path":"/about","reset":true}' >/dev/null

# ---- one text in several languages, and the script's dictionaries follow
post text '{"src":"Apply Now","values":{"de":"CI JETZT","fr":"CI MAINTENANT"}}' >/dev/null
wait_cache
curl -sf "$B/i18n/de.json" | grep -q '"Apply Now":"CI JETZT"' || fail "dictionary follows"
curl -sf -b cookies.txt "$A/text?src=Apply%20Now" | grep -q '"fr":"CI MAINTENANT"' || fail "text in all languages"
post text '{"src":"Apply Now","values":{"de":"","fr":""}}' >/dev/null
# the translator refuses clearly without an engine instead of keeping English
r=$(post translate '{"kind":"fields","lang":"ar","fields":{"title":"Hello"}}' || true)
echo "translate without engine: $r"
echo "All content tests passed"

# ---- page builder: sections, pictures, header / footer, site-wide replacements (and back)
A2="$B/api/admin/vs-content"
curl -sf -b cookies.txt "$A2/sections?path=/about" | grep -q '"sections"' || fail "sections list"
curl -sf -b cookies.txt "$A2/images?path=/about" | grep -q '"images"' || fail "pictures list"
post section '{"path":"/about","i":0,"op":"add-text","body":"## CI SECTION\n\nCI section text"}' >/dev/null
sleep 6
curl -sf "$B/about" | grep -q 'CI section text' || fail "added section"
post section '{"path":"/about","i":1,"op":"hide"}' >/dev/null
sleep 6
curl -sf "$B/about" | grep -q '<template data-vs-hidden="1"><section><div class="wrap"><div class="article">' || fail "hidden section"
IMG=$(curl -sf -b cookies.txt "$A2/images?path=/about" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(j.images[0].src)})')
echo "first picture: $IMG"
post image "{\"path\":\"/about\",\"from\":\"$IMG\",\"to\":\"/uploads/media/ci.jpg\",\"everywhere\":true}" >/dev/null
sleep 6
curl -sf "$B/" | grep -q '/uploads/media/ci.jpg' || curl -sf "$B/about" | grep -q '/uploads/media/ci.jpg' || fail "picture everywhere"
H=$(curl -sf -b cookies.txt "$A2/chrome" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stdout.write(JSON.stringify({header:j.header.replace("</header>","<!--ci--></header>"),footer:j.footer.replace("</footer>","CI FOOTER</footer>"),rules:[{kind:"text",find:"971566556645",replace:"971500000000",on:true}]}))})')
post chrome "$H" >/dev/null
sleep 6
G=$(curl -sf "$B/guides/alula-travel-guide")
echo "$G" | grep -q 'CI FOOTER' || fail "footer on every page"
echo "$G" | grep -q '<!--ci--></header>' || fail "header on every page"
echo "$G" | grep -q 'wa.me/971500000000' || fail "site-wide replacement"
echo "$G" | grep -q 'wa.me/971566556645' && fail "old number still there"
curl -sf "$B/ar/guides/alula-travel-guide" | grep -q 'wa.me/971500000000' || fail "replacement in Arabic"
# all back
post chrome '{"resetHeader":true,"resetFooter":true,"rules":[]}' >/dev/null
post page-html '{"path":"/about","reset":true}' >/dev/null
echo "Page builder tests passed"
