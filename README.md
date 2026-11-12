# Bibaz (بيباز) — Cheesecake Store

Arabic-first (RTL) e-commerce store for a Saudi cheesecake brand. English (LTR) is a toggle.
Four sizes per cake (15 / 20 / 25 / 30 cm), 3D cake, dripping-cream effects, full admin panel,
offers engine and automatic upsells. Payment: **bank / wallet transfer only** (cash on delivery exists but is OFF by default).

## Stack
Next.js 15 (static export) · TypeScript · Tailwind v4 · Motion · React Three Fiber + drei · Zustand.

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in ./out
npm test           # offers-engine checks
```

## Deploy on GitHub Pages
1. Push this folder to a GitHub repo (branch `main`).
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. The workflow `.github/workflows/deploy.yml` builds and publishes on every push.
   - Project page (`user.github.io/repo`): nothing to configure (base path = repo name).
   - Custom domain or a `<user>.github.io` repo: add a repository variable `ROOT_SITE` = `true` (Settings → Variables).

## Admin panel — `/admin/`
Default passcode: `bibaz2026` → **change it first** (Admin → Settings).
Sections: Dashboard · Orders · Products & prices (4 sizes each) · Offers · Upsells · Payments · Settings · Agent scorecards.

### How edits reach customers (static hosting, no server)
Admin edits are saved as a **draft in your browser** and you see them live in that browser.
To publish: Admin → **Export store-data.json** → replace `public/store-data.json` in the repo → commit.
GitHub Actions redeploys and every customer sees it. (Orders/PII are never included in the export.)

### How orders reach you
The moment the customer taps **Place order**, WhatsApp opens automatically on **+966 53 695 5425** with a ready message containing every detail (items, sizes, add-ons, cake text, totals, discount, district/address, optional map location, delivery slot, payment method and an order code). The customer just taps Send, then attaches the transfer receipt. In Admin → Orders paste the code to register the order and track its status.
Change the number in Admin → Settings (`9665XXXXXXXX`).

> Want real-time orders, shared stock and server-side validation? The next step is a small backend
> (e.g. Supabase). All data access goes through `src/lib/store.ts`, so it is a contained change.

## Offers supported
Percent off · fixed amount · Buy X get Y (2+1…) · Nth item % off (second at 50%) · tiered quantity discount ·
bundle at fixed price · free delivery threshold · free gift · coupon codes · schedule (start/end) · priority & stacking.

## Upsell
Admin rules (trigger product → suggested product/add-on, placed on product page / cart / checkout),
plus automatic *size-upgrade* nudge and free-delivery progress bar.

## Placeholders to replace
Product names/prices, account details (IBAN/Barq numbers), WhatsApp number, Instagram, photos
(upload or put files in `public/` and use the URL).
