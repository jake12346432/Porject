import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Same palette used by PortfolioBuilder.jsx and BondPortfolioBuilder.jsx (each keeps its own copy
// rather than importing this — they predate the guided flow and touching either is riskier than
// the duplication is costly). New flow-level screens (RiskQuestionnaire, Dashboard, App's
// breadcrumb) import from here instead of adding a fourth copy.
export const THEMES = {
  dark: {
    bg: "#0A0A0D", surface: "#1D1329", surface2: "#281A38", surfaceAlt: "#362447",
    surfaceDeep: "#120C18", surfaceDeepAlt: "#1B1224",
    border: "#4A3568", borderStrong: "#6E4CA5", borderMuted: "#2E2138",
    text: "#F1EFF4", textStrong: "#FFFFFF", textSecondary: "#E4DFEC",
    muted: "#A79FBE", faint: "#8B84A0", placeholder: "#867F98",
    accent: "#8A3FFC", positive: "#34C77B", negative: "#FF6159",
    blueAccent: "#0F62FE", orange: "#FF832B", teal: "#58F9CA", lavender: "#B79BE0",
    accentText: "#AB7BFF", blueAccentText: "#3279FE",
    lockBorder: "#1B3B2C", staleBorder: "#3D2410", onAccent: "#0A0A0D",
    navBg: "rgba(10,10,13,.72)", gridLine: "rgba(183,155,224,.18)",
  },
  light: {
    bg: "#F5F2FA", surface: "#FFFFFF", surface2: "#F1EDF9", surfaceAlt: "#E8DEF5",
    surfaceDeep: "#F6F1FC", surfaceDeepAlt: "#EFE7FA",
    border: "#E0D5F0", borderStrong: "#C7B3E6", borderMuted: "#EAE1F6",
    text: "#241A3A", textStrong: "#150829", textSecondary: "#3A1A6C",
    muted: "#6B5F8C", faint: "#796C92", placeholder: "#7A68A6",
    accent: "#6F30CF", positive: "#19824C", negative: "#D63327",
    blueAccent: "#0B4FD1", orange: "#B8500A", teal: "#0A6E58", lavender: "#7C4DBA",
    accentText: "#6F30CF", blueAccentText: "#0B4FD1",
    lockBorder: "#BCE3CE", staleBorder: "#F0D3B8", onAccent: "#FFFFFF",
    navBg: "rgba(255,255,255,.72)", gridLine: "rgba(124,77,186,.14)",
  },
};

export function allocToChartData(allocObj, topN = 8) {
  const entries = Object.entries(allocObj).filter(([, v]) => v > 0.05).sort((a, b) => b[1] - a[1]);
  if (entries.length <= topN) return entries.map(([name, value]) => ({ name, value }));
  const head = entries.slice(0, topN);
  const tailSum = entries.slice(topN).reduce((a, [, v]) => a + v, 0);
  return [...head.map(([name, value]) => ({ name, value })), { name: "Other", value: tailSum }];
}

// Sums a `weight` field across holdings, grouped by an arbitrary key (e.g. "sector", "country",
// "region") — used to recompute allocation charts on the dashboard straight from saved holdings,
// without needing to separately persist each generation's full stats/allocation breakdown.
export function allocFromHoldings(holdings, groupKey) {
  const out = {};
  for (const h of holdings) {
    const key = h[groupKey] || "Unknown";
    out[key] = (out[key] || 0) + (h.weight || 0);
  }
  return out;
}

function AllocBarChart({ data, t = THEMES.dark, color }) {
  if (!data.length) return <div style={{ fontSize: 12.5, color: t.faint, padding: "40px 0", textAlign: "center" }}>No data</div>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} horizontal={false} />
        <XAxis type="number" domain={[0, "dataMax"]} tick={{ fill: t.faint, fontSize: 11 }} tickFormatter={v => Math.round(v) + "%"} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fill: t.textSecondary, fontSize: 11.5 }} />
        <Tooltip
          contentStyle={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: t.textStrong, fontWeight: 600 }} itemStyle={{ color: t.text }}
          formatter={(v) => v.toFixed(1) + "%"}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
export { AllocBarChart };

// A simple two-bar chart for a single split (e.g. RPQ target Equity % vs Fixed Income %, or
// target vs realized) — distinct from AllocBarChart's many-category ranked list.
export function SplitBarChart({ data, t = THEMES.dark }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(90, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: t.faint, fontSize: 11 }} tickFormatter={v => Math.round(v) + "%"} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fill: t.textSecondary, fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: t.textStrong, fontWeight: 600 }} itemStyle={{ color: t.text }}
          formatter={(v) => v.toFixed(1) + "%"}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Non-interactive step indicator replacing the old clickable Equity/Fixed Income tab switcher —
// the guided flow is linear now (RPQ -> Equity -> Fixed Income -> Dashboard), so free tab-switching
// no longer makes sense; this just shows where you are and what's done.
const STEPS = [
  ["rpq", "Risk profile"],
  ["equity", "Equity"],
  ["fi", "Fixed Income"],
  ["dashboard", "Dashboard"],
];
export function FlowBreadcrumb({ step, t = THEMES.dark }) {
  const currentIdx = STEPS.findIndex(([key]) => key === step);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {STEPS.map(([key, label], i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={key}>
            {i > 0 && <div style={{ width: 12, height: 1, background: t.borderMuted }} />}
            <div style={{
              padding: "5px 10px", borderRadius: 6,
              background: active ? t.accent : "transparent",
              border: `1px solid ${active ? t.accent : t.borderMuted}`,
              color: active ? "#FFFFFF" : done ? t.textSecondary : t.faint,
              fontSize: 11.5, fontWeight: active ? 700 : 500, fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap",
            }}>
              {done ? "✓ " : ""}{label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
