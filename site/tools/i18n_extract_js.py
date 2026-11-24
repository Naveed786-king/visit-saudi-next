# Harvest user-facing strings from app.js + server.js -> catalog-js.json (strict prose filter)
import re, json, os
BAD = re.compile(r"(&&|\|\||===|!==|indexOf|esc\(|STAGES|app\.|class=|=>|;|\{|\}|\[|\]|<|>|\+\+|--|querySelector|getElement|ById|textContent|innerHTML|localStorage|fetch\(|split\(|join\(|replace\(|slice\(|charAt|toString|parseInt|Math\.|Date\(|www\.|http|\.json|\.html|\.js|\.css|px|rem|vw|vh|rgb|#)")
def prose(s):
    s = s.strip()
    if len(s) < 3 or not re.search(r"[A-Za-z]", s): return False
    if BAD.search(s): return False
    if "\\" in s or "`" in s: return False
    if s[0] in "'+).,0123456789": return False
    if " " not in s and not s.endswith((":", "!", "?", "%", ".")): return False
    words = s.split()
    if len(words) >= 2 and sum(1 for w in words if re.fullmatch(r"[A-Za-z][A-Za-z'’\-]*", w)) < len(words) * 0.5: return False
    return True
def harvest(path):
    src = open(path, encoding="utf-8").read()
    out = set()
    for m in re.finditer(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"|`((?:[^`\\]|\\.)*)`", src):
        s = next(g for g in m.groups() if g is not None)
        s = s.replace("\\'", "'").replace('\\"', '"').replace("\\n", " ")
        if "<" in s and ">" in s:
            for frag in re.split(r"<[^>]+>", s):
                frag = frag.strip().strip("'\"+ ").strip()
                if prose(frag): out.add(frag)
            continue
        if prose(s): out.add(s.strip())
    return out
base = os.path.dirname(__file__)
all_s = harvest(os.path.join(base, "..", "site", "assets", "js", "app.js")) | harvest(os.path.join(base, "..", "app", "server.js"))
out = sorted(all_s)
json.dump(out, open(os.path.join(base, "i18n", "catalog-js.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"js catalog: {len(out)} strings")
for s in out: print(" -", s)
