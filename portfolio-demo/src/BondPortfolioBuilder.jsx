import React, { useState, useEffect, useRef, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BONDS, REGIONS, SECTORS, YTM_MIN, YTM_MAX, DURATION_MIN, DURATION_MAX } from "./bondData.js";
import { submitBondBuy } from "./api.js";
import { FlowBreadcrumb } from "./shared.jsx";

// Fixed S&P/Fitch-style rating bands, independent of what's currently in bondData.js — the
// placeholder dataset has no rating field at all, so every bond falls into "NR" (not rated) until
// the official list (which will include real ratings) replaces it. Defined as a fixed scale rather
// than derived from the data (unlike REGIONS/SECTORS, imported above) precisely so the filter is
// ready and correct the moment real ratings land, with no code change needed.
const RATING_BANDS = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC & below", "NR"];
function ratingBand(b) {
  return b.rating || "NR";
}

/* ============================== THEME (same palette as the equity Portfolio Builder) ============================== */
const THEMES = {
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

// Best-effort guesses — Investopedia blocks this environment's crawler so these couldn't be
// verified by fetching the pages directly. Click through once deployed and flag any wrong ones.
const INVESTOPEDIA_LINKS = {
  "Yield to maturity": "https://www.investopedia.com/terms/y/yieldtomaturity.asp",
  "Duration": "https://www.investopedia.com/terms/d/duration.asp",
};
function ConceptLink({ term, children, t }) {
  const href = INVESTOPEDIA_LINKS[term];
  if (!href) return children;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline", textDecorationColor: t.borderStrong, textUnderlineOffset: 3 }}>
      {children}
    </a>
  );
}

/* ============================== TEMPLATES — purely hard filters ============================== */
// Names/blurbs dropped "Corporate" for now — with the Corporate-only lock off (see passesFilters),
// none of these restrict to corporate issuers, so a name promising that would be inaccurate.
const TEMPLATES = [
  {
    name: "Short-Duration Income",
    blurb: "Bonds under 4 years duration — income with lower sensitivity to rate moves.",
    config: { regions: [], sectors: [], ratings: [], ytmMin: YTM_MIN, ytmMax: YTM_MAX, durationMin: DURATION_MIN, durationMax: 4 },
  },
  {
    name: "UK & European",
    blurb: "Bonds from UK and European issuers, across the full yield and duration range.",
    config: { regions: ["UK", "Europe"], sectors: [], ratings: [], ytmMin: YTM_MIN, ytmMax: YTM_MAX, durationMin: DURATION_MIN, durationMax: DURATION_MAX },
  },
  {
    name: "Technology & Communications",
    blurb: "Bonds from technology and communications issuers only.",
    config: { regions: [], sectors: ["Technology", "Communications"], ratings: [], ytmMin: YTM_MIN, ytmMax: YTM_MAX, durationMin: DURATION_MIN, durationMax: DURATION_MAX },
  },
  {
    name: "Diversified Core",
    blurb: "A broad, balanced blend of bonds across every region and sector in the universe.",
    config: { regions: [], sectors: [], ratings: [], ytmMin: YTM_MIN, ytmMax: YTM_MAX, durationMin: DURATION_MIN, durationMax: DURATION_MAX },
  },
];

// Fixed cash sleeve, same figure and same rationale as the equity builder's CASH_ALLOCATION_PCT —
// a deliberate policy held back from every buy regardless of the RPQ's target split, not something
// derived from it. Duplicated here (rather than imported) matching this file's existing pattern of
// keeping its own copy of constants also defined in PortfolioBuilder.jsx.
const CASH_ALLOCATION_PCT = 1.75;

/* ============================== HELPERS ============================== */
// The hard-filter predicate, shared by the engine and the live "N bonds eligible" preview so they
// always agree on what would pass. The Corporate-only and GBP-only locks are OFF for now — the
// placeholder universe barely has any GBP corporate bonds, so keeping them on left almost nothing
// buildable. Government/government-related issuers and non-GBP currencies are back in the
// universe until the official GBP corporate bond list arrives; re-add both checks then.
function passesFilters(b, p) {
  if (!p.regionFilter.has(b.region)) return false;
  if (!p.sectorFilter.has(b.sector)) return false;
  if (!p.ratingFilter.has(ratingBand(b))) return false;
  if (b.ytm < p.ytmMin || b.ytm > p.ytmMax) return false;
  if (b.duration < p.durationMin || b.duration > p.durationMax) return false;
  return true;
}

const MAX_HOLDINGS = 30;

const DURATION_BUCKETS = [
  { label: "0-2y", test: d => d < 2 },
  { label: "2-5y", test: d => d >= 2 && d < 5 },
  { label: "5-10y", test: d => d >= 5 && d < 10 },
  { label: "10-20y", test: d => d >= 10 && d < 20 },
  { label: "20y+", test: d => d >= 20 },
];
const MATURITY_BUCKETS = [
  { label: "0-2y", test: y => y < 2 },
  { label: "2-5y", test: y => y >= 2 && y < 5 },
  { label: "5-10y", test: y => y >= 5 && y < 10 },
  { label: "10-20y", test: y => y >= 10 && y < 20 },
  { label: "20y+", test: y => y >= 20 },
];

