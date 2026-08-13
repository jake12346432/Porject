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
    portfolio_name TEXT NOT NULL,
    dollar_amount REAL NOT NULL,
    total_allocated REAL NOT NULL,
    cash REAL NOT NULL,
    holdings_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_buy_lists_trade_date ON buy_lists(trade_date);
`);

export function insertBuyList({ tradeDate, portfolioName, dollarAmount, totalAllocated, cash, holdings }) {
  const stmt = db.prepare(`
    INSERT INTO buy_lists (created_at, trade_date, portfolio_name, dollar_amount, total_allocated, cash, holdings_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    new Date().toISOString(),
    tradeDate,
    portfolioName,
    dollarAmount,
    totalAllocated,
    cash,
    JSON.stringify(holdings)
  );
  return Number(info.lastInsertRowid);
}

export function getBuyListsForDate(tradeDate) {
  const stmt = db.prepare(`
    SELECT id, created_at, trade_date, portfolio_name, dollar_amount, total_allocated, cash, holdings_json
    FROM buy_lists WHERE trade_date = ? ORDER BY created_at ASC
  `);
  const rows = stmt.all(tradeDate);
  return rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    tradeDate: r.trade_date,
    portfolioName: r.portfolio_name,
    dollarAmount: r.dollar_amount,
    totalAllocated: r.total_allocated,
    cash: r.cash,
    holdings: JSON.parse(r.holdings_json),
  }));
}
