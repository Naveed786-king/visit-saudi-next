#!/usr/bin/env bash
# The AI website assistant and the Auto Publisher's articles on the website (fake AI, no keys needed).
set -eu
B=http://localhost:3000
fail() { echo "::error title=AI test failed::$1"; exit 1; }

# ---- the assistant is off: pages stay exactly as before
curl -sf "$B/" | grep -q 'vs-chat.js' && fail "chat script on the page while the assistant is off"
# switch it on
curl -sf -b cookies.txt -X PUT "$B/api/admin/chatbot" -H 'Content-Type: application/json' -d '{"config":{"enabled":true,"provider":"gemini","key":"ci-dummy-key"}}' >/dev/null || fail "save chatbot settings"
sleep 16
P=$(curl -sf "$B/")
echo "$P" | grep -q '<script src="/vs-chat.js' || fail "chat script missing when switched on"
echo "$P" | grep -q 'window.VS_CHAT=' || fail "chat settings missing"
curl -sfL "$B/ar/" | grep -q 'السلام عليكم' || fail "Arabic greeting"
curl -sf "$B/vs-chat.js" | grep -q 'chatPanel' || fail "chat script file"
R=$(curl -sf -X POST "$B/api/chat" -H 'Content-Type: application/json' -d '{"message":"Which visa do I need for Umrah?","locale":"en","page":"/"}') || fail "chat reply"
echo "chat: $R"
echo "$R" | grep -q '"reply"' || fail "no reply"
R=$(curl -sf -X POST "$B/api/chat" -H 'Content-Type: application/json' -d '{"message":"I want to talk to a specialist","locale":"en","page":"/"}')
echo "$R" | grep -q 'wa.me' || fail "no WhatsApp hand-over"
curl -sf -b cookies.txt "$B/api/admin/chatbot/chats" | grep -q 'Asked for a specialist' || fail "chat not saved for the admin"
# switch it off again
curl -sf -b cookies.txt -X PUT "$B/api/admin/chatbot" -H 'Content-Type: application/json' -d '{"config":{"enabled":false}}' >/dev/null
sleep 16
curl -sf "$B/" | grep -q 'vs-chat.js' && fail "chat script still on the page after switching off"

# ---- an Auto Publisher article becomes a website post (with its quick answer and FAQ in the guide design)
node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.post.create({ data: { slug: "ci-auto-article", title: "CI Auto Article", excerpt: "CI auto summary", author: "Visit Saudi", status: "published", category: "Eligibility",
  content: "<div class=\"quick-answer\"><p><strong>Quick answer</strong></p><p>CI quick answer text.</p></div><h2>First part</h2><p>CI auto body.</p><section class=\"post-faq\"><h2>Frequently asked questions</h2><h3>CI question?</h3><p>CI answer.</p></section>" } })
 .then(() => p.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
'
curl -sf -b cookies.txt "$B/api/admin/vs-content/posts" | grep -q '"auto":true' || fail "Auto Publisher article not in the posts list"
sleep 6
A=$(curl -sf "$B/guides/ci-auto-article") || fail "auto article page"
echo "$A" | grep -q 'CI quick answer text.' || fail "quick answer"
echo "$A" | grep -q '<details class="afaq"><summary>CI question?</summary>' || fail "FAQ in the guide design"
echo "$A" | grep -q '<h2 id="sec-0">First part</h2>' || fail "sections for the guide box"
curl -sf "$B/guides" | grep -q 'href="/guides/ci-auto-article"' || fail "auto article card"
curl -sf -b cookies.txt -X POST "$B/api/admin/vs-content/post-delete" -H 'Content-Type: application/json' -d '{"kind":"post","slug":"ci-auto-article"}' >/dev/null
curl -sf -b cookies.txt "$B/api/admin/vs-content/posts" | grep -q 'ci-auto-article' && fail "deleted auto article came back"
sleep 6
[ "$(curl -s -o /dev/null -w '%{http_code}' "$B/guides/ci-auto-article")" = "404" ] || fail "deleted auto article still shown"
for pth in /admin/chatbot /admin/autopublisher; do code=$(curl -s -o /dev/null -w "%{http_code}" -b cookies.txt "$B$pth"); echo "$pth -> $code"; [ "$code" = "200" ] || fail "$pth"; done
echo "All AI tests passed"