function describeBondPortfolio(p, stats) {
  const singleRegion = p.regionFilter.size === 1 ? [...p.regionFilter][0] : null;
  const singleSector = p.sectorFilter.size === 1 ? [...p.sectorFilter][0] : null;
  const nameBits = [];
  if (singleRegion) nameBits.push(singleRegion);
  if (singleSector) nameBits.push(singleSector);
  nameBits.push("Bond Portfolio");
  const name = nameBits.join(" ");

  const blurb = `A ${stats.count}-bond, equally-weighted portfolio yielding ${stats.wYtm.toFixed(2)}% with ${stats.wDuration.toFixed(1)}-year average duration. Every bond that clears your region, sector, rating, YTM and duration filters is included — no preference weighting is applied.`;
  return { name, blurb };
}

// Purely hard-filter driven: every bond clearing region/sector/rating/YTM/duration in
// passesFilters is included, equally weighted — there's no scoring or preference dial pulling the
// selection or the weighting toward anything. If more bonds qualify than MAX_HOLDINGS, the
// highest-YTM names are kept — a transparent, factual tiebreaker, not a preference setting.
function computePortfolio(p) {
  const universe = BONDS.filter(b => passesFilters(b, p));
  if (universe.length === 0) {
    return { universeSize: 0, selected: [], stats: null, regionAlloc: {}, sectorAlloc: {}, durationAlloc: {}, maturityAlloc: {}, meta: null };
  }

  let selected = universe.length > MAX_HOLDINGS
    ? [...universe].sort((a, b) => b.ytm - a.ytm).slice(0, MAX_HOLDINGS)
    : universe;

  const eqWeight = 100 / selected.length;
  selected = selected.map(b => ({ ...b, weight: eqWeight }));
  selected.sort((a, b) => b.ytm - a.ytm);

  const wSum = selected.reduce((a, b) => a + b.weight, 0) || 1;
  const wAvg = (key) => selected.reduce((a, b) => a + b[key] * b.weight, 0) / wSum;

  const withCoupon = selected.filter(b => b.coupon != null);
  const couponWSum = withCoupon.reduce((a, b) => a + b.weight, 0);
  const wCoupon = couponWSum > 0 ? withCoupon.reduce((a, b) => a + b.coupon * b.weight, 0) / couponWSum : null;

  const NOW = new Date("2026-08-17T00:00:00Z");
  const yearsToMaturity = (b) => (new Date(b.maturity + "T00:00:00Z") - NOW) / (365.25 * 86400000);
  const wYearsToMaturity = wSum > 0
    ? selected.reduce((a, b) => a + yearsToMaturity(b) * b.weight, 0) / wSum
    : null;

  const stats = {
    count: selected.length,
    wYtm: wAvg("ytm"),
    wDuration: wAvg("duration"),
    wCoupon, wYearsToMaturity,
  };

  const regionAlloc = {}, sectorAlloc = {};
  selected.forEach(b => {
    regionAlloc[b.region] = (regionAlloc[b.region] || 0) + b.weight;
    sectorAlloc[b.sector] = (sectorAlloc[b.sector] || 0) + b.weight;
  });

  const durationAlloc = {};
  DURATION_BUCKETS.forEach(db => { durationAlloc[db.label] = 0; });
  selected.forEach(b => {
    const bucket = DURATION_BUCKETS.find(db => db.test(b.duration));
    if (bucket) durationAlloc[bucket.label] += b.weight;
  });

  const maturityAlloc = {};
  MATURITY_BUCKETS.forEach(mb => { maturityAlloc[mb.label] = 0; });
  selected.forEach(b => {
    const bucket = MATURITY_BUCKETS.find(mb => mb.test(yearsToMaturity(b)));
    if (bucket) maturityAlloc[bucket.label] += b.weight;
  });

  const meta = describeBondPortfolio(p, stats);
  return { universeSize: universe.length, selected, stats, regionAlloc, sectorAlloc, durationAlloc, maturityAlloc, meta };
}

function allocToChartData(allocObj, topN = 8) {
  const entries = Object.entries(allocObj).filter(([, v]) => v > 0.05).sort((a, b) => b[1] - a[1]);
  if (entries.length <= topN) return entries.map(([name, value]) => ({ name, value }));
  const head = entries.slice(0, topN);
  const tailSum = entries.slice(topN).reduce((a, [, v]) => a + v, 0);
  return [...head.map(([name, value]) => ({ name, value })), { name: "Other", value: tailSum }];
}

function allocToOrderedChartData(allocObj, order) {
  return order.filter(label => allocObj[label] > 0.05).map(label => ({ name: label, value: allocObj[label] }));
}

/* ============================== UI ATOMS ============================== */

