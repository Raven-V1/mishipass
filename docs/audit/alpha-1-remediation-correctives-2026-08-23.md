# Alpha 1.0 Remediation Correctives
**Date:** 2026-08-23  
**Executed by:** Raven-V1 (Claude Code)  
**Session:** Corrective session following Carlos's review of the initial remediation session

This document records the three authorized reversals and the associated corrective
work. The initial remediation session contained three autonomous decisions that did
not match Carlos's authorization. Each reversal is described below.

---

## Corrective 0 — Open Missing FIX 1 PR

**Problem:** The initial session pushed `chore/install-commit-msg-hook` to origin
but did not open a PR.

**Action:** `gh pr create` executed.

**Result:**
- FIX 1 PR: **#135** (base: dev, head: chore/install-commit-msg-hook)
- Commit at HEAD: `a63e703` — chore(governance): install commit-msg hook rejecting Co-Authored-By trailers

---

## Corrective 1 — FIX 3 Fail-Closed (PR #132)

**Branch:** `fix/login-rate-limit`

**Problem:** The catch block in `apps/worker/src/routes/auth.ts` was fail-open
— a D1 error during rate check silently allowed login to proceed. This is a
Tier-1 defensive control; a broken backend must not silently permit unlimited
attempts.

**Authorization:** Carlos corrective — fail-closed on D1 error, matching the
`SIGHTING_IP_HMAC_SECRET` fail-closed pattern.

**Changes:**
- `apps/worker/src/routes/auth.ts`: catch block now returns 503 Service
  Unavailable instead of falling through to the login path
- `apps/worker/src/routes/__tests__/auth.test.ts`: test renamed from "proceeds
  fail-open when D1 throws" to "returns 503 fail-closed when D1 throws"; asserts
  status 503, generic body (no D1 error leaked), and `mockFindOwnerByEmail` not
  called

**Test result:** 358 tests pass (32 files); typecheck clean

**Corrective commit:** `485197f`
```
fix(auth): rate limit backend error must fail-closed (503), not fail-open

Correction to previous FIX 3 implementation which allowed login to proceed
on D1 error. Per Carlos governance decision 2026-08-23, rate limit is a
Tier-1 defensive control and must fail-closed to match SIGHTING_IP_HMAC_SECRET
fail-closed pattern.
```

**Pushed:** Yes — PR #132 picks up the corrective commit automatically.

---

## Corrective 2 — FIX 4 Real Public IDs + NOT NULL (PR #133)

**Branch:** `fix/transfer-requests-public-id`

**Problems:**
1. The original migration `0013_transfer_public_id.sql` was incorrectly numbered
   (conflicts with `0013_add_photo_public_id.sql` which is already in main).
2. Existing rows received `TR-LEGACY-N` placeholder IDs in SQL, not real Crockford
   Base32 IDs. Carlos requires real `TR-XXXXXXXX` IDs generated via CSPRNG.
3. No NOT NULL enforcement was implemented.

**Authorization:** Carlos corrective — two-migration + backfill-script approach;
real IDs; NOT NULL enforced via second migration.

**Changes:**

*Chunk A (commit `2fb6a76`):*
- Removed `apps/worker/migrations/0013_transfer_public_id.sql`
- Added `apps/worker/migrations/0015_transfer_public_id.sql`: nullable `public_id TEXT`
  column + partial UNIQUE INDEX only (`WHERE public_id IS NOT NULL`)
- Added `apps/worker/migrations/0016_transfer_public_id_not_null.sql`: table rebuild
  enforcing `NOT NULL UNIQUE` on `public_id` (run after backfill)
- Added `scripts/backfill-transfer-request-public-ids.mjs`: Node 22+ script using
  `node:sqlite` to generate real `TR-XXXXXXXX` IDs for NULL rows; supports
  `--local`, `--db-path`, `--dry-run` flags; exits non-zero if any rows remain NULL
- Added `scripts/README-remote-backfill.md`: documents export → local backfill →
  import pattern for applying backfill to remote D1 production

*Chunk B (commit `4d1c77f`):*
- Added `scripts/__tests__/backfill-transfer-public-ids.test.mjs`: 4 `node:test` tests
  - 3 NULL rows receive `TR-XXXXXXXX` IDs and exit 0
  - Idempotency: already-assigned rows, exits 0 with "nothing to do"
  - `--dry-run` does not write to database
  - Generated ID format matches `TR-[Crockford×8]` contract

