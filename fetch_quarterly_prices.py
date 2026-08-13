"""
Fetches quarterly closing prices (one data point every 3 months, on/near the
1st of Mar/Jun/Sep/Dec starting 2021-06-01 through 2026-06-01) for every
ticker in data/tickers_mapped.csv, using yfinance / Yahoo Finance.

Usage:
    pip install -r requirements.txt
    python3 fetch_quarterly_prices.py

Outputs (in output/):
    quarterly_prices_wide.csv   - rows=quarter date, columns=company, values=close price
    quarterly_prices_long.csv   - tidy format: date, company, yahoo_symbol, close_price
    resolved_ticker_map.csv     - final symbol actually used per company (may differ
                                   from the initial guess if auto-correction kicked in)
    unresolved_tickers.csv      - companies we could not get ANY price data for;
                                   fix these manually in data/tickers_mapped.csv and re-run

Why "auto-correction": data/tickers_mapped.csv is built from exchange-code
suffix rules (see build_ticker_map.py) and is a best guess, not verified
ground truth for all 486 names. When a guessed symbol returns no data, this
script queries Yahoo Finance's search endpoint with the company name and
retries with the top candidate before giving up.
"""
import csv
import sys
import time
from pathlib import Path
from datetime import date

import pandas as pd
import yfinance as yf
import requests

ROOT = Path(__file__).parent
MAPPED_CSV = ROOT / "data" / "tickers_mapped.csv"
OUT_DIR = ROOT / "output"

START = "2021-06-01"
END = "2026-06-01"

# Quarter dates: 2021-06-01, 2021-09-01, ..., 2026-06-01 (21 points)
QUARTER_DATES = pd.date_range(start=START, end=END, freq="3MS")

SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search"


def load_mapping():
    with MAPPED_CSV.open() as f:
        rows = list(csv.DictReader(f))
    # Dedupe by company name, keep first occurrence
    seen = {}
    for r in rows:
        if r["company_name"] not in seen:
            seen[r["company_name"]] = r
    return list(seen.values())


def yahoo_search_best_symbol(company_name: str) -> str | None:
    """Fallback: ask Yahoo's search/autocomplete API for a symbol match."""
    try:
        resp = requests.get(
            SEARCH_URL,
            params={"q": company_name, "quotesCount": 5, "newsCount": 0},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        )
        resp.raise_for_status()
        quotes = resp.json().get("quotes", [])
        for q in quotes:
            if q.get("quoteType") == "EQUITY":
                return q.get("symbol")
        if quotes:
            return quotes[0].get("symbol")
    except Exception as e:
        print(f"    search fallback failed for {company_name!r}: {e}")
    return None


def nearest_quarterly_closes(hist: pd.DataFrame) -> dict:
    """For each target quarter date, take the close on/after that date
    (first available trading day), falling back to the last close before it
    if nothing on/after exists (e.g. most recent quarter)."""
    closes = hist["Close"]
    result = {}
    for qd in QUARTER_DATES:
        on_or_after = closes[closes.index >= qd]
        if len(on_or_after):
            result[qd] = float(on_or_after.iloc[0])
        else:
            before = closes[closes.index <= qd]
            result[qd] = float(before.iloc[-1]) if len(before) else None
    return result


def fetch_one(symbol: str):
    """Returns a Close-price history DataFrame, or None if empty/unavailable."""
    try:
        hist = yf.Ticker(symbol).history(
            start=START, end=END, interval="1d", auto_adjust=False
        )
    except Exception as e:
        print(f"    error fetching {symbol}: {e}")
        return None
    if hist is None or hist.empty or "Close" not in hist:
        return None
    hist.index = hist.index.tz_localize(None)
    return hist


def main():
    OUT_DIR.mkdir(exist_ok=True)
    companies = load_mapping()
    print(f"Loaded {len(companies)} unique companies to fetch.")

    wide_rows = {qd: {} for qd in QUARTER_DATES}
    resolved_map = []
    unresolved = []

    for i, row in enumerate(companies, 1):
        name = row["company_name"]
        guess = row["yahoo_symbol_guess"]
        print(f"[{i}/{len(companies)}] {name} (guess: {guess or 'NONE'})")

        symbol_used = None
        hist = None

        if guess:
            hist = fetch_one(guess)
            if hist is not None:
                symbol_used = guess

        if hist is None:
            fallback = yahoo_search_best_symbol(name)
            if fallback and fallback != guess:
                print(f"    guess failed, trying search fallback: {fallback}")
                hist = fetch_one(fallback)
                if hist is not None:
                    symbol_used = fallback

        if hist is None:
            print(f"    ! UNRESOLVED: {name}")
            unresolved.append({
                "company_name": name,
                "yahoo_symbol_guess": guess,
                "source_exchange": row["source_exchange"],
                "source_code": row["source_code"],
            })
            resolved_map.append({"company_name": name, "yahoo_symbol_used": "", "status": "FAILED"})
            continue

        note = "" if symbol_used == guess else " (auto-corrected)"
        print(f"    OK using {symbol_used}{note}")
        resolved_map.append({
            "company_name": name,
            "yahoo_symbol_used": symbol_used,
            "status": "auto-corrected" if symbol_used != guess else "ok",
        })

        closes = nearest_quarterly_closes(hist)
        for qd, price in closes.items():
            wide_rows[qd][name] = price

        time.sleep(0.3)  # be polite to Yahoo's endpoint

    # --- write wide CSV ---
    wide_df = pd.DataFrame(wide_rows).T
    wide_df.index.name = "quarter_date"
    wide_df.sort_index(inplace=True)
    wide_df.to_csv(OUT_DIR / "quarterly_prices_wide.csv")

    # --- write long CSV ---
    symbol_by_name = {r["company_name"]: r["yahoo_symbol_used"] for r in resolved_map}
    long_rows = []
    for qd, prices in wide_rows.items():
        for name, price in prices.items():
            long_rows.append({
                "quarter_date": qd.date().isoformat(),
                "company_name": name,
                "yahoo_symbol": symbol_by_name.get(name, ""),
                "close_price": price,
            })
    long_df = pd.DataFrame(long_rows).sort_values(["quarter_date", "company_name"])
    long_df.to_csv(OUT_DIR / "quarterly_prices_long.csv", index=False)

    # --- write resolved map + unresolved list ---
    pd.DataFrame(resolved_map).to_csv(OUT_DIR / "resolved_ticker_map.csv", index=False)
    pd.DataFrame(unresolved).to_csv(OUT_DIR / "unresolved_tickers.csv", index=False)

    print("\nDone.")
    print(f"  {len(companies) - len(unresolved)}/{len(companies)} companies resolved successfully")
    print(f"  Output written to {OUT_DIR}/")
    if unresolved:
        print(f"  {len(unresolved)} companies FAILED - see output/unresolved_tickers.csv")


if __name__ == "__main__":
    main()