// Animated fluid-noise hero backdrop — WebGL fragment shader, purely decorative. Falls back to
// rendering nothing if WebGL isn't available, freezes on one frame under prefers-reduced-motion.
function SilkCanvas() {
  const canvasRef = useRef(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: true });
    if (!gl) { setSupported(false); return; }

    const vsSrc = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fsSrc = "precision highp float;uniform vec2 R;uniform float T;uniform vec2 M;" +
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}" +
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);" +
      "return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}" +
      "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}" +
      "void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;uv+=M*.05;float t=T*.045;" +
      "vec2 q=vec2(fbm(uv*1.6+t),fbm(uv*1.6-t*.7));" +
      "vec2 w=vec2(fbm(uv*2.1+q*1.9+vec2(1.7,9.2)+t*1.3),fbm(uv*2.1+q*1.9+vec2(8.3,2.8)-t*.9));" +
      "float f=fbm(uv*2.+w*2.2);" +
      "vec3 c1=vec3(.043,.024,.094),c2=vec3(.192,.075,.369),c3=vec3(.486,.302,.729),c4=vec3(.91,.871,.961);" +
      "vec3 col=mix(c1,c2,smoothstep(.08,.9,f));" +
      "col=mix(col,c3,smoothstep(.42,.95,w.x)*.5);" +
      "col=mix(col,c4,smoothstep(.7,.99,f*w.y)*.32);" +
      "col*=1.-dot(uv,uv)*.5;" +
      "col+=(h(gl_FragCoord.xy+fract(T))-.5)*.04;" +
      "gl_FragColor=vec4(col,1.);}";

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(program, "R");
    const uT = gl.getUniformLocation(program, "T");
    const uM = gl.getUniformLocation(program, "M");

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    const onPointerMove = (e) => {
      tmx = e.clientX / window.innerWidth - 0.5;
      tmy = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    function resize() {
      const d = Math.min(window.devicePixelRatio || 1, 1.6);
      const w = cv.clientWidth * d, h = cv.clientHeight * d;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }

    let raf = null;
    const t0 = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame);
      resize();
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;
      gl.uniform2f(uR, cv.width, cv.height);
      gl.uniform1f(uT, reduceMotion ? 12 : (now - t0) / 1000);
      gl.uniform2f(uM, mx, -my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (reduceMotion) { raf = null; }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  if (!supported) return null;
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true" />;
}

function SectionLabel({ children, sub, t }) {
  return (
    <div style={{ marginBottom: 10, marginTop: 22 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.12em", color: t.accentText, textTransform: "uppercase" }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: t.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Chip({ active, onClick, children, t }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 11px", borderRadius: 999, border: `1px solid ${active ? t.accent : t.borderStrong}`,
      background: active ? "rgba(138,63,252,0.14)" : "transparent", color: active ? t.orange : t.muted,
      fontSize: 12, fontFamily: "'Inter', sans-serif", cursor: "pointer", marginRight: 6, marginBottom: 6,
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.textSecondary; } }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = t.borderStrong; e.currentTarget.style.color = t.muted; } }}
    >{children}</button>
  );
}

function Slider({ value, min, max, step = 1, onChange, unit = "", decimals = 0, t }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = () => {
    let v = parseFloat(text);
    if (isNaN(v)) { setText(String(value)); return; }
    v = Math.max(min, Math.min(max, v));
    onChange(v);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: t.accent, height: 4 }} />
      <input type="text" inputMode="decimal" value={text}
        onChange={e => setText(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { commit(); e.target.blur(); } }}
        style={{
          width: decimals ? 54 : 42, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
          color: t.text, background: t.surface2, border: `1px solid ${t.borderStrong}`, borderRadius: 4, padding: "3px 5px",
        }} />
      {unit && <span style={{ fontSize: 11, color: t.faint, width: 16 }}>{unit}</span>}
    </div>
  );
}

