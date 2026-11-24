# Copy workspace caches -> app/i18n, applying per-language overrides and ALL-CAPS variants.
import os, json
HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "i18n")
DST = os.path.join(HERE, "..", "app", "i18n")
LANGS = ["ar","ru","de","es","fr","tr","zh","ur","hi","it","ro","pt","pl","hu","hr","sk","cs","id"]
def load(p, d):
    try: return json.load(open(p, encoding="utf-8"))
    except Exception: return d
for lang in LANGS:
    m = load(os.path.join(SRC, f"{lang}.json"), {})
    m.update(load(os.path.join(SRC, f"overrides-{lang}.json"), {}))
    for k, v in list(m.items()):
        u = k.upper()
        if u != k and len(k) <= 42 and any(c.isalpha() for c in k) and u not in m:
            m[u] = v
    json.dump(m, open(os.path.join(DST, f"{lang}.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(lang, len(m))
