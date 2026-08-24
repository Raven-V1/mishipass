# Remote D1 Backfill — Transfer Request Public IDs

This document describes how to backfill `transfer_requests.public_id` on the
remote production D1 database using the local backfill script.

D1 does not expose a SQLite function for CSPRNG, so the script runs locally
and produces SQL `UPDATE` statements that are then applied to remote.

---

## Prerequisites

- Wrangler authenticated (`npx wrangler login`)
- Migration 0015 already applied to remote (see PR #133 checklist)
- `node:sqlite` available (Node 22+; use `node --version` to confirm)

---

## Steps

### 1. Export remote D1 to a local file

```bash
npx wrangler d1 export mishipass --remote --output=./tmp-remote-export.sql
```

Import into a scratch SQLite database:

```bash
sqlite3 ./tmp-remote-scratch.sqlite < ./tmp-remote-export.sql
```

### 2. Run the backfill script against the scratch database

```bash
node scripts/backfill-transfer-request-public-ids.mjs --db-path ./tmp-remote-scratch.sqlite
```

Expected output:
```
Found N row(s) with NULL public_id.
row 1 assigned public_id TR-XXXXXXXX
...
Backfill complete. N assigned, 0 failed.
```

### 3. Extract the UPDATE statements

```bash
sqlite3 ./tmp-remote-scratch.sqlite \
  "SELECT 'UPDATE transfer_requests SET public_id=''' || public_id || ''' WHERE id=' || id || ';' FROM transfer_requests WHERE public_id IS NOT NULL" \
  > ./tmp-backfill-updates.sql
```

Inspect the file to confirm it contains only UPDATE statements and no sensitive data.

### 4. Apply the UPDATE statements to remote

```bash
npx wrangler d1 execute mishipass --remote --file=./tmp-backfill-updates.sql
```

### 5. Verify no NULL rows remain on remote

```bash
npx wrangler d1 execute mishipass --remote \
  --command="SELECT COUNT(*) FROM transfer_requests WHERE public_id IS NULL"
```

Must return `0`.

### 6. Apply migration 0016

```bash
npx wrangler d1 execute mishipass --remote \
  --file=apps/worker/migrations/0016_transfer_public_id_not_null.sql
```

### 7. Verify NOT NULL constraint

```bash
npx wrangler d1 execute mishipass --remote \
  --command="PRAGMA table_info(transfer_requests)"
```

Confirm `public_id` row shows `notnull=1`.

---

## Cleanup

After a successful deploy and smoke test, delete the scratch files:

```bash
rm ./tmp-remote-export.sql ./tmp-remote-scratch.sqlite ./tmp-backfill-updates.sql
```
