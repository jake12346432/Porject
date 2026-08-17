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

1. **Pick how to start** — all three land on the exact same always-visible, always-editable
   filter panel below, so nothing you do here is locked in:
   - **Describe what you want**, in plain English (e.g. "short-duration emerging markets
     government bonds for income"), and a server-side Claude API call turns that into filter
     values — same idea as `portfolio-demo`'s AI box, adapted for this universe (see below).
   - **Start from a template** — 4 ready-made strategies (US Treasury Ladder, Short-Duration
     Corporate Income, Emerging Markets Sovereign Income, Diversified Core Aggregate).
   - Or just set the filters yourself: **Region**, **Sector**, **Bond type** (Government /
     Corporate / Government-Related), a **YTM range**, and a **Duration range**.
2. Whichever path you took, every filter is a normal control you can keep adjusting — the AI box
   and templates only pre-fill state, they don't lock anything or hide the panel.
3. Set the **Objective** sliders (Income vs. Stability — sum to 100) to control how the engine
   scores and weights candidate bonds among whatever passes your filters.
4. Click **Generate my portfolio**. Selection is stratified by sector (each sector present in
   your filtered universe gets a slot count proportional to its own share of that universe, not
   just a flat top-N by score) — this matters because real YTM is structurally correlated with
   sector/region (EM sovereigns simply yield more than IG corporates or Treasuries), so a naive
   global top-score cut would just return 100% Emerging Markets every time. See the comment
   above the selection logic in `BondPortfolioBuilder.jsx` for the full reasoning.
5. Review the generated portfolio: weighted YTM/duration/coupon, average time to maturity,
   unique issuer count, Gov/Corp/Government-Related mix, region/sector/duration/maturity-ladder
   charts, and a holdings table (including each bond's real ISIN).

No buy/execution flow, no daily order email — unlike `portfolio-demo`, this doesn't price or
save orders. It does now have a small backend (Express), added solely to keep the Claude API key
off the browser for the AI box — see "Architecture" below.

### Optional: the "Describe what you want" AI box

Everything else works without this. Get a key at
[console.anthropic.com](https://console.anthropic.com) → Settings → API Keys, and add it to
`server/.env` as `ANTHROPIC_API_KEY` (copy `server/.env.example` first). Without it, that one box
shows a clear "not set up yet" error and every filter/template/chart/table still works the same.

The AI endpoint has its own per-IP rate limit (8 requests / 10 minutes) baked into the server —
it's a real, billed API call behind a link with no per-user login, so that's a basic guardrail
against runaway cost, not a full auth system. Add `SITE_USERNAME`/`SITE_PASSWORD` in
`server/.env` too if you want the whole site behind a shared password (same mechanism as
`portfolio-demo`, browser-native HTTP Basic Auth).

## Running it locally

You need both the frontend and the backend running (the backend is only required for the AI
box — everything else works from the frontend alone, but `npm run dev` alone won't serve the
AI endpoint):

```bash
npm install
npm run server:install
npm run dev:all
```

This starts the Vite dev server (`http://localhost:5174` — equity's uses 5173, so both apps can
run at once) and the API server (`http://localhost:8788`) together.

## Regenerating the data

If the source workbook changes, `src/bondData.js` needs regenerating. See the comment block at
the top of that file for exactly what it contains and how duration is calculated; the
generation script itself was run ad hoc (openpyxl → JSON → this JS module) rather than checked
into the repo — re-derive it from the workbook's `Bond Pool` sheet using the same approach
(filter to `Type == "Individual Bond"`, normalize `Gov/Corp` values starting with
"Government-Related" to a single bucket, compute modified duration from coupon/maturity/YTM).

## Deploying (Render, free tier, browser-only — no local CLI needed)

**This app now needs a Web Service, not a Static Site** — the small Express backend (added for
the AI box) has to actually run as a server, not just serve static files. If you already
deployed this as a Render Static Site before the AI box existed, that service can't be converted
in place; create a new Web Service instead (and delete the old Static Site once the new one's
live, or just repoint whatever link you're sharing).

1. Go to [render.com](https://render.com) and sign up (GitHub login is easiest, since Render
   needs repo access anyway).
2. **New +** → **Web Service** → connect the `jake12346432/Porject` repo → branch
   `claude/fixed-income-portfolio-generator-vk2tpd` (or whatever branch this ends up on).
3. **Root Directory:** `bond-portfolio-demo` (the app lives in a subfolder of the repo).
4. **Runtime:** Node.
5. **Build Command:** `npm install && npm run build:all`
6. **Start Command:** `npm start`
7. **Instance Type:** Free.
8. Under **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — only needed for the "Describe what you want" box; everything else
     works without it.
   - `SITE_USERNAME` / `SITE_PASSWORD` — optional, both together or neither. Puts the whole app
     behind one shared password (browser's native login prompt).
9. **Create Web Service.** Render builds and deploys automatically, and gives you a URL like
   `https://titan-bonds-xxxx.onrender.com`.

Every new commit to that branch redeploys automatically.

**Free tier tradeoff worth knowing:** the service spins down after ~15 minutes of no traffic and
takes 30-60 seconds to wake back up on the next request — fine for occasional use, same as
`portfolio-demo`'s free-tier service.

## Architecture

```
bond-portfolio-demo/
├─ src/                        React frontend (Vite)
│  ├─ bondData.js                 generated bond universe (184 real bonds) + derived constants
│  ├─ BondPortfolioBuilder.jsx    the whole app: filters, selection/scoring engine, charts, UI
│  ├─ api.js                      thin client for the one backend endpoint below
│  └─ App.jsx, main.jsx, index.css
├─ public/favicon.svg          same Titan Wealth mark as portfolio-demo
└─ server/                     Express backend — exists solely for the AI box
   ├─ index.js                    routes, optional Basic Auth, static frontend serving
   ├─ ai.js                       server-side Claude API call for the AI box (imports
   │                              REGIONS/SECTORS/etc. straight from ../src/bondData.js so the
   │                              prompt and the frontend never drift out of sync)
   └─ auth.js                     shared-password HTTP Basic Auth (same as portfolio-demo's)
```

**Endpoint:** `POST /api/ai/portfolio-config` — `{ prompt }` → `{ config }` (the same shape
`applyAIConfig`/`applyTemplate` both consume in `BondPortfolioBuilder.jsx`). Rate-limited per IP
(8 requests / 10 minutes) since it's a real, billed API call with no per-user login gating it.
