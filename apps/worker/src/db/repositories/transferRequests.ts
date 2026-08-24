export interface TransferRequestRow {
  id: number;
  public_id: string;
  cat_public_id: string;
  requester_owner_id: number;
  current_owner_id: number;
  status: string;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface TransferRequestView {
  public_id: string;
  cat_public_id: string;
  cat_name: string;
  requester_email: string;
  message: string | null;
  created_at: string;
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateTransferPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5)); // 40 bits → 8 × 5-bit chars
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let s = "";
  for (let i = 0; i < 8; i++) {
    s = CROCKFORD[Number(n & 31n)]! + s;
    n >>= 5n;
  }
  return `TR-${s}`;
}

/** Create a new transfer request. Returns the new public_id. */
export async function insertTransferRequest(
  db: D1Database,
  catPublicId: string,
  requesterOwnerId: number,
  currentOwnerId: number,
  message: string | null,
): Promise<string> {
  const publicId = generateTransferPublicId();
  await db
    .prepare(
      `INSERT INTO transfer_requests
         (public_id, cat_public_id, requester_owner_id, current_owner_id, message)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(publicId, catPublicId, requesterOwnerId, currentOwnerId, message)
    .run();
  return publicId;
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
      `SELECT tr.public_id, tr.cat_public_id, c.name AS cat_name,
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

/** Fetch a single request by public_id (ownership verified). */
export async function getTransferRequest(
  db: D1Database,
  publicId: string,
  currentOwnerId: number,
): Promise<TransferRequestRow | null> {
  return db
    .prepare(
      `SELECT * FROM transfer_requests
       WHERE public_id = ? AND current_owner_id = ? AND status = 'pending'`,
    )
    .bind(publicId, currentOwnerId)
    .first<TransferRequestRow>();
}

/** Mark a request resolved (accepted or declined). */
export async function resolveTransferRequest(
  db: D1Database,
  publicId: string,
  currentOwnerId: number,
  status: "accepted" | "declined",
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE transfer_requests
       SET status = ?, resolved_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE public_id = ? AND current_owner_id = ? AND status = 'pending'`,
    )
    .bind(status, publicId, currentOwnerId)
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
