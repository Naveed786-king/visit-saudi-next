# Extract unique visible strings from generated pages -> catalog.json
import os, re, json, sys
from html.parser import HTMLParser

SITE = os.path.join(os.path.dirname(__file__), "..", "site")
SKIP_TAGS = {"script", "style", "noscript", "svg", "path"}

class TextHarvest(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.strings = set()
    def handle_starttag(self, tag, attrs):
        self.stack.append(tag)
        for k, v in attrs:
            if k in ("alt", "title", "placeholder") and v and len(v.strip()) >= 2:
                self.strings.add(v.strip())
            if k == "content":
                d = dict(attrs)
                if d.get("name") in ("description",) or d.get("property", "").startswith("og:"):
                    if v and len(v.strip()) >= 10:
                        self.strings.add(v.strip())
    def handle_endtag(self, tag):
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.stack.pop()
            if self.stack: self.stack.pop()
    def handle_data(self, data):
        if any(t in SKIP_TAGS for t in self.stack):
            return
        s = data.strip()
        if len(s) >= 2 and re.search(r"[A-Za-z]", s):
            self.strings.add(s)

def harvest(paths):
    all_s = set()
    for rel in paths:
        p = os.path.join(SITE, rel)
        if not os.path.exists(p): continue
        h = TextHarvest()
        h.feed(open(p, encoding="utf-8").read())
        all_s |= h.strings
    return sorted(all_s)

CORE = ["index.html","visa-types.html","eligibility.html","uae-residents.html","apply.html","track.html",
        "eservices.html","express.html","about.html","contact.html","faqs.html","guides.html","countries.html",
        "tools.html","tools/hijri-converter.html","tools/currency-converter.html","tools/ramadan.html","tools/arabic-name.html",
        "privacy-policy.html","terms-conditions.html","refund-policy.html"] + \
       [f"visa/{v}.html" for v in ["tourist","family","umrah","business","personal","transit","medical","work","hajj"]]

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "core"
    if mode == "core":
        strings = harvest(CORE)
    else:
        all_pages = []
        for root, _, files in os.walk(SITE):
            for f in files:
                if f.endswith(".html"):
                    all_pages.append(os.path.relpath(os.path.join(root, f), SITE))
        strings = harvest(all_pages)
    out = os.path.join(os.path.dirname(__file__), "i18n", f"catalog-{mode}.json")
    json.dump(strings, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    chars = sum(len(s) for s in strings)
    print(f"{mode}: {len(strings)} unique strings, {chars} chars -> {out}")
