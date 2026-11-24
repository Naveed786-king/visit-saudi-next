# Fill translation caches via the free Google MT endpoint. Resumable: cached strings are skipped.
# Seeds: hand translations from build.py I18N win over MT; overrides file wins over everything.
import os, json, sys, time, threading, urllib.parse, urllib.request, importlib.util
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(__file__)
CACHE_DIR = os.path.join(HERE, "i18n")
LANGS = ["ar","ru","de","es","fr","tr","zh","ur","hi","it","ro","pt","pl","hu","hr","sk","cs","id"]
SEP = "\n§§§\n"
KEEP = {"Visit Saudi","VISIT-SAUDI.AE","WhatsApp","Brightlink Management Consultancy LLC",
        "info@visit-saudi.ae","Saudi Arabia","Nusuk","Absher","VSA-","ksavisa.sa","visa.mofa.gov.sa","visa.visitsaudi.com"}

def load_json(path, default):
    try: return json.load(open(path, encoding="utf-8"))
    except Exception: return default

def seed_from_i18n():
    spec = importlib.util.spec_from_file_location("vsa_build", os.path.join(HERE, "build.py"))
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
        i18n = getattr(mod, "I18N", {})
    except Exception as e:
        print("seed skipped:", e); return {}
    seeds = {}
    en = i18n.get("en", {})
    for lang, table in i18n.items():
        if lang == "en": continue
        m = {}
        for k, en_text in en.items():
            if k in table and table[k] and table[k] != en_text:
                m[en_text] = table[k]
        seeds[lang] = m
    return seeds

def translate_batch(texts, lang):
    joined = SEP.join(texts)
    url = "https://translate.googleapis.com/translate_a/single?" + urllib.parse.urlencode(
        {"client": "gtx", "sl": "en", "tl": lang, "dt": "t", "q": joined})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    out = "".join(seg[0] for seg in data[0] if seg and seg[0])
    parts = out.split("§§§")
    parts = [p.strip("\n ").strip() for p in parts]
    if len(parts) != len(texts):
        return None
    return parts

def translate_one(text, lang):
    url = "https://translate.googleapis.com/translate_a/single?" + urllib.parse.urlencode(
        {"client": "gtx", "sl": "en", "tl": lang, "dt": "t", "q": text})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    return "".join(seg[0] for seg in data[0] if seg and seg[0]).strip()

def batches(strings, max_chars=1500, max_items=12):
    batch, size = [], 0
    for s in strings:
        if batch and (size + len(s) > max_chars or len(batch) >= max_items):
            yield batch; batch, size = [], 0
        batch.append(s); size += len(s)
    if batch: yield batch

def fill_language(lang, catalog, seeds, overrides):
    path = os.path.join(CACHE_DIR, f"{lang}.json")
    cache = load_json(path, {})
    cache.update(seeds.get(lang, {}))
    cache.update(overrides)
    todo = [s for s in catalog if s not in cache]
    passthrough = [s for s in todo if s in KEEP or "@" in s or "http" in s]
    for s in passthrough: cache[s] = s
    todo = [s for s in todo if s not in passthrough]
    print(f"[{lang}] {len(cache)} cached, {len(todo)} to translate", flush=True)
    lock = threading.Lock()
    done = [0]
    def work(batch):
        try:
            res = translate_batch(batch, lang)
            if res is None: raise ValueError("segment mismatch")
            pairs = list(zip(batch, res))
        except Exception:
            pairs = []
            for s in batch:
                try: pairs.append((s, translate_one(s, lang)))
                except Exception: pass
                time.sleep(0.05)
        with lock:
            for k, v in pairs:
                if v: cache[k] = v
            done[0] += len(pairs)
            if done[0] % 200 < len(batch) or done[0] >= len(todo):
                json.dump(cache, open(path, "w", encoding="utf-8"), ensure_ascii=False)
                print(f"[{lang}] {done[0]}/{len(todo)}", flush=True)
        time.sleep(0.05)
    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(work, list(batches(todo))))
    json.dump(cache, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"[{lang}] DONE {len(cache)} strings", flush=True)

if __name__ == "__main__":
    core = load_json(os.path.join(CACHE_DIR, "catalog-core.json"), [])
    allc = load_json(os.path.join(CACHE_DIR, "catalog-all.json"), [])
    import os as _os
    if _os.environ.get("I18N_CORE_ONLY") == "1":
        catalog = core
    else:
        jsc = load_json(os.path.join(CACHE_DIR, "catalog-js.json"), [])
        catalog = core + [s for s in allc if s not in set(core)] + [s for s in jsc if s not in set(core) and s not in set(allc)]
    seeds = seed_from_i18n()
    overrides = load_json(os.path.join(CACHE_DIR, "overrides.json"), {})
    only = sys.argv[1:] or LANGS
    for lang in only:
        ov = dict(overrides)
        ov.update(load_json(os.path.join(CACHE_DIR, f"overrides-{lang}.json"), {}))
        fill_language(lang, catalog, seeds, ov)
