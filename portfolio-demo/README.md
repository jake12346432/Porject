# Titan Wealth — Portfolio Builder Demo

A portfolio screener/builder (React + Vite) with a small Express + SQLite
backend for the "buy" feature: pricing a generated portfolio at current
market prices, saving it, and combining everyone's buys for the day into one
bulk order sheet for the next market open.

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
everything else in the app (filters, templates, buying, the combined order
export) works exactly the same.

## What the buy feature does

1. **Generate a portfolio** as usual (template, filters, or the AI box).
2. In the **"Prices all N current holdings…"** panel, give it a portfolio
   name (prefilled from the generated portfolio's name) and a dollar amount,
   then hit **Buy — save to today's order book**.
3. The backend fetches current prices for every holding — Finnhub first,
   Twelve Data as a fallback for whatever Finnhub can't price (see "Live
   pricing" above) — sizes the order (shares = weight × dollar amount ÷
   price, weights renormalized among just the holdings that got a price),
   and **saves it** to a SQLite database tagged with today's date. Any
   holding with no live quote on either provider is skipped and called out
   in the confirmation message rather than silently guessed at. Quotes are
   cached for 60 seconds server-side and shared across everyone using the
   app, so overlapping holdings across different people's portfolios don't
   each cost a fresh API call.
4. **"Today's combined order book"** (further down the page) shows every
   portfolio anyone has bought today — across the whole app, not just your
   browser tab — and lets you **download one combined Excel file**:
   - **Bulk Order** sheet — one row per ticker, net shares/dollars summed
     across *every* portfolio submitted that day. This is what you'd actually
     place as a single order at market open.
   - **Allocations** sheet — one row per (portfolio, ticker), so shares can
     be handed back out to the right client/portfolio after the bulk order
     fills.
   - **Portfolios** sheet — a quick summary of what was submitted.

No trade is ever actually placed — there is no brokerage connection. This
produces an order sheet for manual execution, by design (see the chat history
for why: this is a demo, not wired to real money).

## Architecture

```
portfolio-demo/
├─ src/                  React frontend (Vite)
│  ├─ PortfolioBuilder.jsx   the whole app
│  └─ api.js                 thin client for the backend endpoints below
└─ server/                Express + SQLite backend
   ├─ index.js               routes, auth middleware, static frontend serving
   ├─ auth.js                shared-password HTTP Basic Auth
   ├─ quotes.js              orchestrates Finnhub -> Twelve Data fallback,
                              60s caching, per-provider rate limiting
   ├─ providers/
   │  ├─ symbolMap.js         {exch, ticker} -> each provider's symbol format
   │  ├─ finnhub.js           Finnhub /quote fetch
   │  └─ twelvedata.js        Twelve Data /quote fetch
   ├─ ai.js                  server-side Claude API call for the AI box
   ├─ orders.js              pricing math + Excel workbook generation
   ├─ db.js                  SQLite schema + queries (Node's built-in node:sqlite —
                              deliberately not better-sqlite3, which needs a C++
                              compiler to install and fails on machines without one)
   ├─ test-local.mjs         exercises db/orders logic with fake quotes,
                              no network needed
   └─ test-quotes-local.mjs  exercises quotes.js's provider fallback/caching/
                              rate-limit logic against a mocked fetch, no
                              network needed
```

**Endpoints:**
- `POST /api/buy` — `{ portfolioName, dollarAmount, holdings }` → prices,
  sizes, and persists a buy list; returns it. Each holding needs both
  `ticker` and `exch` (the exchange code) — the provider symbol mapping
  needs both, not just the ticker alone.
- `GET /api/daily-orders/summary?date=YYYY-MM-DD` — JSON summary of a day's
  submissions (defaults to today).
- `GET /api/daily-orders?date=YYYY-MM-DD` — downloads the combined `.xlsx`
  for that day.
- `POST /api/quotes` — `{ holdings: [{ticker, exch}, ...] }` → raw quotes, no
  persistence. Not currently called by the frontend; kept for debugging.
- `POST /api/ai/portfolio-config` — `{ prompt, sectors, regions }` → the AI
  box's filter config, via a server-side Claude API call.

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
9. **Create Web Service.** Render builds and deploys automatically, and gives
   you a URL like `https://titan-wealth-xxxx.onrender.com`. Share that URL
   plus the username/password with whoever needs access — never put them in
   the same message/channel as a security habit, though for a small trusted
   team this is a minor concern.

Every time this branch gets a new commit, Render redeploys automatically —
no manual redeploy step.

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
  password can do everything — submit buy lists, download the combined order
  sheet, use the AI box (which spends against your Anthropic API key). Fine
  for a small trusted group sharing one link; there's no way to tell who did
  what, and no per-person access revocation short of changing the shared
  password for everyone.
- **Trade date = calendar date of submission** (server's UTC date), not
  "next trading session" — a portfolio bought right after Friday's close and
  one bought Saturday would land in different daily sheets even though both
  execute at the same Monday open. Worth revisiting if this becomes real.
