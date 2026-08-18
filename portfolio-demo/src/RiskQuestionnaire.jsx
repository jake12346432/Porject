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

export default function RiskQuestionnaire({ theme, setTheme, onComplete }) {
  const t = THEMES[theme];
  const [equityPct, setEquityPct] = useState(60);
  const fiPct = 100 - equityPct;

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
        <FlowBreadcrumb t={t} step="rpq" />
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
            This stands in for a full risk questionnaire — pick the Equity / Fixed Income split
            you're targeting, then build each portion in turn.
          </p>
        </div>

        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: "28px 30px" }}>
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
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: "20px 14px", borderRadius: 12, background: t.surface2, border: `1px solid ${t.borderMuted}` }}>
              <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, marginBottom: 6 }}>Fixed Income</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: t.teal, fontFamily: "'Inter', sans-serif" }}>{fiPct}%</div>
            </div>
          </div>

          <button
            onClick={() => onComplete({ equityPct, fiPct })}
            className="tw-btn-primary"
            style={{
              marginTop: 26, width: "100%", padding: "16px 26px", borderRadius: 99,
              border: `1px solid ${t.borderStrong}`,
              background: `linear-gradient(135deg, ${t.lavender}, ${t.accent})`, color: "#FFFFFF",
              fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            Continue to Equity →
          </button>
        </div>
      </div>
    </div>
  );
}
