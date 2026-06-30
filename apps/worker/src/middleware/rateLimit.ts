// Best-effort per-isolate rate limiter. Not durable across isolate restarts.
const submissions = new Map<string, number[]>();

export function checkRateLimit(key: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = submissions.get(key) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  if (recent.length >= maxPerWindow) return false;
  recent.push(now);
  submissions.set(key, recent);
  return true;
}
