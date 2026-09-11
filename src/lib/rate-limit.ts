import "server-only";

// In-memory, per-serverless-instance sliding-window limiter. Good enough as
// an MVP guard against a single client/script hammering an expensive route
// (e.g. repeatedly triggering headless-Chromium PDF generation) — NOT a
// distributed rate limit. On Vercel each warm instance/region keeps its own
// counters, so a request that fans out across multiple cold instances can
// exceed the nominal limit. Upgrading this to a shared limit would mean
// tracking counters in Postgres/Redis instead of process memory — deferred
// until there's a real need for it.
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup so a long-lived warm instance doesn't accumulate
  // unbounded entries for keys that stopped being used.
  if (buckets.size > 1000) {
    for (const [bucketKey, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(bucketKey);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
