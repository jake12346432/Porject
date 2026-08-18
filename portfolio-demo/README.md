# Titan Wealth — Portfolio Builder Demo

A portfolio screener/builder (React + Vite) with a small Express + SQLite
backend for the "buy" feature: pricing a generated portfolio at current
market prices, saving it, and combining everyone's buys (and sells) for the
day into one bulk order sheet for the next market open.

## The guided flow

Building one portfolio is a linear sequence — but the **top nav breadcrumb
is clickable**: any step you've already reached (its data exists — see
`reachableSteps` in `src/App.jsx`) can be jumped straight back to, not just
the very next one. The **Dashboard is a persistent hub, not the flow's
endpoint**: once you've built one portfolio, "Make new/additional portfolio"
re-enters the same sequence to build a separate, independently named one,
without discarding the ones already built. A client can end up with any
number of named portfolios, each with its own Equity + Fixed Income pair.

Equity and Fixed Income don't buy anything themselves — each just hands off
a **draft** (the raw holdings + weights + a target amount, unpriced) once
you click its "Continue" button. Nothing is priced, sized, or saved
server-side until the **Portfolio Summary** step's single **Buy portfolio**
button fires — that's what prices and persists both legs together, as one
combined order, in a single pass.

1. **Risk profile** (`src/RiskQuestionnaire.jsx`) — a mock RPQ (risk profile
   questionnaire). The real thing would score a series of questions about
   time horizon, loss tolerance, etc.; this stands in for that scoring model
   with a direct pick, since the real model isn't built yet. Asks **how much
   you're investing** (a single $ figure) and the **Equity / Fixed Income
   split** you're targeting (a slider + a few presets) — the split is then
   applied to the cash figure automatically, so the next two steps' target
   amounts are pre-filled rather than asked for again. A **1.75% cash sleeve**
   (`CASH_ALLOCATION_PCT`, fixed policy, not affected by the split) is called
   out here and held back from both legs — see "Cash allocation" below. A
   **0% target on either side skips that step entirely** — 0% Equity goes
   straight to Fixed Income, and 0% Fixed Income (after Equity) goes straight
   to Portfolio Summary — rather than making someone build a portion that
   would only ever end up empty.
