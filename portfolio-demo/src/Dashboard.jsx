import React, { useState, useEffect, useCallback } from "react";
import { THEMES, FlowBreadcrumb, AllocBarChart, SplitBarChart, allocToChartData, allocFromHoldings } from "./shared.jsx";
import { getPortfolio, sellPortfolioLeg } from "./api.js";

function StatTile({ label, value, sub, t }) {
  return (
    <div style={{ flex: 1, minWidth: 130, textAlign: "center", padding: "16px 14px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.borderMuted}` }}>
      <div style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: t.textStrong, fontFamily: "'Inter', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: t.faint, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionCard({ heading, sub, children, t }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", color: t.textStrong, marginBottom: sub ? 4 : 14 }}>{heading}</div>
      {sub && <div style={{ fontSize: 13, color: t.muted, marginBottom: 14, lineHeight: 1.5 }}>{sub}</div>}
      {children}
    </div>
  );
}

function TopHoldingsTable({ holdings, t, currency, idKey, nameKey }) {
  const top10 = [...holdings].sort((a, b) => b.weight - a.weight).slice(0, 10);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead><tr style={{ background: t.surface2 }}>
        {["Instrument", "Weight", "Amount"].map((h, i) => (
          <th key={h} style={{ padding: "7px 10px", fontWeight: 500, color: t.muted, fontSize: 10.5, textTransform: "uppercase", textAlign: i >= 1 ? "right" : "left" }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {top10.map(h => (
          <tr key={h[idKey]} style={{ borderTop: `1px solid ${t.surfaceAlt}` }}>
            <td style={{ padding: "6px 10px", color: t.textSecondary, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h[nameKey]}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{h.weight.toFixed(2)}%</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{currency}{h.amount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SellButton({ label, onClick, disabled, sold, soldAt, loading, t }) {
  if (sold) {
    return (
      <div style={{ textAlign: "center", fontSize: 12, color: t.positive, padding: "12px 20px", borderRadius: 99, border: `1px solid ${t.lockBorder}` }}>
        ✓ Sold {new Date(soldAt).toLocaleDateString()}
      </div>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      padding: "12px 22px", borderRadius: 99, border: `1px solid ${t.negative}`,
      background: "transparent", color: t.negative, fontSize: 12.5, fontWeight: 700,
      cursor: disabled || loading ? "not-allowed" : "pointer", opacity: disabled || loading ? 0.5 : 1,
      fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em",
    }}>
      {loading ? "Selling…" : label}
    </button>
  );
}

export default function Dashboard({ theme, setTheme, portfolioId, onResumeFi, onStartOver }) {
  const t = THEMES[theme];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selling, setSelling] = useState(null); // 'equity' | 'bond' | 'all' | null
  const [sellError, setSellError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getPortfolio(portfolioId);
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load this portfolio.");
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { load(); }, [load]);

  async function handleSell(side) {
    setSelling(side); setSellError(null);
    try {
      await sellPortfolioLeg(portfolioId, side);
      await load();
    } catch (err) {
      setSellError(err.message || "Failed to process this sell.");
    } finally {
      setSelling(null);
    }
  }

  const NavBar = () => (
    <div style={{
      position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 16,
      padding: "14px 28px", background: t.navBg, backdropFilter: "blur(10px)", borderBottom: `1px solid ${t.borderMuted}`,
    }}>
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <defs>
          <linearGradient id={`dash-ring-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme === "dark" ? "#B79BE0" : "#8A3FFC"} />
            <stop offset="100%" stopColor={t.accent} />
          </linearGradient>
        </defs>
        <circle cx="15" cy="15" r="11.5" fill="none" stroke={`url(#dash-ring-${theme})`} strokeWidth="3.2"
          strokeLinecap="round" strokeDasharray="60 12.2" transform="rotate(-98 15 15)" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 900, letterSpacing: "0.01em", color: t.textStrong }}>TITAN</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 500, color: t.muted }}>Wealth</span>
      </div>
      <div style={{ width: 1, height: 22, background: t.gridLine, margin: "0 4px" }} />
      <FlowBreadcrumb t={t} step="dashboard" />
      <div style={{ marginLeft: "auto" }}>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle light and dark mode"
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 99,
            border: "none", background: t.accent, color: "#FFFFFF", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          }}
        >
          {theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text }}>
        <NavBar />
        <div style={{ textAlign: "center", padding: "100px 20px", color: t.muted }}>Loading your portfolio…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text }}>
        <NavBar />
        <div style={{ textAlign: "center", padding: "100px 20px" }}>
          <div style={{ color: t.negative, marginBottom: 16 }}>{error || "Portfolio not found."}</div>
          <button onClick={onStartOver} style={{ padding: "10px 22px", borderRadius: 99, border: `1px solid ${t.borderStrong}`, background: "transparent", color: t.textSecondary, cursor: "pointer" }}>
            Start a new portfolio
          </button>
        </div>
      </div>
    );
  }

  const { rpqEquityPct, rpqFiPct, equity, bond, equitySoldAt, bondSoldAt } = data;
  const bothSold = equitySoldAt && bondSoldAt;
  const bothDone = equity && bond;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 28px 100px" }}>

        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.accentText, marginBottom: 8 }}>
            YOUR PORTFOLIO
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: t.textStrong, margin: 0 }}>
            {rpqEquityPct}% Equity / {rpqFiPct}% Fixed Income target
          </h1>
        </div>

        {!bothDone && (
          <div style={{ textAlign: "center", marginBottom: 24, padding: "16px 20px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.staleBorder}` }}>
            <div style={{ fontSize: 13.5, color: t.textSecondary, marginBottom: 10 }}>
              The Fixed Income portion of this portfolio hasn't been completed yet.
            </div>
            <button onClick={() => onResumeFi(rpqEquityPct, rpqFiPct)} style={{
              padding: "10px 22px", borderRadius: 99, border: "none", background: t.accent, color: "#FFFFFF",
              fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            }}>
              Complete Fixed Income →
            </button>
          </div>
        )}

        <SectionCard t={t} heading="Overall allocation" sub="Equity is priced in USD and Fixed Income in GBP — shown separately below since blending them into one figure would need a live FX rate this demo doesn't have.">
          <SplitBarChart t={t} data={[
            { name: "Equity", value: rpqEquityPct, color: t.accent },
            { name: "Fixed Income", value: rpqFiPct, color: t.teal },
          ]} />
          <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
            <StatTile t={t} label="Equity invested" value={equity ? `$${equity.totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} sub={equity ? `${equity.holdings.length} holdings` : "Not built yet"} />
            <StatTile t={t} label="Fixed Income invested" value={bond ? `£${bond.totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} sub={bond ? `${bond.holdings.length} holdings` : "Not built yet"} />
          </div>
        </SectionCard>

        {equity && (
          <SectionCard t={t} heading="Equity portfolio" sub={equity.portfolioName}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Region allocation</div>
                <AllocBarChart t={t} color={t.accent} data={allocToChartData(allocFromHoldings(equity.holdings, "country"), 7)} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Sector allocation</div>
                <AllocBarChart t={t} color={t.teal} data={allocToChartData(allocFromHoldings(equity.holdings, "sector"), 8)} />
              </div>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Top holdings</div>
            <TopHoldingsTable t={t} holdings={equity.holdings} currency="$" idKey="ticker" nameKey="name" />
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <SellButton t={t} label="Sell Equity" sold={!!equitySoldAt} soldAt={equitySoldAt} loading={selling === "equity"} onClick={() => handleSell("equity")} />
            </div>
          </SectionCard>
        )}

        {bond && (
          <SectionCard t={t} heading="Fixed Income portfolio" sub={bond.portfolioName}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Region allocation</div>
                <AllocBarChart t={t} color={t.accent} data={allocToChartData(allocFromHoldings(bond.holdings, "region"), 7)} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Sector allocation</div>
                <AllocBarChart t={t} color={t.teal} data={allocToChartData(allocFromHoldings(bond.holdings, "sector"), 8)} />
              </div>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Top holdings</div>
            <TopHoldingsTable t={t} holdings={bond.holdings} currency="£" idKey="isin" nameKey="name" />
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <SellButton t={t} label="Sell Fixed Income" sold={!!bondSoldAt} soldAt={bondSoldAt} loading={selling === "bond"} onClick={() => handleSell("bond")} />
            </div>
          </SectionCard>
        )}

        {sellError && <div style={{ textAlign: "center", color: t.negative, fontSize: 13, marginBottom: 16 }}>{sellError}</div>}

        {bothDone && (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <SellButton t={t} label="Sell entire portfolio" sold={bothSold} soldAt={equitySoldAt && bondSoldAt ? [equitySoldAt, bondSoldAt].sort().pop() : null} loading={selling === "all"} disabled={bothSold} onClick={() => handleSell("all")} />
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button onClick={onStartOver} style={{ fontSize: 12, color: t.muted, background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}>
            Start a new portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
