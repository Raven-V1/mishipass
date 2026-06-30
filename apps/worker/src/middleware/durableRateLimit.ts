/**
 * D1-backed durable rate limiter.
 * Survives Worker isolate restarts unlike the in-memory Map-based limiter.
 */

export async function checkDurableRateLimit(
  db: D1Database,
  key: string,
  maxPerWindow: number,
  windowMinutes: number,
): Promise<boolean> {
  const now = new Date();
  // Round down to window start
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();

  // Try to get current count
  const row = await db
    .prepare("SELECT count FROM rate_limits WHERE key = ? AND window_start = ?")
    .bind(key, windowStart)
    .first<{ count: number }>();

  if (row && row.count >= maxPerWindow) {
    return false; // rate limited
  }

  // Upsert: increment or insert
  await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count)
       VALUES (?, ?, 1)
       ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
    )
    .bind(key, windowStart)
    .run();

  return true; // allowed
}

/**
 * Clean up expired rate limit entries (older than 1 hour).
 * Call periodically or on a schedule, not on every request.
 */
export async function pruneExpiredRateLimits(db: D1Database): Promise<void> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(cutoff).run();
}
