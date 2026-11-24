# Visit Saudi (visit-saudi.ae) — Next.js

The visit-saudi.ae website on Next.js, with the same admin, client dashboard, WhatsApp and payments as the other Brightlink sites.

## The website stays exactly the same

- Every page (306 pages × 19 languages = 5,814 addresses) is the finished HTML in `site/public`, served by `src/app/[...path]/route.ts` with the same language handling as the old server (`site/legacy-server.js`, kept for reference).
- The CI compares every page of every language with the old server, byte for byte.
- The website's own scripts keep calling the same APIs (`/api/apply`, `/api/track`, `/api/pay`, `/api/message`, `/api/doc`, `/api/contact`, `/api/event`, `/api/config`, `/api/blog`, `/api/reviews`) with the same answers.
- Nothing changes on the pages until the admin changes something in **Pages & styling**, **Website texts** or **Guides**.

## Admin (`/admin`)

- Applications (with steps, quotes, payments, documents, messages, WhatsApp), enquiries, customers
- Website: Pages & styling (colours, fonts, CSS for all pages or one page, live preview in any language), Website texts (any sentence in any of the 19 languages), Guides, News posts, Reviews, Visa prices & pay online, Media library, Website stats
- Settings & email, backups, admin users
- The old secret admin address `/manage-jg0ojxafgt` now opens the new admin sign-in.

## Client dashboard

`app.visit-saudi.ae` (see `PORTAL_HOST`). Website applications appear there too (secret file links in WhatsApp and emails).

## Payments

The website's "Pay now" for priced visas uses Ziina exactly as before. **Never register a Ziina webhook for this site** — the Ziina account allows one webhook and Dubai Visa Portal uses it. Payments are confirmed by checking Ziina when the client returns, on the tracking page, and with "Check payment" in the admin.

## Moving the old data

```bash
node scripts/import-legacy.mjs /path/to/old/DATA_DIR           # dry run, counts only
node scripts/import-legacy.mjs /path/to/old/DATA_DIR --write   # import (safe to run again)
```

Applications (with their documents, issued eVisas, messages, payment state), enquiries, stats, prices, news, reviews, text edits, guide edits and media pictures are copied. The old folder is not changed.

## Run

```bash
npm install
npm run build
npm start          # PORT, DATABASE_URL (default SQLite), NEXT_PUBLIC_SITE_URL=https://visit-saudi.ae, PORTAL_HOST=app.visit-saudi.ae
```

Environment: `ZIINA_API_KEY` (or the key in Admin → Online payments), `ZIINA_TEST=true` for test payments, `SITE_URL`.
