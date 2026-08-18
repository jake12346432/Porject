import { useState } from "react";
import { THEMES, FlowBreadcrumb, AllocBarChart, SplitBarChart, allocToChartData, allocFromHoldings } from "./shared.jsx";
import { submitBuy, submitBondBuy, createPortfolio, attachBondLeg } from "./api.js";

// Same cash-sleeve policy as the (now-removed) per-leg buy functions in PortfolioBuilder.jsx and
// BondPortfolioBuilder.jsx — only (100 - CASH_ALLOCATION_PCT)% of each leg's target is actually
// invested, the rest held back as cash. Computed here now since this is the only place either leg
// actually gets priced and saved.
const CASH_ALLOCATION_PCT = 1.75;

function SectionCard({ heading, sub, children, t }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "22px 24px", marginBottom: 18 }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", color: t.textStrong, marginBottom: sub ? 4 : 14 }}>{heading}</div>
      {sub && <div style={{ fontSize: 13, color: t.muted, marginBottom: 14, lineHeight: 1.5 }}>{sub}</div>}
      {children}
    </div>
  );
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

// Draft holdings aren't priced/sized into £/$ amounts yet — that only happens once Buy runs — so
// this table shows weight only, unlike Dashboard's post-buy TopHoldingsTable which shows amount.
function DraftHoldingsTable({ holdings, t, idKey, nameKey }) {
  const top10 = [...holdings].sort((a, b) => b.weight - a.weight).slice(0, 10);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead><tr style={{ background: t.surface2 }}>
        {["Instrument", "Weight"].map((h, i) => (
          <th key={h} style={{ padding: "7px 10px", fontWeight: 500, color: t.muted, fontSize: 10.5, textTransform: "uppercase", textAlign: i >= 1 ? "right" : "left" }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {top10.map(h => (
          <tr key={h[idKey]} style={{ borderTop: `1px solid ${t.surfaceAlt}` }}>
            <td style={{ padding: "6px 10px", color: t.textSecondary, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h[nameKey]}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{h.weight.toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
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
          <linearGradient id={`summary-ring-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme === "dark" ? "#B79BE0" : "#8A3FFC"} />
            <stop offset="100%" stopColor={t.accent} />
          </linearGradient>
        </defs>
        <circle cx="15" cy="15" r="11.5" fill="none" stroke={`url(#summary-ring-${theme})`} strokeWidth="3.2"
          strokeLinecap="round" strokeDasharray="60 12.2" transform="rotate(-98 15 15)" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 900, letterSpacing: "0.01em", color: t.textStrong }}>TITAN</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 500, color: t.muted }}>Wealth</span>
      </div>
      <div style={{ width: 1, height: 22, background: t.gridLine, margin: "0 4px" }} />
      <FlowBreadcrumb t={t} step="summary" onStepClick={onStepClick} reachable={reachableSteps} />
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

// The combined "buy everything" step of the guided flow (RPQ -> Equity -> Fixed Income ->
// Summary -> Dashboard). Equity and Fixed Income no longer buy anything themselves — they each
// just hand off a draft (unpriced holdings + weights + a target amount) via onBuyComplete, which
// App.jsx stores as equityDraft/bondDraft and routes here. Nothing is priced, sized, or persisted
// server-side until the single "Buy portfolio" button below is pressed, which prices and saves
// both legs (whichever exist) and links them into one portfolio record in a single pass.
// resumePortfolioId is only set when this runs as the tail end of Dashboard's "Complete Fixed
// Income" resume path (an equity-only portfolio built under the old immediate-buy flow, before
// this deferred-Summary flow existed) — there's no equityDraft in that case since equity was
// already priced and saved server-side long ago, so Buy here only prices the bond leg and PATCHes
// it onto that existing portfolio instead of creating a new one.
export default function PortfolioSummary({ theme, setTheme, rpq, equityDraft, bondDraft, resumePortfolioId, onComplete, onBack, onStepClick, reachableSteps }) {
  const t = THEMES[theme];

  const [name, setName] = useState(equityDraft?.portfolioName || bondDraft?.portfolioName || "Untitled portfolio");
  // Tracks each leg's result once it's successfully priced+saved, so that if the combined buy
  // fails partway through (e.g. equity succeeds but the bond call or the final createPortfolio
  // call fails), retrying doesn't resubmit — and double-charge/double-save — a leg that already
  // went through.
  const [equityResult, setEquityResult] = useState(null);
  const [bondResult, setBondResult] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);

  async function handleBuy() {
    if (buyLoading) return;
    setBuyLoading(true);
    setBuyError(null);
    const portfolioName = name.trim() || "Untitled portfolio";
    try {
      let eqResult = equityResult;
      if (equityDraft && !eqResult) {
        const equityDollarAmount = equityDraft.dollarAmount * (1 - CASH_ALLOCATION_PCT / 100);
        eqResult = await submitBuy({ portfolioName, dollarAmount: equityDollarAmount, holdings: equityDraft.holdings });
        setEquityResult(eqResult);
      }

      let bResult = bondResult;
      if (bondDraft && !bResult) {
        const investAmount = bondDraft.poundAmount * (1 - CASH_ALLOCATION_PCT / 100);
        const wSum = bondDraft.holdings.reduce((a, b) => a + b.weight, 0) || 1;
        const holdings = bondDraft.holdings.map(b => {
          const w = b.weight / wSum;
          return {
            isin: b.isin, name: b.name, region: b.region, sector: b.sector,
            coupon: b.coupon, maturity: b.maturity, ytm: b.ytm, duration: b.duration,
            price: b.price, weight: w * 100, amount: w * investAmount,
          };
        });
        const totalAllocated = holdings.reduce((a, h) => a + h.amount, 0);
        bResult = await submitBondBuy({
          portfolioName, poundAmount: bondDraft.poundAmount, holdings, totalAllocated,
          cash: bondDraft.poundAmount - totalAllocated,
        });
        setBondResult(bResult);
      }

      if (resumePortfolioId) {
        await attachBondLeg(resumePortfolioId, bResult.id);
        onComplete(resumePortfolioId);
      } else {
        const res = await createPortfolio({
          name: portfolioName,
          rpqEquityPct: rpq.equityPct,
          rpqFiPct: rpq.fiPct,
          equityBuyListId: eqResult?.id,
          bondBuyListId: bResult?.id,
        });
        onComplete(res.id);
      }
    } catch (err) {
      setBuyError(err.message || "Failed to save this order.");
    } finally {
      setBuyLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <NavBar theme={theme} setTheme={setTheme} t={t} onStepClick={onStepClick} reachableSteps={reachableSteps} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 28px 100px" }}>

        {onBack && (
          <button onClick={onBack} disabled={buyLoading} style={{ fontSize: 12.5, color: t.muted, background: "none", border: "none", cursor: buyLoading ? "default" : "pointer", marginBottom: 20, padding: 0, opacity: buyLoading ? 0.5 : 1 }}>
            ← Back
          </button>
        )}

        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.accentText, marginBottom: 8 }}>
            PORTFOLIO SUMMARY
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: t.textStrong, margin: 0 }}>
            {rpq.equityPct}% Equity / {rpq.fiPct}% Fixed Income
          </h1>
          <div style={{ fontSize: 13.5, color: t.muted, marginTop: 10, maxWidth: 620, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
            Review both legs below, then buy everything in one combined order — nothing has been
            priced, sized, or saved yet.
          </div>
        </div>

        <SectionCard t={t} heading="Overall allocation">
          <SplitBarChart t={t} data={[
            { name: "Equity", value: rpq.equityPct, color: t.accent },
            { name: "Fixed Income", value: rpq.fiPct, color: t.teal },
          ]} />
        </SectionCard>

        {equityDraft && (
          <SectionCard t={t} heading="Equity portfolio" sub={equityDraft.portfolioName}>
            <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
              <StatTile t={t} label="Target value" value={`$${equityDraft.dollarAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`${equityDraft.holdings.length} holdings`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Region allocation</div>
                <AllocBarChart t={t} color={t.accent} data={allocToChartData(allocFromHoldings(equityDraft.holdings, "country"), 7)} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Sector allocation</div>
                <AllocBarChart t={t} color={t.teal} data={allocToChartData(allocFromHoldings(equityDraft.holdings, "sector"), 8)} />
              </div>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Top holdings</div>
            <DraftHoldingsTable t={t} holdings={equityDraft.holdings} idKey="ticker" nameKey="name" />
          </SectionCard>
        )}

        {bondDraft && (
          <SectionCard t={t} heading="Fixed Income portfolio" sub={bondDraft.portfolioName}>
            <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
              <StatTile t={t} label="Target value" value={`£${bondDraft.poundAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={`${bondDraft.holdings.length} holdings${bondDraft.skippedCount ? ` · ${bondDraft.skippedCount} skipped (no price)` : ""}`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Region allocation</div>
                <AllocBarChart t={t} color={t.accent} data={allocToChartData(allocFromHoldings(bondDraft.holdings, "region"), 7)} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Sector allocation</div>
                <AllocBarChart t={t} color={t.teal} data={allocToChartData(allocFromHoldings(bondDraft.holdings, "sector"), 8)} />
              </div>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textSecondary, marginBottom: 8 }}>Top holdings</div>
            <DraftHoldingsTable t={t} holdings={bondDraft.holdings} idKey="isin" nameKey="name" />
          </SectionCard>
        )}

        <SectionCard t={t} heading="Buy portfolio" sub="Prices and sizes both legs (whichever exist) at their target values, minus a 1.75% cash sleeve on each, and saves them together as one combined order.">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: t.muted }}>Portfolio name</span>
            <input type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Client A"
              disabled={buyLoading}
              style={{ width: 260, background: t.surface2, color: t.text, border: `1px solid ${t.borderStrong}`, borderRadius: 6, padding: "7px 9px", fontSize: 12.5 }} />
          </div>

          <button onClick={handleBuy} disabled={buyLoading} className="tw-btn-primary" style={{
            width: "100%", padding: "16px 32px", borderRadius: 99, border: `1px solid ${t.borderStrong}`,
            background: buyLoading ? t.borderStrong : `linear-gradient(135deg, ${t.positive}, #1a8f5c)`, color: "#FFFFFF",
            fontSize: 14, fontWeight: 800, cursor: buyLoading ? "default" : "pointer", fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {buyLoading ? "Saving…" : "🔒 Buy portfolio"}
          </button>
          {buyError && <div style={{ fontSize: 12, color: t.negative, marginTop: 12, lineHeight: 1.5, wordBreak: "break-word" }}>{buyError}</div>}
          {(equityResult || bondResult) && buyError && (
            <div style={{ fontSize: 11.5, color: t.muted, marginTop: 8, lineHeight: 1.5 }}>
              {equityDraft && equityResult ? "✓ Equity already saved. " : ""}
              {bondDraft && bondResult ? "✓ Fixed Income already saved. " : ""}
              Retrying will only redo what's left.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
