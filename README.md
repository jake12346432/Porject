# Quarterly Stock Prices for Portfolio Backtesting

Fetches one closing price per quarter (2021-06-01 → 2026-06-01, 21 data points
per stock) for the ~480-stock universe in `data/stock_list.txt`, using
`yfinance` / Yahoo Finance.

## Why this can't run inside this session

This session's outbound network is restricted by org policy and
`query2.finance.yahoo.com` is blocked (403). The code is fully written and
was dry-run tested here (ticker parsing, dedup, date logic, CSV output all
verified) — it just needs to be executed somewhere with normal internet
access, e.g. your own machine.

## How to run it

```bash
pip install -r requirements.txt
python3 build_ticker_map.py        # already run — data/tickers_mapped.csv is checked in
python3 fetch_quarterly_prices.py  # does the actual Yahoo Finance fetch, takes ~10-15 min for 480 names
```

## How it works

1. **`data/stock_list.txt`** — the raw list you gave me, one
   `Company Name (EXCH:CODE)` per line.

2. **`build_ticker_map.py`** — converts each `EXCH:CODE` into a best-guess
   Yahoo Finance symbol. Your list uses MIC exchange codes (XFRA, XPAR, XSWX,
   XASX, ...) but Yahoo uses its own suffixes (`.F`, `.PA`, `.SW`, `.AX`,
   ...), so this applies a suffix-mapping table. A handful of entries don't
   fit the pattern at all (e.g. several stocks are tagged `XWBO`/Vienna or
   `XMEX`/Mexico in your source data purely as a foreign cross-listing code —
   Japan Tobacco, Sony, Halliburton, KDDI, Murata, etc. don't actually trade
   in Vienna or Mexico) — those ~15 cases have explicit overrides routing
   them to the stock's real primary listing. Output: `data/tickers_mapped.csv`.

3. **`fetch_quarterly_prices.py`** — for each company:
   - Downloads daily history from Yahoo Finance for the guessed symbol.
   - If that symbol returns nothing, queries Yahoo's search API with the
     company name and retries with the top match (auto-correction).
   - For each of the 21 quarter dates, takes the close on the first trading
     day on/after that date (handles weekends/holidays).
   - If a company still can't be resolved, it's logged and skipped rather
     than blocking the rest of the run.

## Output (in `output/`, created on run)

- **`quarterly_prices_wide.csv`** — rows = quarter date, columns = company
  name, values = close price. Best for a portfolio-weighting engine.
- **`quarterly_prices_long.csv`** — tidy format:
  `quarter_date, company_name, yahoo_symbol, close_price`.
- **`resolved_ticker_map.csv`** — the actual Yahoo symbol used per company
  (flags `auto-corrected` where the initial guess failed and the search
  fallback found a working symbol instead — worth spot-checking these).
- **`unresolved_tickers.csv`** — companies with no data at all. Fix the
  symbol manually in `data/tickers_mapped.csv` (or in the
  `MANUAL_OVERRIDES` dict in `build_ticker_map.py`) and re-run.

## Known caveats

- **~480 unique companies**, not 486 — your list has 6 exact duplicate
  entries (e.g. Analog Devices, Roper Technologies, Shell, Alphabet
  GOOG/GOOGL... only the first occurrence per name is kept once collapsed by
  name — GOOG and GOOGL are both present as they're genuinely different
  tickers).
- **Recent IPOs / spinoffs** (Kenvue, GE Vernova, Sandoz Group, Solventum,
  Veralto, Kioxia, CCH Holdings, etc.) won't have prices before their listing
  date — those quarters will be blank/NaN in the output, which is correct
  behavior for a historical portfolio chart, not a bug.
- **SpaceX** (`SPACE EXPLORATION TECHNOLOGIES CORP.`) is a private company —
  there's no real Yahoo Finance quote for it, so it's deliberately left
  unmapped and will show up in `unresolved_tickers.csv`.
- **Philippine Stock Exchange (XPHS) and some smaller/OTC names** have
  inconsistent Yahoo coverage — verify those manually if they come back
  empty.
- Exchange-suffix mapping is a **best-effort guess for ~480 tickers**, not
  hand-verified individually. The auto-correction fallback catches most
  misses, but you should skim `resolved_ticker_map.csv` for `auto-corrected`
  rows and `unresolved_tickers.csv` after the first run.
