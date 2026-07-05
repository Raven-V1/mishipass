export interface TransferRequestRow {
  id: number;
  cat_public_id: string;
  requester_owner_id: number;
  current_owner_id: number;
  status: string;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface TransferRequestView {
  id: number;
  cat_public_id: string;
  cat_name: string;
  requester_email: string;
  message: string | null;
  created_at: string;
}

/** Create a new transfer request. Returns the new request id. */
export async function insertTransferRequest(
  db: D1Database,
  catPublicId: string,
  requesterOwnerId: number,
  currentOwnerId: number,
  message: string | null,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO transfer_requests
         (cat_public_id, requester_owner_id, current_owner_id, message)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(catPublicId, requesterOwnerId, currentOwnerId, message)
    .run();
  return result.meta.last_row_id as number;
}

/** True if a pending request already exists from this requester for this cat. */
export async function hasPendingTransferRequest(
  db: D1Database,
  catPublicId: string,
  requesterOwnerId: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM transfer_requests
       WHERE cat_public_id = ? AND requester_owner_id = ? AND status = 'pending'`,
    )
    .bind(catPublicId, requesterOwnerId)
    .first<{ id: number }>();
  return row !== null;
}

/** List pending transfer requests for the current owner to act on. */
export async function getTransferRequestsForOwner(
  db: D1Database,
  currentOwnerId: number,
): Promise<TransferRequestView[]> {
  const result = await db
    .prepare(
      `SELECT tr.id, tr.cat_public_id, c.name AS cat_name,
              o.email AS requester_email, tr.message, tr.created_at
       FROM transfer_requests tr
       JOIN cats c ON c.public_id = tr.cat_public_id
       JOIN owners o ON o.id = tr.requester_owner_id
       WHERE tr.current_owner_id = ? AND tr.status = 'pending'
       ORDER BY tr.created_at DESC`,
    )
    .bind(currentOwnerId)
    .all<TransferRequestView>();
  return result.results;
}

/** Fetch a single request (ownership verified). */
export async function getTransferRequest(
  db: D1Database,
  requestId: number,
  currentOwnerId: number,
): Promise<TransferRequestRow | null> {
  return db
    .prepare(
      `SELECT * FROM transfer_requests
       WHERE id = ? AND current_owner_id = ? AND status = 'pending'`,
    )
    .bind(requestId, currentOwnerId)
    .first<TransferRequestRow>();
}

/** Mark a request resolved (accepted or declined). */
export async function resolveTransferRequest(
  db: D1Database,
  requestId: number,
  currentOwnerId: number,
  status: "accepted" | "declined",
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE transfer_requests
       SET status = ?, resolved_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE id = ? AND current_owner_id = ? AND status = 'pending'`,
    )
    .bind(status, requestId, currentOwnerId)
    .run();
  return result.meta.changes > 0;
}

/**
 * Transfer cat ownership to a new owner and set mode to active.
 * Only executes if the cat currently belongs to fromOwnerId.
 */
export async function transferCatOwnership(
  db: D1Database,
  catPublicId: string,
  fromOwnerId: number,
  toOwnerId: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE cats
       SET owner_id = ?, current_mode = 'active'
       WHERE public_id = ? AND owner_id = ? AND deleted_at IS NULL`,
    )
    .bind(toOwnerId, catPublicId, fromOwnerId)
    .run();
  return result.meta.changes > 0;
}
