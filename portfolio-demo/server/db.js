import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "buylist.db"));
db.pragma("journal_mode = WAL");

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
    VALUES (@created_at, @trade_date, @portfolio_name, @dollar_amount, @total_allocated, @cash, @holdings_json)
  `);
  const info = stmt.run({
    created_at: new Date().toISOString(),
    trade_date: tradeDate,
    portfolio_name: portfolioName,
    dollar_amount: dollarAmount,
    total_allocated: totalAllocated,
    cash: cash,
    holdings_json: JSON.stringify(holdings),
  });
  return info.lastInsertRowid;
}

export function getBuyListsForDate(tradeDate) {
  const rows = db.prepare(`
    SELECT id, created_at, trade_date, portfolio_name, dollar_amount, total_allocated, cash, holdings_json
    FROM buy_lists WHERE trade_date = ? ORDER BY created_at ASC
  `).all(tradeDate);
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