2. **Equity** (`src/PortfolioBuilder.jsx`) — the stock screener described
   below (live pricing, the AI "describe what you want" box, templates,
   build-your-own filters), its order-value field pre-filled from step 1.
   Ends with **Continue to Portfolio Summary →** (or **Continue to Fixed
   Income →** if there's a Fixed Income leg still to build) — this only
   packages the current holdings/weights as a draft, no server call yet.
3. **Fixed Income** (`src/BondPortfolioBuilder.jsx` + `src/bondData.js`) — a
   bond portfolio builder, ultimately meant to be GBP-corporate-only, but
   that lock is **temporarily switched off** — the placeholder universe (184
   real, named bonds sourced from the published holdings of AGG/LQD/EMB) is
   almost entirely government issuers in non-GBP currencies, so restricting
   to GBP corporates left almost nothing buildable. Government issuers and
   other currencies are back in the eligible universe until the official GBP
   corporate bond list arrives (see its in-app disclosure), at which point
   both locks should be re-added in `passesFilters`. All filters are still
   hard filters (region, sector, credit rating, YTM range, duration range —
   no soft/preference tilts). Bonds already carry a static `price` field in
   `bondData.js` (no live quote fetch needed — there's no feed for bonds),
   its order-value field also pre-filled from step 1. Ends with **Continue
   to Portfolio Summary →** — same deal, just a draft handoff.
4. **Portfolio Summary** (`src/PortfolioSummary.jsx`) — shows both legs'
   target split, region/sector charts, and holdings, side by side, still
   unpriced. The single **Buy portfolio** button here prices and sizes
   whichever legs exist (applying the 1.75% cash sleeve to each), saves them
   via `POST /api/buy` and/or `POST /api/buy-bonds`, then links them into one
   portfolio record via `POST /api/portfolios`. If pricing/saving one leg
   succeeds but the other (or the final link-together call) fails, the
   component remembers which leg already went through, so retrying only
   redoes what's left rather than double-submitting.

5. **Dashboard** (`src/Dashboard.jsx`) has two views:
   - **Hub** (default) — an "Entire portfolio" section blending every
     portfolio's Equity legs and every portfolio's Fixed Income legs
     separately (dollar-weighted within each currency — see "Currency
     handling" below), with full, non-truncated region/sector breakdowns
     (not just a top-N chart) and cash-allocation stat tiles; then a card
     per portfolio (name, target split, invested amounts, sold status) —
     click a card to open it.
   - **Detail** (one portfolio) — the target split as a chart, a stat tile
     per leg (invested amount + cash held back), each leg's region/sector
     allocation charts and top 10 holdings (amount only — weights aren't
     shown here, unlike the builder steps' own holdings tables), and **Sell**
     buttons (Equity only / Fixed Income only / entire portfolio) — see
     "Selling" below for what these actually do.

Every step before Summary has a **← Back** link, so you can revisit an
earlier step without losing progress — going back to Risk Profile shows
whatever you previously entered (cash, split), not blank defaults, so it's a
real "adjust and continue" rather than a restart. Backing up leaves any
drafts already built as-is; nothing is discarded until you actually
regenerate that step.

There's no login system, so "your portfolios" persistence is just the list
of server-generated ids the browser keeps in `localStorage`
(`src/App.jsx` — the flow's orchestrator) — reopening the site with that
list saved resumes straight at the Dashboard hub, or (if a portfolio's
Fixed Income leg was left unfinished) offers to pick up where you left off —
routed through Fixed Income and then Summary again, but since that
portfolio's Equity leg was already priced and saved, Summary here only
prices the new Fixed Income leg and `PATCH`es it onto the existing
portfolio, rather than creating a second one.
There's no cross-device access and nothing tied to a real account; clearing
the browser's storage (or the de-emphasized "Clear everything and start
over" link on the Dashboard) wipes every known portfolio and starts fresh.

Both builder steps share the same light/dark theme toggle and visual
language (`src/shared.jsx` holds the palette and chart components common to
the flow-level screens).

### Cash allocation

A fixed 1.75% cash sleeve (`CASH_ALLOCATION_PCT`, duplicated as a constant
in `RiskQuestionnaire.jsx`, `PortfolioBuilder.jsx`, and
`BondPortfolioBuilder.jsx`) is held back from **both** legs on every buy —
this is baked-in policy, unrelated to the RPQ's target split, and was true
for Equity before Fixed Income gained the same treatment. Each leg's actual
invested amount is `target × (1 - 1.75%)`; the resulting cash is stored on
that leg's `buy_lists` row (`cash`) and surfaced on the Dashboard as its own
stat tile, both per-portfolio and summed across all portfolios on the hub.

### Currency handling

Equity is always priced in USD and Fixed Income in GBP, and this app never
converts between them (no FX rate source). Every place multiple portfolios
or legs are blended together — the Dashboard hub's aggregate stats and full
region/sector breakdowns — blends *within* one currency only (all Equity
legs together, all Fixed Income legs together, each dollar/pound-weighted
by that leg's own invested amount), never combining the two. This is called
out explicitly in the hub's "Entire portfolio" section.

### Selling

The Dashboard's Sell buttons are a real sell order, not just a status flag —
they mirror buying:
- **Equity** is requoted at current market prices (same live-pricing path as
  buying) and liquidates every share held.
- **Fixed Income** has no live feed, so it re-records the same holdings the
  bond leg was bought with — "current price" and "buy price" are the same
  static number in this demo.

Either way the resulting sell lands in the same `buy_lists` table (tagged
`side: 'sell'`) and daily order book/email as buys — see "What the buy
feature does" below for how buys and sells both flow into that report.

## Running it

You need both the frontend and the backend running. Easiest way:

```bash
npm install
npm run server:install
npm run dev:all
```

This starts the Vite dev server (http://localhost:5173) and the API server
(http://localhost:8787) together. Open the frontend URL in your browser.

To run them separately instead (two terminals):
```bash
npm run dev      # frontend
npm run server    # backend
```

### Live pricing (needed for the Buy button to price anything)

Copy `server/.env.example` to `server/.env` and fill in:

- `FINNHUB_API_KEY` — free key from [finnhub.io/register](https://finnhub.io/register).
  Tried first for every holding; fast (60 requests/min), reliably covers
  US-listed stocks.
- `TWELVEDATA_API_KEY` — free key from [twelvedata.com/pricing](https://twelvedata.com/pricing).
  Used as a fallback for anything Finnhub can't price — covers far more
  international exchanges, but a much stricter free-tier limit (8
  requests/min, 800/day), so a portfolio with many non-US holdings can take
  a few minutes to fully price.

Restart the server after adding these — without them, Buy shows a clear "no
live prices available" error instead of silently failing.

(Yahoo Finance was tried first — it's free and has excellent international
coverage — but Yahoo blocks/rate-limits requests from cloud-hosting IP
ranges outright, confirmed via Render's own logs. It's an unofficial,
reverse-engineered API with no real support channel, so that block isn't
something reliably fixable from application code. Finnhub/Twelve Data are
real authenticated APIs instead, which don't have that problem, at the cost
of a real per-provider rate limit and imperfect symbol coverage — see
`server/providers/symbolMap.js` for exactly what's mapped where, and the
caveats below for what's still unverified.)

### Optional: the "Describe what you want" AI box

Everything else works without this. This one feature — turning a
plain-English request like "high exposure to tech and Asia" into filter
settings — needs a Claude API key, since it's a real LLM call. Get one at
[console.anthropic.com](https://console.anthropic.com) → Settings → API
Keys (usage-based billing, typically a fraction of a cent per request at
this scale), and add it to `server/.env` as `ANTHROPIC_API_KEY`.

Without a key, that one box shows a clear "not set up yet" error and
everything else in the app (filters, templates, buying) works exactly the same.

### Daily combined-order email

The combined order book (every portfolio anyone bought that day, across
**both** Equity and Fixed Income, netted into one bulk order per asset class)
is **not downloadable from the site** — it goes out once a day by email
instead, sent by an external scheduler rather than anyone clicking a button
in the browser. The recipient defaults to `jake.vendrell@titanwh.com`;
`DAILY_REPORT_EMAIL` only needs setting to override that default. See
"Hosting it" below for the full setup (a Resend account + a GitHub Actions
secret or two); until that's configured, `POST /api/daily-orders/email-report`
returns a clear "not set up yet" error, same pattern as the other optional
integrations.

## What the buy feature does

**Equity:**
1. **Generate a portfolio** as usual (template, filters, or the AI box),
   then continue to Portfolio Summary — this only hands off a draft, nothing
   is priced or saved yet.
2. On **Portfolio Summary**, give the combined portfolio a name and confirm
   the dollar amount (both prefilled from the draft), then hit **Buy
   portfolio**.
3. The backend fetches current prices for every holding — Finnhub first,
   Twelve Data as a fallback for whatever Finnhub can't price (see "Live
   pricing" above) — sizes the order (shares = weight × dollar amount ÷
   price, weights renormalized among just the holdings that got a price),
   and **saves it** to a SQLite database tagged with today's date and asset
   class `equity`. Any holding with no live quote on either provider is
   skipped and called out in the confirmation message rather than silently
   guessed at. Quotes are cached for 60 seconds server-side and shared across
   everyone using the app, so overlapping holdings across different people's
   portfolios don't each cost a fresh API call.

**Fixed Income:** the same shape, minus the live-quote step — bonds are
already priced by the static `price` field in `bondData.js` (clean price per
£100 face value), so the frontend sizes the order itself, at Portfolio
Summary, from the drafted weights (£ amount = weight × portfolio value,
using only bonds that have a price) and `POST /api/buy-bonds` just validates
and persists it tagged asset class `bond`. Same Summary-page name/amount
fields, same **Buy portfolio** button — this and the Equity leg above are
priced and saved together in one pass, not two separate ones.

Either way, that's it from the browser's point of view — no combined-order
panel or download button on the site. Once a day (15:00 UTC, see "Hosting
it"), everyone's buys **and sells** (see "Selling" above — a sell is the
same shape as a buy, just tagged `side: 'sell'`) from that day get combined
into one workbook and emailed out, with a separate three-sheet block per
asset class actually submitted that day (an asset class with nothing
submitted just doesn't get a sheet):
   - **Equity/Bond Bulk Order** sheet — one row per (ticker/ISIN, side), net
     shares-or-£-amount summed across *every* portfolio of that asset class
     and side submitted that day. This is what you'd actually place as
     orders at market open — buys and sells are listed separately, not
     netted against each other, so a buy and a sell of the same instrument
     on the same day both show up rather than silently cancelling out.
   - **Equity/Bond Allocations** sheet — one row per (portfolio, instrument,
     side), so the position can be handed back out to the right
     client/portfolio after the bulk order fills.
   - **Equity/Bond Portfolios** sheet — a quick summary of what was
     submitted, per side.

No trade is ever actually placed — there is no brokerage connection. This
produces an order sheet for manual execution, by design (see the chat history
for why: this is a demo, not wired to real money).

### Investopedia links on factor/concept terms

"Quality", "Value", "Growth", "Momentum", "Dividend", and "ESG" are clickable
links to their Investopedia glossary pages (`ConceptLink` component,
`INVESTOPEDIA_LINKS` table near the top of `PortfolioBuilder.jsx`).
**These URLs are unverified** — Investopedia blocks the automated tooling
this was built with, so they're a best-effort guess from general knowledge,
not confirmed live. Value/Growth/Momentum/Dividend are old, stable glossary
terms and very likely correct; Quality and ESG are the least certain. Click
through each once deployed and fix the table if any land wrong.

## Architecture

```
portfolio-demo/
├─ src/                  React frontend (Vite)
│  ├─ App.jsx                 the guided flow's orchestrator — holds theme/step/rpq/
│  │                           equityDraft/bondDraft state, renders whichever step
│  │                           is active, computes which breadcrumb steps are
│  │                           clickable, persists the portfolio id to localStorage
│  │                           once Summary's buy succeeds
│  ├─ RiskQuestionnaire.jsx    step 1 — mock RPQ (Equity/Fixed Income % split)
│  ├─ PortfolioBuilder.jsx     step 2 — Equity builder (hands back a draft, doesn't buy)
│  ├─ BondPortfolioBuilder.jsx step 3 — Fixed Income builder (same — draft, not a buy)
│  ├─ PortfolioSummary.jsx     step 4 — combined review of both drafts + the single
│  │                           "Buy portfolio" action that prices/saves both legs
│  ├─ Dashboard.jsx            step 5 — combined portfolio view + Sell buttons
│  ├─ shared.jsx               palette + chart components shared by the flow-level
│  │                           screens (RiskQuestionnaire, Dashboard, PortfolioSummary,
│  │                           App's step breadcrumb) — PortfolioBuilder/
│  │                           BondPortfolioBuilder each keep their own copy of these,
│  │                           predating the flow
│  ├─ bondData.js              placeholder GBP/USD bond universe (184 bonds)
│  └─ api.js                  thin client for the backend endpoints below
└─ server/                Express + SQLite backend
   ├─ index.js               routes, auth middleware, static frontend serving
   ├─ auth.js                shared-password HTTP Basic Auth
   ├─ quotes.js              orchestrates Finnhub -> Twelve Data fallback,
                              60s caching, per-provider rate limiting
                              (equity only — bonds are priced client-side)
   ├─ providers/
   │  ├─ symbolMap.js         {exch, ticker} -> each provider's symbol format
   │  ├─ finnhub.js           Finnhub /quote fetch
   │  └─ twelvedata.js        Twelve Data /quote fetch
   ├─ ai.js                  server-side Claude API call for the AI box
   ├─ email.js               builds today's workbook + sends it via Resend
   ├─ orders.js              pricing math (buy AND sell) + Excel workbook
                              generation (separate equity/bond sheet blocks)
   ├─ db.js                  SQLite schema + queries (Node's built-in node:sqlite —
                              deliberately not better-sqlite3, which needs a C++
                              compiler to install and fails on machines without one).
                              Two tables: `buy_lists` (every buy/sell submitted,
                              tagged asset_class 'equity'/'bond' and side 'buy'/'sell')
                              and `portfolios` (ties one equity buy + one bond buy
                              together with a name, the RPQ's target split, and each
                              leg's sell status — see "The guided flow" above)
   ├─ test-local.mjs         exercises db/orders logic with fake quotes,
                              no network needed
   └─ test-quotes-local.mjs  exercises quotes.js's provider fallback/caching/
                              rate-limit logic against a mocked fetch, no
                              network needed
.github/workflows/
└─ daily-order-email.yml  cron trigger for the daily email (15:00 UTC)
```

**Endpoints:**
- `POST /api/buy` — `{ portfolioName, dollarAmount, holdings }` → prices,
  sizes, and persists an equity buy list; returns it. Each holding needs both
  `ticker` and `exch` (the exchange code) — the provider symbol mapping
  needs both, not just the ticker alone. Called from `PortfolioSummary.jsx`'s
  Buy action (using the drafted holdings `PortfolioBuilder.jsx` handed off
  earlier), not from the Equity builder itself.
- `POST /api/buy-bonds` — `{ portfolioName, poundAmount, holdings, totalAllocated, cash }`
  → persists an already-priced-and-sized bond buy list. Pricing/sizing
  happens client-side (bond prices are static data, not a live quote) in
  `PortfolioSummary.jsx`'s Buy action, from the drafted weights
  `BondPortfolioBuilder.jsx` handed off earlier; returns it.
- `POST /api/portfolios` — `{ name, rpqEquityPct, rpqFiPct, equityBuyListId?, bondBuyListId? }`
  → creates a portfolio record (server-generated UUID). Normally called once
  from `PortfolioSummary.jsx` with both leg ids together, right after both
  buys above succeed; a 0%-target leg is simply omitted, so at least one of
  `equityBuyListId`/`bondBuyListId` is required, not both. `name` is chosen
  client-side (e.g. "Portfolio 2", counting up from how many portfolios this
  browser already knows about) so multiple portfolios are distinguishable on
  the Dashboard. Returns `{ id }`.
- `PATCH /api/portfolios/:id` — `{ bondBuyListId?, equityBuyListId?, rpqEquityPct?, rpqFiPct? }`
  → updates an already-created portfolio. In the current flow this only
  fires for the Dashboard's "Complete Fixed Income" resume path — a
  portfolio whose Equity leg was already priced and saved (from an earlier
  session), where `PortfolioSummary.jsx` prices just the new Fixed Income
  leg and PATCHes it on rather than creating a duplicate portfolio. Also
  used to sync the target split if it changed on a trip back to Risk
  Profile. At least one field must be present; any combination is valid.
- `GET /api/portfolios/:id` — the Dashboard's one fetch: portfolio metadata
  (RPQ target, sold status per leg) plus both legs' full buy (and, once
  sold, sell) records, holdings included.
- `POST /api/portfolios/:id/sell` — `{ side: 'equity' | 'bond' | 'all' }` →
  sells one or both legs (see "Selling" above); returns the resulting sell
  record(s).
- `POST /api/daily-orders/email-report` — builds today's combined-order
  workbook (equity + bond sheets, buys and sells) and emails it to
  `DAILY_REPORT_EMAIL` (or the `jake.vendrell@titanwh.com` default) via
  Resend. Meant to be called by the GitHub Actions cron job, not a person —
  see "Hosting it".
- `GET /api/daily-orders/summary?date=YYYY-MM-DD` and
  `GET /api/daily-orders?date=YYYY-MM-DD` — JSON summary (with separate
  buy/sell, equity/bond totals) / `.xlsx` download for a given day. Not
  linked from the UI anymore (the email is the intended delivery path);
  kept as a manual fallback you can hit directly if needed.
- `POST /api/quotes` — `{ holdings: [{ticker, exch}, ...] }` → raw quotes, no
  persistence. Not currently called by the frontend; kept for debugging.
- `POST /api/ai/portfolio-config` — `{ prompt, sectors, regions }` → the AI
  box's filter config, via a server-side Claude API call. Equity only — the
  Fixed Income step has no AI box.

Storage is a single SQLite file at `server/data/buylist.db` (gitignored,
created automatically on first run). Fine for a demo/single-instance
deployment; a real multi-user production deployment would want a real
Postgres/MySQL instance instead so backups, concurrent writes, and multiple
server instances all behave.

## Hosting it (so others can reach it privately)

In production, the Express server also serves the built frontend directly —
there's one deployable service, not two, and the whole thing (UI + API) sits
behind one shared username/password (HTTP Basic Auth — your browser's native
login prompt, no custom login page needed).

**Deploying to Render (free tier, browser-only setup — no local CLI needed):**

1. Go to [render.com](https://render.com) and sign up (using your GitHub
   account is easiest, since Render needs repo access anyway).
2. **New +** → **Web Service** → connect the `jake12346432/Porject` repo →
   branch `claude/quarterly-stock-prices-portfolio-qsl4v6`.
3. **Root Directory:** `portfolio-demo` (the app lives in a subfolder of the repo).
4. **Runtime:** Node.
5. **Build Command:** `npm install && npm run build:all`
6. **Start Command:** `npm start`
7. **Instance Type:** Free.
8. Under **Environment Variables**, add:
   - `SITE_USERNAME` — pick anything, e.g. `titan`
   - `SITE_PASSWORD` — pick a real password, share it separately from the link
   - `FINNHUB_API_KEY` — needed for live pricing to work at all
   - `TWELVEDATA_API_KEY` — needed for international holdings to price
   - `ANTHROPIC_API_KEY` — only needed for the AI box
   - `RESEND_API_KEY` — needed for the daily order email
   - `DAILY_REPORT_EMAIL` — optional; defaults to `jake.vendrell@titanwh.com`
     if left unset (comma-separate for multiple people if you do set it)
9. **Create Web Service.** Render builds and deploys automatically, and gives
   you a URL like `https://titan-wealth-xxxx.onrender.com`. Share that URL
   plus the username/password with whoever needs access — never put them in
   the same message/channel as a security habit, though for a small trusted
   team this is a minor concern.

Every time this branch gets a new commit, Render redeploys automatically —
no manual redeploy step.

### Setting up the daily email (15:00 UTC)

The email is triggered by a GitHub Actions scheduled workflow
(`.github/workflows/daily-order-email.yml`) calling the Render service, not
by anything running inside Render itself — Render's free tier sleeps after
15 minutes idle, so an in-process timer could just never fire; an external
trigger fires regardless, and even wakes the service up as a side effect.

1. Get a free key at [resend.com](https://resend.com) — no card needed for
   the free tier (100 emails/day).
2. Add `RESEND_API_KEY` and `DAILY_REPORT_EMAIL` to Render's environment
   variables (step 8 above).
3. On GitHub: go to the repo → **Settings → Secrets and variables →
   Actions → New repository secret**, and add three:
   - `SITE_URL` — your Render URL, e.g. `https://titan-wealth-xxxx.onrender.com`
     (no trailing slash)
   - `SITE_USERNAME` — the same value as `SITE_USERNAME` on Render
   - `SITE_PASSWORD` — the same value as `SITE_PASSWORD` on Render
4. That's it — the workflow fires automatically at 15:00 UTC daily. To test
   it immediately instead of waiting: repo → **Actions** tab → "Send daily
   combined order email" → **Run workflow**. If nothing was bought that day,
   it correctly sends nothing and reports why in the workflow's log rather
   than erroring.

If the job ever fails (bad secret, Resend down, etc.), GitHub emails the
repo's watchers automatically — that failure notification is your alerting
for this, nothing additional to set up.

**Free tier tradeoffs, worth knowing going in:**
- The service **spins down after ~15 minutes of no traffic** and takes
  30-60 seconds to wake back up on the next request. Fine for occasional use,
  annoying if someone's waiting on it.
- The **disk is not guaranteed to persist across redeploys** — every time new
  code ships (including future updates from this project), there's a real
  chance today's saved buy lists in `server/data/buylist.db` get wiped. If
  people start depending on that data surviving, upgrading to Render's paid
  tier with a persistent disk (a few dollars/month) fixes this properly —
  worth revisiting once this moves past testing.

## Known caveats

- **Free-tier data, not a licensed real-time feed.** Finnhub/Twelve Data's
  free tiers are what's wired up; a real deployment moving real money should
  use a licensed real-time feed instead (this was discussed and
  intentionally deferred — see chat history).
- **Symbol mapping in `server/providers/symbolMap.js` is a best-effort first
  pass, not verified ground truth.** Neither provider is reachable from the
  sandbox this was built in (same network restriction that blocked Yahoo),
  so it was built from documented API conventions and tested against a
  *mocked* fetch (`server/test-quotes-local.mjs` — confirms the fallback/
  caching/rate-limit *logic* is correct) rather than real responses. Once
  deployed, check the server logs (`[quotes] ... failed: ...` lines, same
  format used to debug the earlier Yahoo issue) for symbols that come back
  wrong or missing, and adjust the mapping table accordingly — expect at
  least one round of this.
- **Coverage gap by design.** Finnhub's free tier is only attempted for
  US-listed exchanges (see `FINNHUB_EXCHANGES` in symbolMap.js); everything
  else goes straight to Twelve Data, which has real but imperfect
  international coverage on its free plan. Some holdings — especially small
  OTC ADRs — may not price on either provider.
- **Twelve Data's rate limit (8 req/min, 800/day) is the real bottleneck**
  for portfolios with many non-US holdings — pricing one can take a few
  minutes, and at true scale (~100 portfolios/day) the daily cap would need
  upgrading to a paid plan.
- **One shared password, not individual accounts.** Everyone who has the
  password can do everything — submit buy lists, use the AI box (which
  spends against your Anthropic API key), and hit the manual-fallback
  endpoints. Fine for a small trusted group sharing one link; there's no way
  to tell who did what, and no per-person access revocation short of
  changing the shared password for everyone.
- **Trade date = calendar date of submission** (server's UTC date), not
  "next trading session" — a portfolio bought right after Friday's close and
  one bought Saturday would land in different daily sheets even though both
  execute at the same Monday open. The 15:00 UTC email only catches whatever
  was submitted *that same UTC day before it fires* — anything bought after
  15:00 UTC waits for the next day's email. Worth revisiting if this becomes real.
- **The daily email depends on two external pieces working together**
  (GitHub Actions actually firing on schedule, and Render's service being
  reachable/awake when it does) — neither is guaranteed to the minute. If an
  email doesn't arrive, check the repo's **Actions** tab first; a failed run
  shows the real error, and GitHub emails watchers automatically on failure.
