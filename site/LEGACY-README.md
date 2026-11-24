# Visit Saudi (visit-saudi.ae) — full source

Zero-dependency Node.js app: public website + applications API + live tracking + admin console. No build step and no `npm install` needed to run it (there are no dependencies).

## What is inside

- `server.js` — the whole backend (pages, APIs, admin, Ziina payments). Includes the `.env` loader: on startup it reads a `.env` file next to it, so the app keeps its keys across restarts and reboots.
- `public/` — the finished website (306 pages: home, 11 visa pages, 197 country pages, 68 guides, tools, legal). The admin console lives here too: `public/admin.html` + `public/assets/js/admin.js`.
- `i18n/` — the finished translation dictionaries (19 languages).
- `tools/` — the site generator (`build.py` rebuilds `public/` from source) plus the translation pipeline (`i18n_extract.py`, `i18n_translate.py`, `i18n_finalize.py`) and its caches (`tools/i18n/`).
- `.env.example` — the environment variables the app needs (copy to `.env`, fill in real values).
- `HOSTINGER-TEST.md` — notes from the earlier Hostinger demo setup.

## How to run

```bash
PORT=8324 DATA_DIR=/home/visit_saudi/vsa-data ADMIN_USER=admin ADMIN_PASS='<strong password>' node server.js
```

Or copy `.env.example` to `.env` next to `server.js` and fill it in — the loader picks it up at startup. Environment variables set by the host always win over `.env`.

| Variable | What it does |
|---|---|
| `PORT` | Port the app listens on (live site: 8324) |
| `DATA_DIR` | Persistent folder for applications, enquiries, uploads and settings (NOT included in this package — live data stays on the server) |
| `ADMIN_USER` / `ADMIN_PASS` | Admin login. Admin stays off until `ADMIN_PASS` is set |
| `STAFF_PASS` | Optional second login for the staff role (limited admin) |
| `ZIINA_API_KEY` | Ziina payments key (same Ziina account as Dubai Visa Portal). Without it, payments show as unconfigured |
| `ZIINA_TEST` | Set to `true` for test-mode payments (test card only, no real charge). Remove it for live payments |
| `ADMIN_PATH` | Secret admin URL path (default is the live one — see below) |

- Public site: `/` (files in `public/`)
- **Admin: `https://visit-saudi.ae/manage-jg0ojxafgt`** — this secret path is the only admin URL. The public `/admin` returns 404 by design. Do not share the secret path publicly.
- Demo tracking sample: reference `VSA-DEMO26`, passport `X1234567` (clearly labelled as a sample on the page).

## Payments (Ziina)

Pay-after-apply for the three priced visas only (1-Year Multiple USD 300, 90-Day Multiple USD 200, 90-Day Umrah USD 250). The customer pays on Ziina's hosted page; the server re-reads the payment from Ziina before marking an application paid. **No webhook is registered on this app** — Ziina allows one webhook URL per account and Dubai Visa Portal already uses it, so closed-browser payments are picked up by the tracking-page re-check and the admin "Check payment status" button instead. Never register a webhook here or DVP payments will break.

## How to rebuild the website

```bash
python3 tools/build.py        # regenerates the site into tools/../site/
cp -r site/. public/           # copy the rebuilt site over public/
```

The admin files (`public/admin.html`, `public/assets/js/admin.js`) are hand-maintained and survive rebuilds. After rebuilding, the CSS/JS version hashes change automatically.

## What is NOT in this package (on purpose)

- No `.env`, no passwords, no API keys — secrets live in the hosting panel / `.env` on the server only. The code reads them from the environment and never contains them.
- No live data — applications, settings (including the mail password), uploads and backups stay on the server in `DATA_DIR`.
- No git history (`.git`), no test screenshots, no `node_modules` (there are none — zero dependencies).

## Live site

- Live: https://visit-saudi.ae (xCloud, Node 22, port 8324, auto-deploy from the `najeobusiness/visit-saudi` repo on push to `main`)
- Prices are editable in Admin → Prices; the three priced visas above are the business's own prices.
- Reviews: never invent any — the reviews section only shows when a real visible review exists.
