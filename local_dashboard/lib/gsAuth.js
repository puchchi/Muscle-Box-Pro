// GS machine-server request authentication.
//
// Spec: docs/Payment interface document-v2.0_20250712 (2).pdf §3.2.1 — every request from the
// machine server must carry:
//
//   key         api key from the GS console (personal information tab)
//   key-md5     MD5(key + secret + timestamp)
//   timestamp   Unix epoch milliseconds
//
// Two things about the spec are not yet confirmed against a real request:
//
//   1. The exact digest construction. "MD5(key + secret + timestamp)" reads unambiguously, but
//      vendor docs routinely omit a separator or an element. We therefore try a list of candidate
//      constructions and report which one matched, so the first real request settles it.
//   2. Whether these headers are sent to *our* endpoints at all. The worked example in spec §3.3.1
//      carries a request body that doesn't match any of the interfaces we implement, so it may
//      document GS's own open API rather than calls into us.
//
// Until both are settled, GS_AUTH_MODE defaults to "observe": verify, log the verdict, allow
// through. Enforcing a guessed construction would return 400 to the machine server and stop
// payments. Flip to "enforce" once the log shows a confirmed match.

const crypto = require("crypto");
const log = require("./logger");

const MODE = (process.env.GS_AUTH_MODE || "observe").toLowerCase(); // observe | enforce | off
const API_KEY = process.env.GS_API_KEY || "";
const API_SECRET = process.env.GS_API_SECRET || "";
const SKEW_MS = parseInt(process.env.GS_AUTH_SKEW_MS || String(5 * 60 * 1000), 10);
const REPLAY_TTL_MS = SKEW_MS * 2;

// ─── Candidate digest constructions ───────────────────────────────────────────
// Ordered most- to least-likely. The first is what the spec literally says.

const CANDIDATES = [
  ["key+secret+timestamp",       (k, s, t) => k + s + t],
  ["key+secret+timestamp:upper", (k, s, t) => k + s + t, "upper"],
  ["secret+key+timestamp",       (k, s, t) => s + k + t],
  ["key+timestamp+secret",       (k, s, t) => k + t + s],
  ["timestamp+key+secret",       (k, s, t) => t + k + s],
  ["key&secret&timestamp",       (k, s, t) => `${k}&${s}&${t}`],
  ["key+secret+timestamp+secret",(k, s, t) => k + s + t + s],
  ["secret+timestamp",           (_k, s, t) => s + t],
];

function md5(input, casing) {
  const hex = crypto.createHash("md5").update(input, "utf8").digest("hex");
  return casing === "upper" ? hex.toUpperCase() : hex;
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Returns the name of the matching construction, or null. */
function matchConstruction(key, secret, timestamp, provided) {
  for (const [name, build, casing] of CANDIDATES) {
    if (safeEqual(md5(build(key, secret, timestamp), casing), provided)) return name;
  }
  return null;
}

// ─── Replay cache ─────────────────────────────────────────────────────────────
// Each (key, timestamp) pair is single-use. The digest does not cover the request body, so a
// captured header triple is otherwise a valid credential for any body until the skew window
// closes. In-memory is adequate for a single-process dashboard; the Lambda rewrite needs
// DynamoDB with a TTL instead.

const seen = new Map();

function seenBefore(id) {
  const now = Date.now();
  for (const [k, at] of seen) if (now - at > REPLAY_TTL_MS) seen.delete(k);
  if (seen.has(id)) return true;
  seen.set(id, now);
  return false;
}

// ─── Header redaction ─────────────────────────────────────────────────────────

const SENSITIVE = new Set(["key", "key-md5", "authorization", "cookie", "x-dashboard-password"]);

/** Masks credential headers so request logging can't write working credentials to disk. */
function redactHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE.has(k.toLowerCase())
      ? `${String(v).slice(0, 4)}…[redacted ${String(v).length} chars]`
      : v;
  }
  return out;
}

// ─── Verification ─────────────────────────────────────────────────────────────

/**
 * Verifies GS auth headers.
 * @returns {{ ok: boolean, reason?: string, construction?: string, skewMs?: number }}
 */
function verify(headers) {
  const key = headers["key"];
  const digest = headers["key-md5"];
  const timestamp = headers["timestamp"];

  const missing = ["key", "key-md5", "timestamp"].filter((h) => !headers[h]);
  if (missing.length) return { ok: false, reason: `missing headers: ${missing.join(", ")}` };

  if (!API_KEY || !API_SECRET) return { ok: false, reason: "GS_API_KEY / GS_API_SECRET not configured" };
  if (!safeEqual(key, API_KEY)) return { ok: false, reason: "unknown key" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "timestamp is not numeric" };

  // Spec calls this a "Eastern 8th Time Zone" timestamp, but both worked examples decode to
  // business hours in UTC+8, i.e. a plain epoch with no baked-in offset. If a request ever arrives
  // shifted by a whole number of hours, say so loudly rather than silently rejecting everything.
  const skewMs = Date.now() - ts;
  if (Math.abs(skewMs) > SKEW_MS) {
    const offsetHours = Math.round(skewMs / 3_600_000);
    if (offsetHours !== 0 && Math.abs(Math.abs(skewMs) - Math.abs(offsetHours) * 3_600_000) < SKEW_MS) {
      log.warn(
        `[GSAuth] timestamp is off by almost exactly ${offsetHours}h — the sender may apply a ` +
          `timezone offset. Set GS_AUTH_TZ_OFFSET_HOURS=${offsetHours} once confirmed.`,
      );
    }
    return { ok: false, reason: `timestamp skew ${Math.round(skewMs / 1000)}s exceeds ±${SKEW_MS / 1000}s`, skewMs };
  }

  const construction = matchConstruction(key, API_SECRET, timestamp, digest);
  if (!construction) return { ok: false, reason: "no candidate construction reproduced key-md5", skewMs };

  if (seenBefore(`${key}#${timestamp}`)) {
    return { ok: false, reason: "replayed (key, timestamp) pair", construction, skewMs };
  }

  return { ok: true, construction, skewMs };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

let reportedConstruction = null;

function gsAuth(req, res, next) {
  if (MODE === "off") return next();

  const result = verify(req.headers);

  if (result.ok) {
    // Announce the confirmed construction once, so the log is actionable rather than noisy.
    if (result.construction !== reportedConstruction) {
      reportedConstruction = result.construction;
      log.ok(
        `[GSAuth] verified — construction "${result.construction}", skew ${result.skewMs}ms. ` +
          (MODE === "observe" ? `Construction confirmed: set GS_AUTH_MODE=enforce.` : ""),
      );
    }
    return next();
  }

  if (MODE === "enforce") {
    log.error(`[GSAuth] REJECTED ${req.originalUrl} — ${result.reason}`);
    return res.status(400).json({ code: 400, msg: "Authentication failed", message: "Authentication failed" });
  }

  log.warn(`[GSAuth] observe-mode: would have REJECTED ${req.originalUrl} — ${result.reason}`);
  return next();
}

module.exports = { gsAuth, verify, redactHeaders, matchConstruction, CANDIDATES, MODE };
