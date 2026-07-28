// Tiny in-memory rate limiter. Good enough for a single-region deployment and
// abuse-throttling of post/comment creation and admin login. Not shared across
// serverless instances, so treat it as best-effort defense in depth.
type Stamp = number[];
const buckets = new Map<string, Stamp>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfterMs = hits[0] + windowMs - now;
    buckets.set(key, hits);
    return { ok: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterMs: 0 };
}
