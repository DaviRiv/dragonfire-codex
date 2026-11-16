const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 20;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function openaiRateLimit(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let bucket = buckets.get(userId);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(userId, bucket);
  }
  if (bucket.count >= MAX_PER_WINDOW) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { ok: true };
}