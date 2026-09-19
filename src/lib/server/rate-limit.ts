/**
 * In-memory sliding-window rate limiter.
 *
 * Suitable for a single-instance deployment, which is what this app is; a
 * multi-instance deployment would move the window into Redis with the same
 * interface. The map self-prunes on each call, so an abandoned IP costs
 * nothing after its window slides past.
 */

interface Window {
  timestamps: number[];
}

const WINDOW_MS = 60_000;

const buckets = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the earliest request slides out of the window. */
  retryAfterSeconds: number;
  remaining: number;
}

export function checkRateLimit(
  key: string,
  limitPerMinute: number,
  now: number = Date.now(),
): RateLimitResult {
  const cutoff = now - WINDOW_MS;

  // Prune the whole table occasionally so idle keys don't accumulate.
  if (buckets.size > 10_000) {
    for (const [k, w] of buckets) {
      if (w.timestamps.length === 0 || w.timestamps[w.timestamps.length - 1] < cutoff) {
        buckets.delete(k);
      }
    }
  }

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limitPerMinute) {
    const oldest = bucket.timestamps[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
      remaining: 0,
    };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: limitPerMinute - bucket.timestamps.length,
  };
}

/** Test hook: reset all windows. */
export function resetRateLimits(): void {
  buckets.clear();
}
