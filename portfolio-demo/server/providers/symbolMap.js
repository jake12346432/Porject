/**
 * Maps this app's {exch, ticker} pairs (the exchange-native codes baked into
 * the frontend's STOCKS list) to the symbol format each quote provider
 * expects. This is a best-effort first pass, not verified ground truth —
 * neither provider is reachable from the dev sandbox this was built in, so
 * check server logs after deploying and adjust entries that come back
 * wrong/missing (same process used to debug the earlier Yahoo integration).
 *
 * Finnhub's free tier reliably covers US-listed names; FINNHUB_EXCHANGES
 * lists which of this app's exchange codes are even worth trying there.
 * Twelve Data covers far more international exchanges but takes an explicit
 * `exchange` request parameter (a name, not a ticker suffix) rather than a
 * combined symbol — TWELVE_DATA_EXCHANGE maps this app's exchange codes to
 * the exchange name string Twelve Data expects.
 */

// A handful of entries are tagged with the WRONG exchange in the source data
// (foreign cross-listing codes, not real listings on that exchange — same
// issue hit and fixed for the Yahoo-based historical CSV export earlier).
// Route these to the company's real primary listing instead.
const MANUAL_OVERRIDES = {
  "XMEX:4507N": { exch: "XTKS", ticker: "4507" }, // Shionogi
  "XMEX:4519N": { exch: "XTKS", ticker: "4519" }, // Chugai Pharmaceutical
  "XMEX:RNECN": { exch: "XTKS", ticker: "6723" }, // Renesas Electronics
  "XMEX:6857N": { exch: "XTKS", ticker: "6857" }, // Advantest
  "XMEX:6981N": { exch: "XTKS", ticker: "6981" }, // Murata Manufacturing
  "XMEX:9433N": { exch: "XTKS", ticker: "9433" }, // KDDI
  "XMEX:9766N": { exch: "XTKS", ticker: "9766" }, // Konami Group
  "XMEX:9983N": { exch: "XTKS", ticker: "9983" }, // Fast Retailing
  "XMEX:AAFN": { exch: "XLON", ticker: "AAF" },   // Airtel Africa
  "XMEX:RRN": { exch: "XLON", ticker: "RR" },     // Rolls-Royce Holdings
  "XMEX:SIKAN": { exch: "XSWX", ticker: "SIKA" }, // Sika
  "XWBO:SON1": { exch: "XTKS", ticker: "6758" },  // Sony Group
  "XWBO:CVC": { exch: "XAMS", ticker: "CVC" },    // CVC Capital Partners
  "XWBO:GTT": { exch: "XPAR", ticker: "GTT" },    // Gaztransport et Technigaz
  "XWBO:HAL": { exch: "XNYS", ticker: "HAL" },    // Halliburton
  "XWBO:STMN": { exch: "XSWX", ticker: "STMN" },  // Straumann Holding
  // XWBO:ANDR (Andritz) and XWBO:VOE (voestalpine) are genuinely Vienna-listed.
};

// Exchange codes where Finnhub's FREE tier is expected to actually return
// data. Everything else is skipped on Finnhub and left to Twelve Data.
const FINNHUB_EXCHANGES = new Set(["XNYS", "XNAS", "BATS", "OTCM"]);

// This app's exchange code -> the exchange name Twelve Data's API expects
// in its `exchange` query parameter.
const TWELVE_DATA_EXCHANGE = {
  XNYS: "NYSE",
  XNAS: "NASDAQ",
  BATS: "CBOE",
  OTCM: null, // Twelve Data has inconsistent OTC coverage; try without exchange hint
  XFRA: "Frankfurt",
  XETR: "XETRA",
  XWBO: "Vienna",
  XSWX: "SIX",
  XBRU: "Euronext Brussels",
  XAMS: "Euronext Amsterdam",
  XPAR: "Euronext Paris",
  XLIS: "Euronext Lisbon",
  XMIL: "Milan",
  BMEX: "BME",
  XLON: "LSE",
  XDUB: "Irish",
  XSTO: "Stockholm",
  XHEL: "Helsinki",
  XOSL: "Oslo Bors",
  XCSE: "Copenhagen",
  XWAR: "Warsaw",
  XASX: "ASX",
  XTSX: "TSXV",
  XTKS: "Tokyo",
};

function resolve(exch, ticker) {
  const override = MANUAL_OVERRIDES[`${exch}:${ticker}`];
  if (override) return override;
  return { exch, ticker };
}

/** Symbol to send Finnhub, or null if this exchange isn't worth trying there. */
export function finnhubSymbol(exch, ticker) {
  const r = resolve(exch, ticker);
  if (!FINNHUB_EXCHANGES.has(r.exch)) return null;
  return r.ticker;
}

/** { symbol, exchange } to send Twelve Data, exchange may be null/omitted. */
export function twelveDataSymbol(exch, ticker) {
  const r = resolve(exch, ticker);
  const exchange = TWELVE_DATA_EXCHANGE[r.exch] ?? null;
  return { symbol: r.ticker.replace(/\s+/g, "-"), exchange };
}