function ResetButton({ onClick, t, children = "Reset" }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: t.muted, background: "none",
      border: `1px solid ${t.borderStrong}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.textSecondary; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = t.borderStrong; e.currentTarget.style.color = t.muted; }}
    >{children}</button>
  );
}

function FilterCard({ heading, description, children, t, wide }) {
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
      padding: "22px 24px", gridColumn: wide ? "1 / -1" : "auto",
    }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", color: t.textStrong, marginBottom: 6 }}>{heading}</div>
      {description && <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.55, marginBottom: 16, maxWidth: 640 }}>{description}</div>}
      {children}
    </div>
  );
}

function StatTile({ label, value, sub, t }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, color: t.textStrong, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: t.faint, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Tooltip's `contentStyle` alone only styles Recharts' outer wrapper — the label/value spans
// inside have their own hardcoded near-black default color that stays illegible on a dark
// surface unless `labelStyle`/`itemStyle` are set explicitly too.
function AllocBarChart({ data, t, color }) {
  if (!data.length) return <div style={{ fontSize: 12.5, color: t.faint, padding: "40px 0", textAlign: "center" }}>No data</div>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} horizontal={false} />
        <XAxis type="number" domain={[0, "dataMax"]} tick={{ fill: t.faint, fontSize: 11 }} tickFormatter={v => Math.round(v) + "%"} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fill: t.textSecondary, fontSize: 11.5 }} />
        <Tooltip
          formatter={(v) => v.toFixed(1) + "%"}
          contentStyle={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: t.textStrong, fontWeight: 600 }} itemStyle={{ color: t.text }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => <Cell key={i} fill={color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ============================== MAIN ============================== */
// `rpq` and `onBuyComplete` are set by the guided flow (RPQ -> Equity -> Fixed Income ->
// Dashboard), which is now the only way this component is rendered — see PortfolioBuilder.jsx
// for the same pattern on the equity side.
export default function BondPortfolioBuilder({ theme, setTheme, rpq, onBuyComplete, onBack }) {
  const t = THEMES[theme];

  const [regionFilter, setRegionFilter] = useState(new Set(REGIONS));
  const [sectorFilter, setSectorFilter] = useState(new Set(SECTORS));
  const [ratingFilter, setRatingFilter] = useState(new Set(RATING_BANDS));
  const [ytmMin, setYtmMin] = useState(YTM_MIN);
  const [ytmMax, setYtmMax] = useState(YTM_MAX);
  const [durationMin, setDurationMin] = useState(DURATION_MIN);
  const [durationMax, setDurationMax] = useState(DURATION_MAX);

  const [activeTemplate, setActiveTemplate] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const resultsRef = useRef(null);

  const [poundAmount, setPoundAmount] = useState(rpq?.fiAmount ?? 10000);
  const [buyName, setBuyName] = useState("");
  const [buyNameTouched, setBuyNameTouched] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [lockedPortfolio, setLockedPortfolio] = useState(null);
  useEffect(() => {
    if (!buyNameTouched && portfolio?.meta?.name) setBuyName(portfolio.meta.name);
  }, [portfolio, buyNameTouched]);

  const markDirty = () => setActiveTemplate(null);

  const filterParams = useMemo(() => ({
    regionFilter, sectorFilter, ratingFilter, ytmMin, ytmMax, durationMin, durationMax,
  }), [regionFilter, sectorFilter, ratingFilter, ytmMin, ytmMax, durationMin, durationMax]);

  const liveEligible = useMemo(() => BONDS.filter(b => passesFilters(b, filterParams)).length, [filterParams]);

  useEffect(() => {
    if (hasGenerated) setIsStale(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams]);

  function applyTemplate(tpl) {
    const c = tpl.config;
    setActiveTemplate(tpl.name);
    setRegionFilter(c.regions.length ? new Set(c.regions) : new Set(REGIONS));
    setSectorFilter(c.sectors.length ? new Set(c.sectors) : new Set(SECTORS));
    setRatingFilter(c.ratings?.length ? new Set(c.ratings) : new Set(RATING_BANDS));
    setYtmMin(c.ytmMin);
    setYtmMax(c.ytmMax);
    setDurationMin(c.durationMin);
    setDurationMax(c.durationMax);
  }

  function resetAll() {
    setActiveTemplate(null);
    setRegionFilter(new Set(REGIONS));
    setSectorFilter(new Set(SECTORS));
    setRatingFilter(new Set(RATING_BANDS));
    setYtmMin(YTM_MIN);
    setYtmMax(YTM_MAX);
    setDurationMin(DURATION_MIN);
    setDurationMax(DURATION_MAX);
  }

  function toggleRegion(r) {
    markDirty();
    setRegionFilter(prev => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next.size ? next : prev;
    });
  }
  function toggleSector(s) {
    markDirty();
    setSectorFilter(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next.size ? next : prev;
    });
  }
  function toggleRating(r) {
    markDirty();
    setRatingFilter(prev => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next.size ? next : prev;
    });
  }

  function generate() {
    const result = computePortfolio(filterParams);
    setPortfolio(result);
    setHasGenerated(true);
    setIsStale(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  // Bonds have no live quote feed to hit — bondData.js already bakes in a price for each
  // instrument, so pricing happens right here client-side (unlike equity, which needs a
  // server-side live-quote fetch first) and the server call just persists the finished order.
  async function buyBondPortfolio() {
    if (!portfolio?.selected?.length || buyLoading) return;
    setBuyLoading(true); setBuyError(null);
    try {
      const priced = portfolio.selected.filter(b => b.price != null);
      if (priced.length === 0) throw new Error("None of the selected bonds have a price available to size an order against.");
      // Only invest (100 - CASH_ALLOCATION_PCT)% of the target — the rest is a deliberate cash
      // sleeve, same policy as the equity builder. Weights among holdings are unchanged (still sum
      // to 100% of the bond portion); the cash held back is against the FULL poundAmount, not the
      // reduced invested amount.
      const investAmount = poundAmount * (1 - CASH_ALLOCATION_PCT / 100);
      const wSum = priced.reduce((a, b) => a + b.weight, 0) || 1;
      const holdings = priced.map(b => {
        const w = b.weight / wSum;
        return {
          isin: b.isin, name: b.name, region: b.region, sector: b.sector,
          coupon: b.coupon, maturity: b.maturity, ytm: b.ytm, duration: b.duration,
          price: b.price, weight: w * 100, amount: w * investAmount,
        };
      });
      const totalAllocated = holdings.reduce((a, h) => a + h.amount, 0);
      const result = await submitBondBuy({
        portfolioName: buyName.trim() || "Untitled bond portfolio",
        poundAmount,
        holdings,
        totalAllocated,
        cash: poundAmount - totalAllocated,
      });
      setLockedPortfolio({
        timestamp: new Date().toLocaleString(),
        poundAmount,
        holdings: result.holdings,
        totalAllocated: result.totalAllocated,
        cash: result.cash,
        skippedCount: portfolio.selected.length - priced.length,
        id: result.id,
        tradeDate: result.tradeDate,
      });
    } catch (err) {
      setBuyError(err.message || "Failed to save this order.");
    } finally {
      setBuyLoading(false);
    }
  }

  const stats = portfolio?.stats;

  const regionChart = portfolio ? allocToChartData(portfolio.regionAlloc, 7) : [];
  const sectorChart = portfolio ? allocToChartData(portfolio.sectorAlloc, 8) : [];
  const durationChart = portfolio ? allocToOrderedChartData(portfolio.durationAlloc, DURATION_BUCKETS.map(db => db.label)) : [];
  const maturityChart = portfolio ? allocToOrderedChartData(portfolio.maturityAlloc, MATURITY_BUCKETS.map(mb => mb.label)) : [];

  const GenerateButton = ({ big }) => (
    <button onClick={generate} style={{
      padding: big ? "14px 32px" : "9px 20px", borderRadius: 99, border: "none",
      background: t.accent, color: "#FFFFFF", fontSize: big ? 15 : 13, fontWeight: 700,
      cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: `0 8px 24px -8px ${t.accent}88`,
      transition: "filter 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
    onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
    >{hasGenerated ? "Regenerate portfolio" : "Generate my portfolio"}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, transition: "background 0.2s, color 0.2s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        input[type="range"] { -webkit-appearance: none; appearance: none; background: transparent; }
        input[type="range"]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: ${t.borderStrong}; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; margin-top: -6px; width: 16px; height: 16px; border-radius: 50%; background: ${t.accent}; border: 2px solid ${t.onAccent}; cursor: pointer; }
        input[type="range"]::-moz-range-track { height: 4px; border-radius: 2px; background: ${t.borderStrong}; }
        input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: ${t.accent}; border: 2px solid ${t.onAccent}; cursor: pointer; }
      `}</style>

      {/* ============ UTILITY STRIP ============ */}
      <div style={{ background: "#1C1720", color: "#B8AECC", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", padding: "6px 12px" }}>
        Demo · Placeholder Bond Data — an official GBP corporate bond list will replace this shortly
      </div>

      {/* ============ TOP NAV ============ */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 14,
        padding: "14px 20px", background: t.navBg, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${t.gridLine}`,
      }}>
        <svg width="30" height="30" viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
          <defs>
            <linearGradient id={`tw-ring-bond-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme === "dark" ? "#B79BE0" : "#8A3FFC"} />
              <stop offset="100%" stopColor={t.accent} />
            </linearGradient>
          </defs>
          <circle cx="15" cy="15" r="11.5" fill="none" stroke={`url(#tw-ring-bond-${theme})`} strokeWidth="3.2"
            strokeLinecap="round" strokeDasharray="60 12.2" transform="rotate(-98 15 15)" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 900, letterSpacing: "0.01em", color: t.textStrong }}>TITAN</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 500, color: t.muted }}>Wealth</span>
        </div>
        <div style={{ width: 1, height: 22, background: t.gridLine, margin: "0 4px" }} />
        <FlowBreadcrumb t={t} step="fi" />

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle light and dark mode"
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 99,
              border: "none", background: t.accent, color: "#FFFFFF",
              fontSize: 12.5, fontWeight: 700, cursor: "pointer", transition: "filter 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
          >
            {theme === "dark" ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
                Light mode
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFFFFF" stroke="none"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" /></svg>
                Dark mode
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 28px 80px" }}>

        {onBack && (
          <button onClick={onBack} style={{ fontSize: 12.5, color: t.muted, background: "none", border: "none", cursor: "pointer", marginBottom: 14, padding: 0, display: "block" }}>
            {rpq && rpq.equityPct > 0 ? "← Back to Equity" : "← Back to Risk Profile"}
          </button>
        )}

        {rpq && (
          <div style={{
            textAlign: "center", marginBottom: 20, padding: "10px 16px", borderRadius: 10,
            background: t.surface2, border: `1px solid ${t.borderMuted}`, fontSize: 13, color: t.textSecondary,
          }}>
            Your target allocation: {rpq.equityPct}% Equity / <strong style={{ color: t.textStrong }}>{rpq.fiPct}% Fixed Income</strong>
            {rpq.equityPct > 0 ? " — the Equity portion is already saved. Build this portion now." : " — 0% Equity means there's no Equity portion to build. Build this portion now."}
          </div>
        )}

        {/* ============ HERO ============ */}
        <div style={{
          position: "relative", textAlign: "center", marginBottom: 40, padding: "60px 20px", overflow: "hidden",
          borderRadius: 24, border: `1px solid ${theme === "dark" ? t.borderStrong : t.border}`,
          background: theme === "dark" ? `linear-gradient(135deg, ${t.surfaceDeep} 0%, ${t.surfaceAlt} 100%)` : t.surface,
        }}>
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", borderRadius: 24 }}>
            {theme === "dark" && <div style={{ position: "absolute", inset: 0, opacity: 0.25 }}><SilkCanvas /></div>}
            <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 1160 340" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id={`tw-sweep-bond-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={t.lavender} />
                  <stop offset="100%" stopColor={t.accent} />
                </linearGradient>
              </defs>
              {[-24, 0, 24].map((dy, i) => (
                <path key={i}
                  d={`M 140 ${10 + dy} C 320 ${10 + dy}, 380 ${300 + dy}, 560 ${300 + dy} C 740 ${300 + dy}, 800 ${10 + dy}, 1020 ${10 + dy}`}
                  fill="none" stroke={i === 1 ? t.accent : `url(#tw-sweep-bond-${theme})`} strokeWidth="9" strokeLinecap="round"
                  opacity={theme === "dark" ? 0.4 : 0.5}
                />
              ))}
            </svg>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.accentText, marginBottom: 10 }}>
              Fixed Income Portfolio Builder
            </div>
            <div style={{
              display: "inline-block", fontFamily: "'Inter', sans-serif", fontSize: 46, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 14,
              color: t.textStrong, padding: "6px 18px", borderRadius: 16,
              background: theme === "dark" ? "transparent" : "rgba(255,255,255,0.82)",
              backdropFilter: theme === "dark" ? "none" : "blur(2px)",
            }}>
              Build your bond portfolio
            </div>
            <div style={{
              fontSize: 15, color: t.textSecondary, maxWidth: 640, margin: "0 auto", lineHeight: 1.6,
              padding: theme === "dark" ? 0 : "4px 14px", borderRadius: 12,
              background: theme === "dark" ? "transparent" : "rgba(255,255,255,0.82)",
            }}>
              Set your filters and we'll screen every bond that clears them, equally weighted — no preference weighting. Government and multi-currency issuers are temporarily included (see the note below) until the official GBP corporate bond list arrives.
            </div>
            <div style={{ marginTop: 18, color: t.orange, fontSize: 18 }} aria-hidden="true">↓</div>
          </div>
        </div>

        {/* ============ TEMPLATES ============ */}
        <SectionLabel t={t} sub="Prefill every filter below with a ready-made strategy — tweak anything afterward.">Quick start — or build your own below</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 12 }}>
          {TEMPLATES.map(tpl => {
            const active = activeTemplate === tpl.name;
            return (
              <button key={tpl.name} onClick={() => applyTemplate(tpl)} style={{
                textAlign: "left", padding: "16px 18px", borderRadius: 14, cursor: "pointer",
                background: active ? "rgba(138,63,252,0.12)" : t.surface,
                border: `1.5px solid ${active ? t.accent : t.border}`, transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: t.textStrong, marginBottom: 6 }}>{tpl.name}</div>
                <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.5 }}>{tpl.blurb}</div>
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: "right", marginBottom: 30 }}>
          <ResetButton t={t} onClick={resetAll}>Reset all filters</ResetButton>
        </div>

        <div style={{ fontSize: 12, color: t.faint, textAlign: "center", marginBottom: 20, maxWidth: 700, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
          Corporate-only and GBP-only are temporarily switched off — the placeholder data barely
          has any GBP corporate bonds, so government issuers and other currencies are included for
          now to keep this usable. Both locks come back once the official GBP corporate bond list
          arrives. The credit rating filter is live, but the current placeholder data has no rating
          column — every bond shows as "NR" (not rated) until the official list with real ratings
          replaces it, at which point this filter works automatically.
        </div>

        {/* ============ FILTERS ============ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 10 }}>
          <FilterCard t={t} heading="Region" description="Which parts of the world can appear in your portfolio.">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <ResetButton t={t} onClick={() => { markDirty(); setRegionFilter(new Set(REGIONS)); }}>Select all</ResetButton>
            </div>
            <div>{REGIONS.map(r => (
              <Chip key={r} t={t} active={regionFilter.has(r)} onClick={() => toggleRegion(r)}>{r}</Chip>
            ))}</div>
          </FilterCard>

          <FilterCard t={t} heading="Sector" description="Which corporate bond categories — banking, technology, energy, etc. — can appear.">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <ResetButton t={t} onClick={() => { markDirty(); setSectorFilter(new Set(SECTORS)); }}>Select all</ResetButton>
            </div>
            <div style={{ maxHeight: 130, overflowY: "auto", paddingRight: 4 }}>
              {SECTORS.map(s => (
                <Chip key={s} t={t} active={sectorFilter.has(s)} onClick={() => toggleSector(s)}>{s}</Chip>
              ))}
            </div>
          </FilterCard>

          <FilterCard t={t} heading="Credit rating" wide description="Which issuer credit rating bands can appear in your portfolio — all placeholder bonds are currently unrated (NR) until the official list arrives.">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <ResetButton t={t} onClick={() => { markDirty(); setRatingFilter(new Set(RATING_BANDS)); }}>Select all</ResetButton>
            </div>
            <div>{RATING_BANDS.map(r => (
              <Chip key={r} t={t} active={ratingFilter.has(r)} onClick={() => toggleRating(r)}>{r}</Chip>
            ))}</div>
          </FilterCard>

          <FilterCard t={t} heading={<ConceptLink t={t} term="Yield to maturity">Yield to maturity (YTM)</ConceptLink>} wide
            description="The annualized return you'd earn holding a bond to maturity at its current price — the main measure of a bond's income.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={{ fontSize: 12.5, color: t.textSecondary, marginBottom: 6 }}>Minimum YTM</div>
                <Slider t={t} value={ytmMin} min={YTM_MIN} max={YTM_MAX} step={0.1} decimals={1} unit="%"
                  onChange={v => { markDirty(); setYtmMin(Math.min(v, ytmMax)); }} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, color: t.textSecondary, marginBottom: 6 }}>Maximum YTM</div>
                <Slider t={t} value={ytmMax} min={YTM_MIN} max={YTM_MAX} step={0.1} decimals={1} unit="%"
                  onChange={v => { markDirty(); setYtmMax(Math.max(v, ytmMin)); }} />
              </div>
            </div>
          </FilterCard>

          <FilterCard t={t} heading={<ConceptLink t={t} term="Duration">Duration</ConceptLink>} wide
            description="How sensitive a bond's price is to interest-rate changes, in years — roughly, how much its price would move for a 1-point rate change. Shorter duration means less price swing.">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div style={{ fontSize: 12.5, color: t.textSecondary, marginBottom: 6 }}>Minimum duration</div>
                <Slider t={t} value={durationMin} min={DURATION_MIN} max={DURATION_MAX} step={0.5} decimals={1} unit="y"
                  onChange={v => { markDirty(); setDurationMin(Math.min(v, durationMax)); }} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, color: t.textSecondary, marginBottom: 6 }}>Maximum duration</div>
                <Slider t={t} value={durationMax} min={DURATION_MIN} max={DURATION_MAX} step={0.5} decimals={1} unit="y"
                  onChange={v => { markDirty(); setDurationMax(Math.max(v, durationMin)); }} />
              </div>
            </div>
          </FilterCard>
        </div>

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, color: t.faint }}>
            {liveEligible} bonds currently eligible
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "36px 0 44px" }}>
          <GenerateButton big />
        </div>

        {isStale && (
          <div style={{ background: "rgba(255,131,43,0.1)", border: `1px solid ${t.staleBorder}`, color: t.orange, fontSize: 12.5, padding: "9px 14px", borderRadius: 8, marginBottom: 20, textAlign: "center" }}>
            Filters changed since the last generation — click <b>Regenerate portfolio</b> above to refresh the results below.
          </div>
        )}

        {!portfolio && (
          <div style={{ textAlign: "center", color: t.faint, padding: "50px 20px", border: `1px dashed ${t.borderMuted}`, borderRadius: 12 }}>
            <div style={{ fontSize: 15, color: t.muted, marginBottom: 6 }}>Nothing generated yet</div>
            <div style={{ fontSize: 13 }}>Pick a template or set your filters above, then click <b style={{ color: t.accentText }}>Generate my portfolio</b>.</div>
          </div>
        )}

        {portfolio && !stats && (
          <div style={{ textAlign: "center", color: t.negative, padding: "50px 20px", border: `1px solid ${t.negative}`, borderRadius: 12 }}>
            No bonds match this combination of filters — widen your region, sector, rating, YTM or duration range and try again.
          </div>
        )}

        {portfolio && stats && (
          <div ref={resultsRef} style={{ scrollMarginTop: 76 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <svg width="72" height="10" viewBox="0 0 72 10" style={{ marginBottom: 10 }} aria-hidden="true">
                <line x1="2" y1="5" x2="26" y2="5" stroke={t.accent} strokeWidth="3" strokeLinecap="round" />
                <line x1="32" y1="5" x2="50" y2="5" stroke={t.teal} strokeWidth="3" strokeLinecap="round" />
                <line x1="56" y1="5" x2="70" y2="5" stroke={t.orange} strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: t.textStrong, marginBottom: 8 }}>
                {portfolio.meta.name}
              </div>
              <div style={{ fontSize: 14, color: t.muted, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>{portfolio.meta.blurb}</div>
            </div>

            {/* ============ STATS ============ */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 30 }}>
              <StatTile t={t} label="Bonds held" value={stats.count} />
              <StatTile t={t} label="Avg. YTM" value={stats.wYtm.toFixed(2) + "%"} />
              <StatTile t={t} label="Avg. duration" value={stats.wDuration.toFixed(1) + " y"} />
              <StatTile t={t} label="Avg. coupon" value={stats.wCoupon != null ? stats.wCoupon.toFixed(2) + "%" : "—"} />
              <StatTile t={t} label="Avg. time to maturity" value={stats.wYearsToMaturity != null ? stats.wYearsToMaturity.toFixed(1) + " y" : "—"} />
            </div>

            {/* ============ CHARTS ============ */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 30 }}>
              <FilterCard t={t} heading="Region allocation">
                <AllocBarChart t={t} data={regionChart} color={t.accent} />
              </FilterCard>
              <FilterCard t={t} heading="Sector allocation">
                <AllocBarChart t={t} data={sectorChart} color={t.teal} />
              </FilterCard>
              <FilterCard t={t} heading="Duration ladder">
                <AllocBarChart t={t} data={durationChart} color={t.blueAccent} />
              </FilterCard>
              <FilterCard t={t} heading="Maturity ladder">
                <AllocBarChart t={t} data={maturityChart} color={t.positive} />
              </FilterCard>
            </div>

            {/* ============ HOLDINGS TABLE ============ */}
            <SectionLabel t={t} sub={`Top ${Math.min(15, portfolio.selected.length)} by yield${portfolio.selected.length > 15 ? ` — plus ${portfolio.selected.length - 15} more not shown` : ""}. All holdings are equally weighted.`}>Holdings</SectionLabel>
            <div style={{ overflowX: "auto", border: `1px solid ${t.border}`, borderRadius: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 860 }}>
                <thead>
                  <tr style={{ background: t.surface2 }}>
                    {["Instrument", "Region", "Sector", "Coupon", "Maturity", "YTM", "Duration", "Weight", "ISIN"].map(h => (
                      <th key={h} style={{ textAlign: h === "Instrument" ? "left" : "right", padding: "10px 12px", color: t.muted, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${t.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolio.selected.slice(0, 15).map(b => (
                    <tr key={b.id} style={{ borderBottom: `1px solid ${t.borderMuted}` }}>
                      <td style={{ padding: "9px 12px", color: t.textStrong, fontWeight: 500, maxWidth: 280 }}>{b.name}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: t.muted, whiteSpace: "nowrap" }}>{b.region}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: t.muted, whiteSpace: "nowrap" }}>{b.sector}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: t.textSecondary, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{b.coupon != null ? b.coupon.toFixed(2) + "%" : "—"}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: t.textSecondary, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{b.maturity || "—"}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: t.positive, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{b.ytm.toFixed(2)}%</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: t.textSecondary, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{b.duration.toFixed(1)}y</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: t.accentText, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, whiteSpace: "nowrap" }}>{b.weight.toFixed(2)}%</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: t.faint, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, whiteSpace: "nowrap" }}>{b.isin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ============ ORDER TICKET ============ */}
            <div style={{ marginTop: 26, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.6, marginBottom: 12 }}>
                Sizes an order across <b style={{ color: t.textSecondary }}>all {portfolio.selected.length} current holdings</b> at
                their bonds' priced values and adds it to <b style={{ color: t.textSecondary }}>today's combined order book</b> —
                no real trade is placed. Not financial advice.
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: t.muted }}>Portfolio name</span>
                <input type="text" value={buyName}
                  onChange={e => { setBuyName(e.target.value); setBuyNameTouched(true); }}
                  placeholder="e.g. Client A - Short Duration"
                  style={{ width: 220, background: t.surface2, color: t.text, border: `1px solid ${t.borderStrong}`, borderRadius: 6, padding: "7px 9px", fontSize: 12.5 }} />
                <span style={{ fontSize: 12, color: t.muted }}>Portfolio value</span>
                <span style={{ fontSize: 12, color: t.faint }}>£</span>
                <input type="number" value={poundAmount} min={0}
                  onChange={e => setPoundAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: 120, background: t.surface2, color: t.text, border: `1px solid ${t.borderStrong}`, borderRadius: 6, padding: "7px 9px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }} />
                <button className="tw-btn-primary" onClick={buyBondPortfolio} disabled={buyLoading || portfolio.selected.length === 0} style={{
                  padding: "11px 20px", borderRadius: 99, border: "none", cursor: buyLoading ? "default" : "pointer",
                  background: buyLoading ? t.borderStrong : `linear-gradient(135deg, ${t.positive}, #1a8f5c)`, color: "#FFFFFF",
                  fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase",
                }}>{buyLoading ? "Saving…" : "🔒 Buy portfolio"}</button>
              </div>
              {buyError && <div style={{ fontSize: 11.5, color: t.negative, marginTop: 10, lineHeight: 1.5, wordBreak: "break-word" }}>{buyError}</div>}
            </div>

            {lockedPortfolio && (
              <div style={{ marginTop: 16, background: t.surface, border: `1px solid ${t.lockBorder}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, color: t.positive, fontWeight: 600 }}>✓ Saved to today's order book{lockedPortfolio.id ? ` (#${lockedPortfolio.id})` : ""}</div>
                    <div style={{ fontSize: 11, color: t.faint, marginTop: 2 }}>
                      Locked {lockedPortfolio.timestamp} · £{lockedPortfolio.poundAmount.toLocaleString()} target · {lockedPortfolio.holdings.length} names
                      {lockedPortfolio.tradeDate ? ` · trade date ${lockedPortfolio.tradeDate}` : ""}
                      {lockedPortfolio.skippedCount ? ` · ${lockedPortfolio.skippedCount} holding(s) skipped (no price)` : ""}
                    </div>
                  </div>
                  <button onClick={() => setLockedPortfolio(null)} style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", padding: "7px 14px", borderRadius: 99, border: `1px solid ${t.borderStrong}`, background: "transparent", color: t.muted, cursor: "pointer" }}>Clear</button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead><tr style={{ background: t.surface2 }}>
                    {["Instrument", "Weight", "Price", "Amount"].map((h, i) => (
                      <th key={h} style={{ padding: "7px 10px", fontWeight: 500, color: t.muted, fontSize: 10.5, textTransform: "uppercase", textAlign: i >= 1 ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {lockedPortfolio.holdings.map(h => (
                      <tr key={h.isin} style={{ borderTop: `1px solid ${t.surfaceAlt}` }}>
                        <td style={{ padding: "6px 10px", color: t.textSecondary, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{h.weight.toFixed(2)}%</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{h.price != null ? h.price.toFixed(2) : "—"}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>£{h.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 10.5, color: t.faint, marginTop: 10 }}>
                  Allocated £{lockedPortfolio.totalAllocated.toFixed(2)} of £{lockedPortfolio.poundAmount.toFixed(2)} (£{lockedPortfolio.cash.toFixed(2)} unallocated).
                  This is an order ticket for your own records, not an executed trade.
                </div>
                {onBuyComplete && (
                  <button
                    onClick={() => onBuyComplete({
                      buyListId: lockedPortfolio.id,
                      portfolioName: buyName.trim() || "Untitled bond portfolio",
                      poundAmount: lockedPortfolio.poundAmount,
                      totalAllocated: lockedPortfolio.totalAllocated,
                      cash: lockedPortfolio.cash,
                      holdings: lockedPortfolio.holdings,
                    })}
                    className="tw-btn-primary"
                    style={{
                      marginTop: 16, width: "100%", padding: "14px 26px", borderRadius: 99,
                      border: `1px solid ${t.borderStrong}`,
                      background: `linear-gradient(135deg, ${t.lavender}, ${t.accent})`, color: "#FFFFFF",
                      fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}
                  >
                    Continue to Dashboard →
                  </button>
                )}
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: 40, fontSize: 11.5, color: t.faint, lineHeight: 1.6, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
              This is placeholder bond data pending an official GBP corporate bond list — government
              issuers and non-GBP currencies are temporarily included to keep the universe usable in
              the meantime, so the £ figures below reflect your target allocation, not a guaranteed
              single-currency price. Duration is calculated from each bond's coupon, maturity and
              YTM using standard bond math, not published directly. Treat all prices, YTMs and
              durations as a stale snapshot for prototyping, not tradeable quotes — this is not
              investment advice, and no rating data is available or shown.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
