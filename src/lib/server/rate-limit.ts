const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; message: string };

export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      message: "Too many requests. Try again later.",
    };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Run every limit; stops on the first failure. */
export function consumeRateLimits(
  specs: { key: string; limit: number; windowMs: number }[],
): RateLimitResult {
  for (const spec of specs) {
    const result = consumeRateLimit(spec.key, spec.limit, spec.windowMs);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export const LIMITS = {
  registerPerIpDay: { limit: 3, windowMs: DAY },
  loginPerIp15m: { limit: 24, windowMs: 15 * 60 * 1000 },
  loginPerUser15m: { limit: 8, windowMs: 15 * 60 * 1000 },
  openaiPerUserHour: { limit: 5, windowMs: HOUR },
  openaiPerIpHour: { limit: 8, windowMs: HOUR },
  openaiGlobalHour: { limit: 80, windowMs: HOUR },
  talkThreadPerUserDay: { limit: 3, windowMs: DAY },
  talkReplyPerUserHour: { limit: 20, windowMs: HOUR },
  boardSuggestPerUserDay: { limit: 5, windowMs: DAY },
  boardCommentPerUserHour: { limit: 12, windowMs: HOUR },
  boardRatePerUserHour: { limit: 30, windowMs: HOUR },
} as const;