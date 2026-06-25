import type {
  MissingAlertPublicView,
  MissingAlertRow,
  MissingAlertUpsert,
  RecoveryBoardEntry,
} from "../types.js";

/**
 * Get the missing alert for a public cat profile.
 * Filters reward_amount based on reward_visible; never exposes
 * recovery_board_opt_in (that is an internal owner setting).
 * Returns null if no alert exists.
 */
export async function getMissingAlertPublic(
  db: D1Database,
  catPublicId: string,
): Promise<MissingAlertPublicView | null> {
  const row = await db
    .prepare(
      `SELECT a.last_seen_at, a.city, a.area,
              a.reward_amount, a.reward_visible, a.activated_at
       FROM missing_alerts a
       JOIN cats c ON c.id = a.cat_id
       WHERE c.public_id = ?`,
    )
    .bind(catPublicId)
    .first<{
      last_seen_at: string | null;
      city: string | null;
      area: string | null;
      reward_amount: string | null;
      reward_visible: 0 | 1;
      activated_at: string | null;
    }>();

  if (!row) return null;

  return {
    last_seen_at: row.last_seen_at,
    city: row.city,
    area: row.area,
    reward_amount: row.reward_visible === 1 ? row.reward_amount : null,
    activated_at: row.activated_at,
  };
}

/**
 * Get the full missing alert for the authenticated owner.
 * Ownership enforced in the WHERE clause.
 */
export async function getMissingAlertForOwner(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
): Promise<Omit<MissingAlertRow, "id" | "cat_id"> | null> {
  return db
    .prepare(
      `SELECT a.last_seen_at, a.city, a.area, a.reward_amount,
              a.reward_visible, a.recovery_board_opt_in, a.activated_at
       FROM missing_alerts a
       WHERE a.cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`,
    )
    .bind(catPublicId, ownerId)
    .first<Omit<MissingAlertRow, "id" | "cat_id">>();
}

/**
 * Insert or update a missing alert for a cat.
 * Ownership enforced via the cat_id subquery.
 */
export async function upsertMissingAlert(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
  data: MissingAlertUpsert,
): Promise<void> {
  const catIdSubquery = `(SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`;

  await db
    .prepare(
      `INSERT INTO missing_alerts
         (cat_id, last_seen_at, city, area, reward_amount,
          reward_visible, recovery_board_opt_in, activated_at)
       VALUES (${catIdSubquery}, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cat_id) DO UPDATE SET
         last_seen_at          = excluded.last_seen_at,
         city                  = excluded.city,
         area                  = excluded.area,
         reward_amount         = excluded.reward_amount,
         reward_visible        = excluded.reward_visible,
         recovery_board_opt_in = excluded.recovery_board_opt_in,
         activated_at          = excluded.activated_at`,
    )
    .bind(
      catPublicId,
      ownerId,
      data.last_seen_at ?? null,
      data.city ?? null,
      data.area ?? null,
      data.reward_amount ?? null,
      data.reward_visible ?? 0,
      data.recovery_board_opt_in ?? 0,
      data.activated_at ?? null,
    )
    .run();
}

/**
 * List cats published to the Recovery Board.
 * Only returns cats where recovery_board_opt_in = 1 AND current_mode = 'missing'.
 * Optionally filtered by city. Returns only public-safe columns; no internal ids.
 */
export async function listRecoveryBoardAlerts(
  db: D1Database,
  city?: string,
): Promise<RecoveryBoardEntry[]> {
  const result = await db
    .prepare(
      `SELECT c.public_id, c.name, c.country_code,
              a.city, a.area, a.last_seen_at, a.activated_at
       FROM missing_alerts a
       JOIN cats c ON c.id = a.cat_id
       WHERE a.recovery_board_opt_in = 1
         AND c.current_mode = 'missing'
         AND (? IS NULL OR a.city = ?)
       ORDER BY a.activated_at DESC`,
    )
    .bind(city ?? null, city ?? null)
    .all<RecoveryBoardEntry>();
  return result.results;
}
