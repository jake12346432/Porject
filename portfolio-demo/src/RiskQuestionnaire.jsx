import React, { useState } from "react";
import { THEMES, FlowBreadcrumb } from "./shared.jsx";

// Mock RPQ (risk profile questionnaire) — the real version would ask a series of scored questions
// about time horizon, loss tolerance, etc. and derive a target split from the total; this stands
// in for that with a direct pick, since the actual scoring model isn't built yet. What it produces
// (an Equity % / Fixed Income % target) is the same shape a real RPQ would hand off to the flow.
const PRESETS = [
  { label: "Conservative", equityPct: 20 },
  { label: "Balanced", equityPct: 50 },
  { label: "Growth", equityPct: 80 },
  { label: "All Equity", equityPct: 100 },
];

// Same figure and rationale as PortfolioBuilder.jsx/BondPortfolioBuilder.jsx's own copy — shown
// here just for context on what "target amount" the next two steps will actually invest.
const CASH_ALLOCATION_PCT = 1.75;

// initialEquityPct/initialCash let "Make new/additional portfolio" (from the Dashboard) pre-fill
// this screen with the split/amount from the last portfolio, rather than starting blank every time.
export default function RiskQuestionnaire({ theme, setTheme, onComplete, initialEquityPct = 60, initialCash = 10000, onStepClick, reachableSteps }) {
  const t = THEMES[theme];
  const [equityPct, setEquityPct] = useState(initialEquityPct);
  const [cash, setCash] = useState(initialCash);
  const fiPct = 100 - equityPct;
  const equityAmount = Math.round(cash * (equityPct / 100));
  const fiAmount = cash - equityAmount;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 16,
        padding: "14px 28px", background: t.navBg, backdropFilter: "blur(10px)", borderBottom: `1px solid ${t.borderMuted}`,
      }}>
        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
          <defs>
            <linearGradient id={`rpq-ring-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme === "dark" ? "#B79BE0" : "#8A3FFC"} />
              <stop offset="100%" stopColor={t.accent} />
            </linearGradient>
          </defs>
          <circle cx="15" cy="15" r="11.5" fill="none" stroke={`url(#rpq-ring-${theme})`} strokeWidth="3.2"
            strokeLinecap="round" strokeDasharray="60 12.2" transform="rotate(-98 15 15)" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 900, letterSpacing: "0.01em", color: t.textStrong }}>TITAN</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 500, color: t.muted }}>Wealth</span>
        </div>
        <div style={{ width: 1, height: 22, background: t.gridLine, margin: "0 4px" }} />
        <FlowBreadcrumb t={t} step="rpq" onStepClick={onStepClick} reachable={reachableSteps} />
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

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 28px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.accentText, marginBottom: 10 }}>
            RISK PROFILE QUESTIONNAIRE
          </div>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", color: t.textStrong, margin: "0 0 14px" }}>
            What's your target allocation?
          </h1>
          <p style={{ fontSize: 14.5, color: t.muted, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>
            This stands in for a full risk questionnaire — pick how much you're investing and the
            Equity / Fixed Income split you're targeting, and each portion's target amount is set
            automatically. Build each portion in turn.
          </p>
        </div>

        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "28px 30px" }}>
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>How much are you investing?</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, color: t.faint }}>$</span>
              <input
                type="number" min={0} value={cash}
                onChange={e => setCash(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{
                  flex: 1, background: t.surface2, color: t.text, border: `1px solid ${t.borderStrong}`,
                  borderRadius: 8, padding: "10px 12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 15,
                }}
              />
            </div>
            <div style={{ fontSize: 11.5, color: t.faint, marginTop: 6 }}>
              Split proportionally into an Equity target and a Fixed Income target below — no
              currency conversion is applied, so treat the Fixed Income figure as a target amount,
              not a guaranteed £ price (see its in-app disclosure).
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 30, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => setEquityPct(p.equityPct)} style={{
                padding: "8px 16px", borderRadius: 99,
                border: `1px solid ${equityPct === p.equityPct ? t.accent : t.borderMuted}`,
                background: equityPct === p.equityPct ? t.accent : "transparent",
                color: equityPct === p.equityPct ? "#FFFFFF" : t.textSecondary,
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}>
                {p.label} ({p.equityPct}/{100 - p.equityPct})
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, color: t.textSecondary }}>
            <span>100% Fixed Income</span>
            <span>100% Equity</span>
          </div>
          <input
            type="range" min={0} max={100} step={5} value={equityPct}
            onChange={e => setEquityPct(Number(e.target.value))}
            style={{ width: "100%", accentColor: t.accent }}
          />

          <div style={{ display: "flex", gap: 16, marginTop: 26 }}>
            <div style={{ flex: 1, textAlign: "center", padding: "20px 14px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.borderMuted}` }}>
              <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, marginBottom: 6 }}>Equity</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.accentText, fontFamily: "'Inter', sans-serif" }}>{equityPct}%</div>
              <div style={{ fontSize: 13, color: t.faint, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>${equityAmount.toLocaleString()}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: "20px 14px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.borderMuted}` }}>
              <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, marginBottom: 6 }}>Fixed Income</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.teal, fontFamily: "'Inter', sans-serif" }}>{fiPct}%</div>
              <div style={{ fontSize: 13, color: t.faint, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>${fiAmount.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: 11.5, color: t.faint, marginTop: 14 }}>
            A {CASH_ALLOCATION_PCT}% cash sleeve is held back from each portion automatically — this
            is fixed policy, not something the split above changes.
          </div>

          <button
            onClick={() => onComplete({ equityPct, fiPct, cash, equityAmount, fiAmount })}
            disabled={cash <= 0}
            className="tw-btn-primary"
            style={{
              marginTop: 18, width: "100%", padding: "16px 26px", borderRadius: 99,
              border: `1px solid ${t.borderStrong}`,
              background: cash <= 0 ? t.borderStrong : `linear-gradient(135deg, ${t.lavender}, ${t.accent})`, color: "#FFFFFF",
              fontSize: 14.5, fontWeight: 800, cursor: cash <= 0 ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.08em", textTransform: "uppercase", opacity: cash <= 0 ? 0.6 : 1,
            }}
          >
            Continue to Equity →
          </button>
        </div>
      </div>
    </div>
  );
}
