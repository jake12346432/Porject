import React, { useState, useEffect, useCallback } from "react";
import { THEMES, FlowBreadcrumb, AllocBarChart, SplitBarChart, allocToChartData, allocFromHoldings } from "./shared.jsx";
import { getPortfolio, sellPortfolioLeg } from "./api.js";

// Blends region/sector allocation across every portfolio's equity (or bond) leg, weighted by each
// leg's own invested amount — valid without an FX rate because every equity leg is already in the
// same currency (USD) and every bond leg in the same currency (GBP); this never mixes the two.
function blendedAlloc(portfolios, leg, groupKey) {
  const totals = {};
  let grandTotal = 0;
  for (const p of portfolios) {
    const l = p[leg];
    if (!l) continue;
    grandTotal += l.totalAllocated;
    for (const h of l.holdings) {
      const key = h[groupKey] || "Unknown";
      totals[key] = (totals[key] || 0) + (h.weight / 100) * l.totalAllocated;
    }
  }
  const out = {};
  if (grandTotal > 0) {
    for (const k in totals) out[k] = (totals[k] / grandTotal) * 100;
  }
  return out;
}

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

// Weight is deliberately not shown here — just instrument + amount, per how the Dashboard's
// holdings tables are meant to read (the full weight breakdown lives in the region/sector charts).
function TopHoldingsTable({ holdings, t, currency, idKey, nameKey }) {
  const top10 = [...holdings].sort((a, b) => b.weight - a.weight).slice(0, 10);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead><tr style={{ background: t.surface2 }}>
        {["Instrument", "Amount"].map((h, i) => (
          <th key={h} style={{ padding: "7px 10px", fontWeight: 500, color: t.muted, fontSize: 10.5, textTransform: "uppercase", textAlign: i >= 1 ? "right" : "left" }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {top10.map(h => (
          <tr key={h[idKey]} style={{ borderTop: `1px solid ${t.surfaceAlt}` }}>
            <td style={{ padding: "6px 10px", color: t.textSecondary, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h[nameKey]}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{currency}{h.amount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Full (non-truncated) region/sector breakdown — a plain list rather than AllocBarChart's ranked
// top-N view, since "detailed"/"full" here specifically means nothing gets folded into "Other".
function FullAllocList({ alloc, t, color }) {
  const entries = Object.entries(alloc).filter(([, v]) => v > 0.005).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div style={{ fontSize: 12.5, color: t.faint, padding: "12px 0" }}>No data</div>;
  return (
    <div>
      {entries.map(([name, value]) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
          <div style={{ width: 130, fontSize: 12, color: t.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ flex: 1, height: 8, background: t.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, value)}%`, height: "100%", background: color, borderRadius: 4 }} />
          </div>
          <div style={{ width: 48, textAlign: "right", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: t.muted }}>{value.toFixed(1)}%</div>
        </div>
      ))}
    </div>
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

function NavBar({ theme, setTheme, t, onStepClick, reachableSteps }) {
  return (
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
      <FlowBreadcrumb t={t} step="dashboard" onStepClick={onStepClick} reachable={reachableSteps} />
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
}

export default function Dashboard({ theme, setTheme, portfolioIds, onResumeFi, onMakeAdditional, onStartOver, onStepClick, reachableSteps }) {
  const t = THEMES[theme];
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null); // null = hub view
  const [selling, setSelling] = useState(null); // `${portfolioId}:${side}` while a sell is in flight
  const [sellError, setSellError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const results = await Promise.all(portfolioIds.map(id => getPortfolio(id)));
      setPortfolios(results);
    } catch (err) {
      setError(err.message || "Failed to load your portfolios.");
    } finally {
      setLoading(false);
    }
  }, [portfolioIds]);

  useEffect(() => { load(); }, [load]);

  async function handleSell(portfolioId, side) {
    setSelling(`${portfolioId}:${side}`); setSellError(null);
    try {
      await sellPortfolioLeg(portfolioId, side);
      await load();
    } catch (err) {
      setSellError(err.message || "Failed to process this sell.");
    } finally {
      setSelling(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text }}>
        <NavBar theme={theme} setTheme={setTheme} t={t} onStepClick={onStepClick} reachableSteps={reachableSteps} />
        <div style={{ textAlign: "center", padding: "100px 20px", color: t.muted }}>Loading your portfolios…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text }}>
        <NavBar theme={theme} setTheme={setTheme} t={t} onStepClick={onStepClick} reachableSteps={reachableSteps} />
        <div style={{ textAlign: "center", padding: "100px 20px" }}>
          <div style={{ color: t.negative, marginBottom: 16 }}>{error}</div>
          <button onClick={onStartOver} style={{ padding: "10px 22px", borderRadius: 99, border: `1px solid ${t.borderStrong}`, background: "transparent", color: t.textSecondary, cursor: "pointer" }}>
            Start a new portfolio
          </button>
        </div>
      </div>
    );
  }

  const selected = selectedId ? portfolios.find(p => p.id === selectedId) : null;
  // "Incomplete" means missing a leg it actually needs — a 0% target on either side means that
  // side was deliberately skipped, not left unfinished, so it must never count as missing.
  const incomplete = portfolios.find(p => p.rpqFiPct > 0 && p.equity && !p.bond);

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <NavBar theme={theme} setTheme={setTheme} t={t} onStepClick={onStepClick} reachableSteps={reachableSteps} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 28px 100px" }}>

        {selected ? (
          <PortfolioDetail
            t={t} portfolio={selected} selling={selling} sellError={sellError}
            onSell={side => handleSell(selected.id, side)}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <DashboardHub
            t={t} portfolios={portfolios} incomplete={incomplete}
            onSelect={setSelectedId}
            onResumeFi={() => {
              const equityAmt = incomplete.equity.totalAllocated;
              const fiAmount = incomplete.rpqEquityPct > 0
                ? Math.round((equityAmt / incomplete.rpqEquityPct) * incomplete.rpqFiPct)
                : null;
              onResumeFi(incomplete.rpqEquityPct, incomplete.rpqFiPct, incomplete.id, fiAmount);
            }}
            onMakeAdditional={() => onMakeAdditional(portfolios.length ? portfolios[portfolios.length - 1].rpqEquityPct : 60)}
            onStartOver={onStartOver}
          />
        )}
      </div>
    </div>
  );
}

function DashboardHub({ t, portfolios, incomplete, onSelect, onResumeFi, onMakeAdditional, onStartOver }) {
  const complete = portfolios.filter(p => p.equity && p.bond);
  const totalEquityInvested = complete.reduce((a, p) => a + (p.equity ? p.equity.totalAllocated : 0), 0);
  const totalFiInvested = complete.reduce((a, p) => a + (p.bond ? p.bond.totalAllocated : 0), 0);
  const totalEquityCash = portfolios.reduce((a, p) => a + (p.equity ? p.equity.cash : 0), 0);
  const totalFiCash = portfolios.reduce((a, p) => a + (p.bond ? p.bond.cash : 0), 0);

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.accentText, marginBottom: 8 }}>
          YOUR PORTFOLIOS
        </div>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: t.textStrong, margin: 0 }}>
          {portfolios.length} portfolio{portfolios.length === 1 ? "" : "s"}
        </h1>
      </div>

      {incomplete && (
        <div style={{ textAlign: "center", marginBottom: 24, padding: "16px 20px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.staleBorder}` }}>
          <div style={{ fontSize: 13.5, color: t.textSecondary, marginBottom: 10 }}>
            "{incomplete.name}" is missing its Fixed Income portion.
          </div>
          <button onClick={onResumeFi} style={{
            padding: "10px 22px", borderRadius: 99, border: "none", background: t.accent, color: "#FFFFFF",
            fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          }}>
            Complete Fixed Income →
          </button>
        </div>
      )}

      <SectionCard t={t} heading="Entire portfolio" sub="Blended across every portfolio you've built, weighted by each leg's invested amount. Equity (USD) and Fixed Income (GBP) are kept separate — blending them would need a live FX rate this demo doesn't have.">
        <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
          <StatTile t={t} label="Equity invested" value={`$${totalEquityInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`${complete.length} of ${portfolios.length} portfolios`} />
          <StatTile t={t} label="Fixed Income invested" value={`£${totalFiInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`${complete.length} of ${portfolios.length} portfolios`} />
          <StatTile t={t} label="Cash" value={`$${totalEquityCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="1.75% policy sleeve" />
          <StatTile t={t} label="Cash" value={`£${totalFiCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="1.75% policy sleeve" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textStrong, marginBottom: 10 }}>All Equity — region</div>
            <FullAllocList t={t} color={t.accent} alloc={blendedAlloc(portfolios, "equity", "country")} />
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textStrong, margin: "18px 0 10px" }}>All Equity — sector</div>
            <FullAllocList t={t} color={t.teal} alloc={blendedAlloc(portfolios, "equity", "sector")} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textStrong, marginBottom: 10 }}>All Fixed Income — region</div>
            <FullAllocList t={t} color={t.accent} alloc={blendedAlloc(portfolios, "bond", "region")} />
            <div style={{ fontSize: 13, fontWeight: 700, color: t.textStrong, margin: "18px 0 10px" }}>All Fixed Income — sector</div>
            <FullAllocList t={t} color={t.teal} alloc={blendedAlloc(portfolios, "bond", "sector")} />
          </div>
        </div>
      </SectionCard>

      <SectionCard t={t} heading="Your portfolios">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {portfolios.map(p => (
            <button key={p.id} onClick={() => onSelect(p.id)} style={{
              textAlign: "left", padding: "16px 18px", borderRadius: 14, cursor: "pointer",
              background: t.surface2, border: `1.5px solid ${t.border}`,
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: t.textStrong, marginBottom: 6 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>{p.rpqEquityPct}% Equity / {p.rpqFiPct}% Fixed Income</div>
              <div style={{ fontSize: 11.5, color: t.faint }}>
                {p.equity ? `$${p.equity.totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 })} equity` : p.rpqEquityPct === 0 ? "No equity target" : "Equity not built yet"}
                {" · "}
                {p.bond ? `£${p.bond.totalAllocated.toLocaleString(undefined, { maximumFractionDigits: 0 })} FI` : p.rpqFiPct === 0 ? "No FI target" : "FI not built yet"}
              </div>
              {(p.equitySoldAt || p.bondSoldAt) && (
                <div style={{ fontSize: 11, color: t.positive, marginTop: 6 }}>
                  {(p.rpqEquityPct === 0 || p.equitySoldAt) && (p.rpqFiPct === 0 || p.bondSoldAt) ? "Fully sold" : "Partially sold"}
                </div>
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button onClick={onMakeAdditional} className="tw-btn-primary" style={{
          padding: "16px 32px", borderRadius: 99, border: `1px solid ${t.borderStrong}`,
          background: `linear-gradient(135deg, ${t.lavender}, ${t.accent})`, color: "#FFFFFF",
          fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          + Make new/additional portfolio
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: 30 }}>
        <button onClick={onStartOver} style={{ fontSize: 11.5, color: t.faint, background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}>
          Clear everything and start over
        </button>
      </div>
    </>
  );
}

function PortfolioDetail({ t, portfolio, selling, sellError, onSell, onBack }) {
  const { name, rpqEquityPct, rpqFiPct, equity, bond, equitySoldAt, bondSoldAt } = portfolio;
  // A 0% target on either side means that leg was deliberately skipped, not left unfinished/
  // unsold — so it must count as already "done"/"sold" for that side, not block on a leg that
  // was never meant to exist.
  const bothDone = (rpqEquityPct === 0 || equity) && (rpqFiPct === 0 || bond);
  const bothSold = (rpqEquityPct === 0 || equitySoldAt) && (rpqFiPct === 0 || bondSoldAt);

  return (
    <>
      <button onClick={onBack} style={{ fontSize: 12.5, color: t.muted, background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
        ← All portfolios
      </button>

      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.accentText, marginBottom: 8 }}>
          {name}
        </div>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: t.textStrong, margin: 0 }}>
          {rpqEquityPct}% Equity / {rpqFiPct}% Fixed Income target
        </h1>
      </div>

      {!bothDone && (
        <div style={{ textAlign: "center", marginBottom: 24, padding: "16px 20px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.staleBorder}` }}>
          <div style={{ fontSize: 13.5, color: t.textSecondary }}>
            The Fixed Income portion of this portfolio hasn't been completed yet — go back to the
            portfolio list to continue it.
          </div>
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
          <StatTile t={t} label="Cash" value={equity ? `$${equity.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} sub="1.75% policy sleeve" />
          <StatTile t={t} label="Cash" value={bond ? `£${bond.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} sub="1.75% policy sleeve" />
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
            <SellButton t={t} label="Sell Equity" sold={!!equitySoldAt} soldAt={equitySoldAt} loading={selling === "equity"} onClick={() => onSell("equity")} />
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
            <SellButton t={t} label="Sell Fixed Income" sold={!!bondSoldAt} soldAt={bondSoldAt} loading={selling === "bond"} onClick={() => onSell("bond")} />
          </div>
        </SectionCard>
      )}

      {sellError && <div style={{ textAlign: "center", color: t.negative, fontSize: 13, marginBottom: 16 }}>{sellError}</div>}

      {bothDone && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <SellButton t={t} label="Sell entire portfolio" sold={bothSold} soldAt={bothSold ? [equitySoldAt, bondSoldAt].filter(Boolean).sort().pop() : null} loading={selling === "all"} disabled={bothSold} onClick={() => onSell("all")} />
        </div>
      )}
    </>
  );
}
