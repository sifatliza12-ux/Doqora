import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Distributed rate limiting backed by Upstash Redis (provisioned via
// Vercel's "Upstash for Redis" marketplace integration — KV_REST_API_URL/
// KV_REST_API_TOKEN). Replaces the old per-process in-memory Map: every
// serverless instance/region now shares the same counters through Redis, via
// @upstash/ratelimit's fixedWindow algorithm, which increments and checks
// the counter with a single atomic Redis-side script rather than a
// read-then-write race — closing the exact gap the old version's own
// comment flagged (a request fanned out across concurrent cold instances
// could exceed the nominal limit). Not @vercel/kv: that package has been
// deprecated (no release since Sept 2024) since Vercel migrated Vercel KV
// itself onto Upstash Redis in Dec 2024 — @upstash/redis is the
// currently-recommended client for the same underlying store.
//
// This keeps the exact same fixed-window POLICY as the in-memory version
// (same call site, same params) — this migration replaces the storage
// mechanism only, not the rate-limiting behavior.
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// One Ratelimit instance per distinct (limit, windowMs) pair, created once
// and reused across requests on a warm instance — @upstash/ratelimit's own
// docs recommend constructing it outside the request handler, since that
// also enables its ephemeral in-memory cache of already-exhausted
// identifiers (skips a Redis round-trip for a repeat offender within the
// same warm instance). In practice this app only ever calls
// checkRateLimit() with one fixed pair (the PDF route's 10/60_000), so this
// map holds at most a handful of entries.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms`),
      prefix: "doqora-ratelimit",
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// FAIL OPEN if Redis is genuinely unreachable. This limiter guards against
// cost/resource abuse of an expensive route (headless-Chromium PDF
// rendering) — it is not a security boundary the way auth or tenant-scoping
// is, and those must always fail closed; this doesn't carry the same
// stakes. On a real Redis outage the choice is between (a) PDF generation
// keeps working for every real customer for as long as the — rare,
// typically short-lived — outage lasts, with a bounded risk that an
// attacker exploits that same narrow window, or (b) a real, customer-visible
// feature outage across the entire app caused by a dependency that isn't
// even part of the actual PDF-generation logic. (a) is the better trade for
// an invoicing app whose customers rely on PDFs for real accounting/
// compliance needs. This also matches @upstash/ratelimit's own built-in
// default: its `timeout` option (5s unless overridden) already resolves
// success:true if Redis doesn't respond in time, so a *slow* Redis fails
// open automatically. That default doesn't cover an outright connection
// error, though (DNS failure, auth failure, etc. reject rather than hang),
// so that path is caught explicitly here too — and logged, since a silent,
// indefinite fail-open would hide a real, ongoing outage from anyone.
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const { success, reset } = await getLimiter(limit, windowMs).limit(key);
    if (success) return { allowed: true, retryAfterSeconds: 0 };
    return { allowed: false, retryAfterSeconds: Math.max(0, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (error) {
    console.error("Rate limit check failed (Redis unreachable) — failing open:", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
