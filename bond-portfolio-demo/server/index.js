import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { promptToBondPortfolioConfig } from "./ai.js";
import { siteAuth } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");

const app = express();
app.use(cors());
app.use(express.json());
app.use(siteAuth);

const PORT = process.env.PORT || 8788;

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Simple per-IP sliding-window rate limit on the AI endpoint — it's a real,
// billed Claude API call behind a publicly reachable demo with no per-user
// accounts, so an unbounded endpoint is an unbounded cost surface.
const AI_RATE_LIMIT = 8; // requests per IP per window
const AI_WINDOW_MS = 10 * 60 * 1000;
const aiHits = new Map(); // ip -> timestamps[]

function isAiRateLimited(ip) {
  const now = Date.now();
  const hits = (aiHits.get(ip) || []).filter(t => now - t < AI_WINDOW_MS);
  hits.push(now);
  aiHits.set(ip, hits);
  return hits.length > AI_RATE_LIMIT;
}

// Turns a plain-English bond portfolio request into the filter-panel JSON
// config, via a server-side Claude API call — keeps the API key off the
// browser entirely.
app.post("/api/ai/portfolio-config", async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Body must include a 'prompt' string." });
  }
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  if (isAiRateLimited(ip)) {
    return res.status(429).json({ error: "Too many description requests from this connection — wait a few minutes and try again." });
  }
  try {
    const config = await promptToBondPortfolioConfig(prompt);
    res.json({ config });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

// In production this server also serves the built frontend (`npm run build`
// output), so the whole app — UI and API — is one deployable service behind
// one origin. In local dev the frontend instead runs separately via
// `npm run dev` (Vite), so `dist/` won't exist yet — that's fine, this is
// skipped and only the API runs here.
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // Express 5 removed bare "*" route patterns, so this fallback (for
  // client-side routes with no matching static file) is a plain middleware
  // instead of app.get("*", ...).
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
  console.log("Serving built frontend from", DIST_DIR);
}

app.listen(PORT, () => {
  console.log(`Bond portfolio server listening on http://localhost:${PORT}`);
});
