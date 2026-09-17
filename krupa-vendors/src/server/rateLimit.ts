import "server-only";

/**
 * Fixed-window rate limiter held in process memory.
 *
 * Good enough for a single long-lived server or low-traffic serverless deployment:
 * each instance keeps its own counters, so a burst spread across many cold instances
 * can exceed the limit. Swap the Map for Upstash Redis (or Vercel KV) when traffic
 * justifies it — the `rateLimit()` signature is designed not to change.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (0 when allowed). */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Opportunistic cleanup so the map can't grow without bound.
    if (buckets.size > MAX_TRACKED_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Clears all counters. Test helper only. */
export function resetRateLimits(): void {
  buckets.clear();
}
