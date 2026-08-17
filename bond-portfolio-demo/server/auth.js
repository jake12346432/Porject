import { timingSafeEqual } from "node:crypto";

// One shared password gates the whole app (static frontend + every API
// route) — good enough for a small trusted group sharing one link, not
// meant to attribute actions to individual people. Browser handles the
// login UI natively (HTTP Basic Auth), so there's no custom login screen
// to build or maintain. Unset by default: this is a read-only demo with no
// buy/execution flow, so the only real cost surface is the AI endpoint,
// which has its own rate limit — set SITE_USERNAME/SITE_PASSWORD too if you
// want the whole site private.
function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function siteAuth(req, res, next) {
  const username = process.env.SITE_USERNAME;
  const password = process.env.SITE_PASSWORD;

  if (!username || !password) {
    if (!siteAuth._warned) {
      console.warn("[auth] SITE_USERNAME/SITE_PASSWORD not set — running with NO password protection.");
      siteAuth._warned = true;
    }
    return next();
  }

  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
    if (user && pass && safeEqual(user, username) && safeEqual(pass, password)) {
      return next();
    }
  }

  res.set("WWW-Authenticate", 'Basic realm="Titan Wealth"');
  res.status(401).send("Authentication required.");
}
