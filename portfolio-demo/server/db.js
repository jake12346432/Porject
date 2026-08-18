import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Uses Node's built-in SQLite (available unflagged since Node 22.5+) instead
// of a native npm package like better-sqlite3 — that requires a C++ compiler
// (Visual Studio Build Tools on Windows) to install, which isn't available on
// every machine this needs to run on. This has zero extra install step.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "buylist.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS buy_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    asset_class TEXT NOT NULL DEFAULT 'equity',
    side TEXT NOT NULL DEFAULT 'buy',
    portfolio_name TEXT NOT NULL,
    dollar_amount REAL NOT NULL,
    total_allocated REAL NOT NULL,
    cash REAL NOT NULL,
    holdings_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_buy_lists_trade_date ON buy_lists(trade_date);

  CREATE TABLE IF NOT EXISTS portfolios (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Portfolio',
    rpq_equity_pct REAL NOT NULL,
    rpq_fi_pct REAL NOT NULL,
    equity_buy_list_id INTEGER,
    bond_buy_list_id INTEGER,
    equity_sold_at TEXT,
    bond_sold_at TEXT,
    equity_sell_buy_list_id INTEGER,
    bond_sell_buy_list_id INTEGER
  );
`);
// Defensive migrations for a DB file created before these columns existed. Each throws if the
// column is already there, which is fine to ignore — cheaper than a real migration framework for
// a single-table demo app.
try { db.exec(`ALTER TABLE buy_lists ADD COLUMN asset_class TEXT NOT NULL DEFAULT 'equity'`); } catch { /* already migrated */ }
try { db.exec(`ALTER TABLE buy_lists ADD COLUMN side TEXT NOT NULL DEFAULT 'buy'`); } catch { /* already migrated */ }
try { db.exec(`ALTER TABLE portfolios ADD COLUMN name TEXT NOT NULL DEFAULT 'Portfolio'`); } catch { /* already migrated */ }

// `dollarAmount` holds whatever currency the asset class trades in — dollars for equity,
// pounds for bonds; the column name predates fixed income and isn't worth a rename/migration.
// `side` is 'buy' or 'sell' — a sell row is a mirror of the buy it liquidates, produced by
// POST /api/portfolios/:id/sell, and lands in the same daily order book/report as buys.
export function insertBuyList({ tradeDate, assetClass = "equity", side = "buy", portfolioName, dollarAmount, totalAllocated, cash, holdings }) {
  const stmt = db.prepare(`
    INSERT INTO buy_lists (created_at, trade_date, asset_class, side, portfolio_name, dollar_amount, total_allocated, cash, holdings_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    new Date().toISOString(),
    tradeDate,
    assetClass,
    side,
    portfolioName,
    dollarAmount,
    totalAllocated,
    cash,
    JSON.stringify(holdings)
  );
  return Number(info.lastInsertRowid);
}

function rowToBuyList(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    tradeDate: r.trade_date,
    assetClass: r.asset_class,
    side: r.side,
    portfolioName: r.portfolio_name,
    dollarAmount: r.dollar_amount,
    totalAllocated: r.total_allocated,
    cash: r.cash,
    holdings: JSON.parse(r.holdings_json),
  };
}

export function getBuyListsForDate(tradeDate) {
  const stmt = db.prepare(`
    SELECT id, created_at, trade_date, asset_class, side, portfolio_name, dollar_amount, total_allocated, cash, holdings_json
    FROM buy_lists WHERE trade_date = ? ORDER BY created_at ASC
  `);
  return stmt.all(tradeDate).map(rowToBuyList);
}

export function getBuyListById(id) {
  const row = db.prepare(`
    SELECT id, created_at, trade_date, asset_class, side, portfolio_name, dollar_amount, total_allocated, cash, holdings_json
    FROM buy_lists WHERE id = ?
  `).get(id);
  return row ? rowToBuyList(row) : null;
}

/**
 * A "portfolio" ties together one equity buy and one bond buy submitted through the guided
 * RPQ → Equity → Fixed Income flow, plus the RPQ's target split and each leg's sell status. There's
 * no login system, so the id (a UUID generated here) is the only key — the browser holds onto the
 * full list of ids it's created (localStorage) to come back to the same portfolios later. Not tied
 * to any user account. `name` is chosen client-side (e.g. "Portfolio 2") so multiple portfolios in
 * the same browser are distinguishable on the Dashboard.
 *
 * Created once whichever leg finishes first has its buy saved — normally Equity, but a 0%-equity
 * target skips straight to Fixed Income, so this accepts either (or both) leg ids at creation time
 * rather than requiring equityBuyListId specifically.
 */
export function createPortfolio({ id, name, rpqEquityPct, rpqFiPct, equityBuyListId, bondBuyListId }) {
  db.prepare(`
    INSERT INTO portfolios (id, created_at, name, rpq_equity_pct, rpq_fi_pct, equity_buy_list_id, bond_buy_list_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, new Date().toISOString(), name || "Portfolio", rpqEquityPct, rpqFiPct, equityBuyListId || null, bondBuyListId || null);
}

export function attachBondBuy(id, bondBuyListId) {
  db.prepare(`UPDATE portfolios SET bond_buy_list_id = ? WHERE id = ?`).run(bondBuyListId, id);
}

// Re-points an already-created portfolio's equity leg at a fresh buy — used when someone backs up
// from Fixed Income to Equity and rebuys, rather than letting the original equity leg go orphaned
// while a second portfolio gets created for the new one.
export function attachEquityBuy(id, equityBuyListId) {
  db.prepare(`UPDATE portfolios SET equity_buy_list_id = ? WHERE id = ?`).run(equityBuyListId, id);
}

// Keeps a portfolio's stored target split in sync if someone backs all the way up to Risk profile
// (after already buying a leg) and changes it before buying again.
export function updateRpqSplit(id, rpqEquityPct, rpqFiPct) {
  db.prepare(`UPDATE portfolios SET rpq_equity_pct = ?, rpq_fi_pct = ? WHERE id = ?`).run(rpqEquityPct, rpqFiPct, id);
}

export function markSold(id, side, sellBuyListId) {
  const soldAt = new Date().toISOString();
  if (side === "equity") {
    db.prepare(`UPDATE portfolios SET equity_sold_at = ?, equity_sell_buy_list_id = ? WHERE id = ?`).run(soldAt, sellBuyListId, id);
  } else {
    db.prepare(`UPDATE portfolios SET bond_sold_at = ?, bond_sell_buy_list_id = ? WHERE id = ?`).run(soldAt, sellBuyListId, id);
  }
}

export function getPortfolioById(id) {
  const row = db.prepare(`SELECT * FROM portfolios WHERE id = ?`).get(id);
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    rpqEquityPct: row.rpq_equity_pct,
    rpqFiPct: row.rpq_fi_pct,
    equityBuyListId: row.equity_buy_list_id,
    bondBuyListId: row.bond_buy_list_id,
    equitySoldAt: row.equity_sold_at,
    bondSoldAt: row.bond_sold_at,
    equitySellBuyListId: row.equity_sell_buy_list_id,
    bondSellBuyListId: row.bond_sell_buy_list_id,
  };
}
