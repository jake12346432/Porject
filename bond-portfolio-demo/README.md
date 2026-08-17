# Titan Wealth — Fixed Income Portfolio Builder

A bond portfolio screener/builder (React + Vite), sibling to `portfolio-demo` (the equity
version). Same look and feel, same "pick a template or set filters, then generate" flow —
built for a real, named universe of 184 individual bonds instead of stocks.

## The data

`src/bondData.js` is generated from a workbook of real fixed income securities: individual
bonds pulled directly from the live, published holdings of three major bond ETFs — iShares
Core U.S. Aggregate Bond ETF (AGG), iShares iBoxx $ Investment Grade Corporate Bond ETF (LQD),
and iShares J.P. Morgan USD Emerging Markets Bond ETF (EMB) — fetched from ishares.com on
17 Aug 2026. Every issuer, coupon, maturity date, CUSIP/ISIN, and (where published) price/YTM
is real, as-published data, not synthetic.

Two things worth knowing:

- **No credit-rating filter.** The source data has no rating column, and ratings can't be
  reliably derived from the other fields — so rather than show a rating for a real, named bond
  that isn't independently verified, there's no rating filter in this app at all.
- **Duration is calculated, not sourced.** The source file has no duration column either.
  `duration` on every bond is computed from that bond's real coupon, maturity and YTM using
  standard bond math (modified duration via discounted cash flows, semiannual compounding,
  valued as of 17 Aug 2026 to match the data's fetch date) — see the comment at the top of
  `bondData.js` and the calculation itself in the data-generation step. It's a derived figure.
- The 17 fund/ETF-level rows in the source workbook carry no coupon/maturity/YTM at all
  (they're fund-level entries, not single securities) and are deliberately excluded — every
  instrument in this app is one of the 184 individual bonds with complete real data.

Treat prices, YTMs and durations as an illustrative snapshot as of the fetch date, not
tradeable quotes. This is a demo — nothing here is a real trade or investment advice.

## What it does

1. Pick one of 4 templates (US Treasury Ladder, Short-Duration Corporate Income, Emerging
   Markets Sovereign Income, Diversified Core Aggregate) or set filters yourself:
   **Region**, **Sector**, **Bond type** (Government / Corporate / Government-Related), a
   **YTM range**, and a **Duration range**.
2. Set the **Objective** sliders (Income vs. Stability — sum to 100) to control how the engine
   scores and weights candidate bonds among whatever passes your filters.
3. Click **Generate my portfolio**. Selection is stratified by sector (each sector present in
   your filtered universe gets a slot count proportional to its own share of that universe, not
   just a flat top-N by score) — this matters because real YTM is structurally correlated with
   sector/region (EM sovereigns simply yield more than IG corporates or Treasuries), so a naive
   global top-score cut would just return 100% Emerging Markets every time. See the comment
   above the selection logic in `BondPortfolioBuilder.jsx` for the full reasoning.
4. Review the generated portfolio: weighted YTM/duration/coupon, average time to maturity,
   unique issuer count, Gov/Corp/Government-Related mix, region/sector/duration/maturity-ladder
   charts, and a holdings table (including each bond's real ISIN).

No buy/execution flow, no backend, no daily order email — this is a pure front-end generator,
unlike `portfolio-demo` which also has a pricing/order-sheet backend. Add one later if needed.

## Running it locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5174` (equity's dev server uses 5173, so both can run at once).

## Regenerating the data

If the source workbook changes, `src/bondData.js` needs regenerating. See the comment block at
the top of that file for exactly what it contains and how duration is calculated; the
generation script itself was run ad hoc (openpyxl → JSON → this JS module) rather than checked
into the repo — re-derive it from the workbook's `Bond Pool` sheet using the same approach
(filter to `Type == "Individual Bond"`, normalize `Gov/Corp` values starting with
"Government-Related" to a single bucket, compute modified duration from coupon/maturity/YTM).

## Deploying (Render, free tier, browser-only — no local CLI needed)

This is a static site (no backend), so it's simpler to host than `portfolio-demo`:

1. Go to [render.com](https://render.com) and sign up (GitHub login is easiest).
2. **New +** → **Static Site** → connect the `jake12346432/Porject` repo → branch
   `claude/fixed-income-portfolio-generator-vk2tpd` (or whatever branch this ends up on).
3. **Root Directory:** `bond-portfolio-demo`.
4. **Build Command:** `npm install && npm run build`
5. **Publish Directory:** `dist`
6. **Create Static Site.** Render builds and deploys automatically, and gives you a URL like
   `https://titan-bonds-xxxx.onrender.com`.

Every new commit to that branch redeploys automatically. Unlike the equity demo, there's no
password gate here (no backend, nothing to protect) — add Render's built-in "Basic Auth" add-on
or a small Express wrapper if you want one.

## Architecture

```
bond-portfolio-demo/
├─ src/
│  ├─ bondData.js              generated bond universe (184 real bonds) + derived constants
│  ├─ BondPortfolioBuilder.jsx the whole app: filters, selection/scoring engine, charts, UI
│  ├─ App.jsx, main.jsx        entry points
│  └─ index.css                font import + minimal reset
└─ public/favicon.svg          same Titan Wealth mark as portfolio-demo
```
