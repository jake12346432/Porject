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

### Optional: the "Describe what you want" AI box

Everything else works with zero configuration. This one feature — turning a
plain-English request like "high exposure to tech and Asia" into filter
settings — needs a Claude API key, since it's a real LLM call:

1. Get a key at [console.anthropic.com](https://console.anthropic.com) →
   Settings → API Keys (usage-based billing, typically a fraction of a cent
   per request at this scale).
2. Copy `server/.env.example` to `server/.env` and paste your key in.
3. Restart the server (`npm run dev:all`) — it picks the key up automatically.

Without a key, that one box shows a clear "not set up yet" error and
everything else in the app (filters, templates, buying, the combined order
export) works exactly the same.

## What the buy feature does

1. **Generate a portfolio** as usual (template, filters, or the AI box).
2. In the **"Prices all N current holdings…"** panel, give it a portfolio
   name (prefilled from the generated portfolio's name) and a dollar amount,
   then hit **Buy — save to today's order book**.
3. The backend fetches current prices for every holding from Yahoo Finance
   (delayed ~15 min, not tick-by-tick real-time — see caveats below), sizes
   the order (shares = weight × dollar amount ÷ price, weights renormalized
   among just the holdings that got a price), and **saves it** to a SQLite
   database tagged with today's date. Any holding with no live quote is
   skipped and called out in the confirmation message rather than silently
   guessed at.
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
   ├─ index.js               routes
   ├─ quotes.js              Yahoo Finance quote fetching (yahoo-finance2)
   ├─ orders.js              pricing math + Excel workbook generation
   ├─ db.js                  SQLite schema + queries (Node's built-in node:sqlite —
                              deliberately not better-sqlite3, which needs a C++
                              compiler to install and fails on machines without one)
   └─ test-local.mjs         exercises db/orders logic with fake quotes,
                              no network needed — see "Testing" below
```

**Endpoints:**
- `POST /api/buy` — `{ portfolioName, dollarAmount, holdings }` → prices,
  sizes, and persists a buy list; returns it.
- `GET /api/daily-orders/summary?date=YYYY-MM-DD` — JSON summary of a day's
  submissions (defaults to today).
- `GET /api/daily-orders?date=YYYY-MM-DD` — downloads the combined `.xlsx`
  for that day.
- `POST /api/quotes` — `{ tickers: [...] }` → raw quotes, no persistence.

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
   - `ANTHROPIC_API_KEY` — your key, only needed for the AI box
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

- **Yahoo Finance quotes are delayed ~15 minutes**, not true real-time
  minute-level data, and aren't licensed for commercial redistribution. Fine
  for a demo; a real deployment moving real money should use a licensed
  real-time feed instead (this was discussed and intentionally deferred —
  see chat history).
- **This sandbox's network policy blocks Yahoo Finance outbound**, so the
  live-quote path (`quotes.js`) could only be verified by its *shape*, not by
  an actual successful fetch, here. Everything downstream of it — DB writes,
  cross-portfolio netting, missing-quote handling, Excel generation — **was**
  verified end-to-end, including through a real running server and a real
  browser download (see `server/test-local.mjs` for the no-network version of
  that check). The quote fetch itself needs to be verified once this runs
  somewhere with normal internet access.
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