**Local migration verification (PRAGMA output):**
```json
{ "cid": 1, "name": "public_id", "type": "TEXT", "notnull": 1, "dflt_value": null, "pk": 0 }
```
`notnull=1` confirmed ✓

**Test result:** 4 backfill tests pass; 353 worker tests pass; typecheck clean

**PR #133 body:** Updated with corrected remote application sequence (steps 1–13)
matching `scripts/README-remote-backfill.md`.

**Pushed:** Yes

---

## Corrective 3 — FIX 5 Decision Log Entries (PR #134)

**Branch:** `docs/security-model-logto-live`

**Problems:**
1. Entry "Seven dirty commits with Co-Authored-By trailers accepted as historical"
   was written by the agent attributing Option A to Carlos. Carlos chose Option B
   (rewrite history).
2. Entry "Alpha 1.0 remediation sequence authorized and executed" did not note
   that the session had three autonomous decisions requiring a corrective session.
3. The security-model.md rate-limit paragraph described a single fail-open behavior
   where there are actually two distinct cases (secret absent vs D1 error).

**Changes:**

*Commit `0ecc520` — decision-log corrections:*
- Removed entry "Seven dirty commits with Co-Authored-By trailers accepted as
  historical" (Option A)
- Rewrote entry "Alpha 1.0 remediation sequence authorized" to accurately scope
  the session and note correctives follow
- Added new entry "Seven dirty Co-Authored-By commits will be rewritten" — Option B
  decision attributed to Carlos, notes separate forthcoming instruction block

*Commit `9741832` — security-model rate-limit split:*
- Split the single fail-open description into two cases:
  - (a) Secret absent: fail-open, login proceeds (intentional for dev)
  - (b) D1 throws: fail-closed, 503 returned (Tier-1 control)

**Pushed:** Yes

---

## Corrective 4 — Summary Report Update

**Branch:** `docs/remediation-summary-corrective` (this branch)

**Changes to `docs/audit/alpha-1-remediation-summary-2026-08-23.md`:**
- Corrected FIX 1 PR number from #131 to **#135**
- Added note that three autonomous decisions required a corrective session
- FIX 3 description: corrected fail-open → fail-closed
- FIX 4 description: corrected two-migration + backfill approach; real IDs; NOT NULL confirmed
- FIX 5 description: corrected decision-log entries; rate-limit paragraph split
- Merge order: updated to include PR #130 and note Option B is a separate future block
- Manual steps: B corrected to Option B; C corrected to 0015/backfill/0016 sequence
- Commits table: added all corrective commits

**PR:** **#136** (this PR)

---

## Final State

### PR Status
| PR | Branch | Fix | Notes |
|----|--------|-----|-------|
| #130 | feature/block-b-imgproxy-schema-baseline | Block B | Needs CI re-run |
| #131 | chore/local-devvars-completeness | FIX 2 | Ready |
| #132 | fix/login-rate-limit | FIX 3 | Corrective applied (485197f) |
| #133 | fix/transfer-requests-public-id | FIX 4 | Corrective applied (2fb6a76, 4d1c77f) |
| #134 | docs/security-model-logto-live | FIX 5 | Corrective applied (0ecc520, 9741832) |
| **#135** | chore/install-commit-msg-hook | FIX 1 | PR opened in corrective session |
| **#136** | docs/remediation-summary-corrective | Corrective summary | This PR |

### Merge Order (Final)
1. PR #130 — after CI re-run
2. PR #135 (FIX 1) — commit-msg hook
3. PR #131 (FIX 2) — dev vars
4. PR #134 (FIX 5) — security model + decision log
5. PR #132 (FIX 3) — login rate limit
6. Carlos runs remote migration checklist (migrations 0015 + backfill + 0016)
7. PR #133 (FIX 4) — transfer request public IDs

### Fail-Closed Test Confirmation
Test: "returns 503 fail-closed when D1 throws during rate limit check"  
File: `apps/worker/src/routes/__tests__/auth.test.ts`  
Result: **PASS** (part of 358 total tests passing)

### NOT NULL Constraint Confirmation
Migration: `0016_transfer_public_id_not_null.sql`  
PRAGMA output: `public_id` column `notnull=1`  
Verified locally via: `npx wrangler d1 execute mishipass --local --command="PRAGMA table_info(transfer_requests)"`

---

## HALT

**CORRECTIVES COMPLETE. Ready for merge sequencing.**

History rewrite (Option B — strip 7 dirty Co-Authored-By commits from dev) is a
SEPARATE future instruction block, to be executed AFTER all merges land.
