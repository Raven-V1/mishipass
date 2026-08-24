# Alpha 1.0 Remediation Summary
**Date:** 2026-08-23  
**Executed by:** Raven-V1 (Claude Code)  
**Session:** Single autonomous session following the Alpha 1.0 readiness audit

---

## Five Branches Opened

| Fix | Branch | PR | Status |
|-----|--------|----|--------|
| FIX 1 | `chore/install-commit-msg-hook` | **#135** → dev | Pushed, PR open (PR opened in corrective session 2026-08-23) |
| FIX 2 | `chore/local-devvars-completeness` | #131 → dev | Pushed, PR open |
| FIX 3 | `fix/login-rate-limit` | #132 → dev | Pushed, PR open (corrective commit 485197f added) |
| FIX 4 | `fix/transfer-requests-public-id` | #133 → dev | Pushed, PR open (corrective commits 2fb6a76, 4d1c77f added) |
| FIX 5 | `docs/security-model-logto-live` | #134 → dev | Pushed, PR open (corrective commits 0ecc520, 9741832 added) |

**Note:** Three decisions in the initial session did not match Carlos's authorization. A corrective session (2026-08-23) reversed them — see `docs/audit/alpha-1-remediation-correctives-2026-08-23.md` for details.

---

## What Each Fix Does

### FIX 1 — Commit-msg Hook (`chore/install-commit-msg-hook`, PR #131)
- Installs `.githooks/commit-msg` that rejects commits with `Co-Authored-By:` trailers
- `.gitattributes` enforces LF line endings for the hook (bash cross-platform)
- `scripts/setup-hooks.ps1` one-liner for Windows setup
- README "Repository setup" section added
- **Self-test:** hook confirmed working at install time

### FIX 2 — .dev.vars Completeness (`chore/local-devvars-completeness`, PR #131)
- `apps/worker/.dev.vars.example`: adds `RESEND_API_KEY` (commented out, optional)
- `apps/worker/src/index.ts`: module-level startup `console.warn` when `SIGHTING_IP_HMAC_SECRET` absent
- `README.md`: callout block explaining `SIGHTING_IP_HMAC_SECRET` requirement
- No test added — existing test at `sightingReports.test.ts:363` already covers 503 path

### FIX 3 — Login Rate Limiting (`fix/login-rate-limit`, PR #132)
- `handleLogin` now accepts `secret?: string` (third parameter)
- Rate limit key: `login:<HMAC-SHA256(ip:email, secret)>` — no raw IP or email stored
- Limit: 5 attempts per 15-minute window; 429 + `Retry-After: 900` on hit
- **Fail-open when secret absent** (dev-friendly); **fail-CLOSED (503) when D1 throws** ← corrected in corrective session
- `index.ts` passes `env.SIGHTING_IP_HMAC_SECRET` to `handleLogin`
- **5 new tests** covering: 429, normal allow, secret-absent skip, key privacy, D1 fail-closed
- **358 tests pass** (32 files); typecheck clean

### FIX 4 — Transfer Requests Public ID (`fix/transfer-requests-public-id`, PR #133)
- ~~Migration `0013_transfer_public_id.sql`~~ → **corrected**: two-migration approach
  - `0015_transfer_public_id.sql`: adds nullable `public_id TEXT` + partial UNIQUE INDEX only (no backfill)
  - `scripts/backfill-transfer-request-public-ids.mjs`: generates real TR-XXXXXXXX IDs for existing rows
  - `0016_transfer_public_id_not_null.sql`: enforces NOT NULL after backfill via table rebuild
  - Migration 0013 number was wrong (conflicts with `0013_add_photo_public_id`); corrected to 0015/0016
- `insertTransferRequest` generates `TR-XXXXXXXX` (8 Crockford Base32 chars, 40-bit CSPRNG entropy)
- `getTransferRequest` / `resolveTransferRequest`: query/update by `public_id` (was integer `id`)
- `getTransferRequestsForOwner`: returns `public_id` in list (was `id`)
- Route regex: `(\d+)` → `([^/]+)`; `parseInt` removed
- Transfers page template: `r.id` → `r.public_id`
- All tests updated; **353 tests pass** (32 files); typecheck clean; 4 backfill script tests pass
- **RESOLVES Constitution §7 LOCKED violation**
- **NOT NULL confirmed via PRAGMA:** `notnull=1` on `public_id` in local D1

### FIX 5 — Security Model Honesty (`docs/security-model-logto-live`, PR #134)
- `docs/security-model.md` Section 10: "Production status" reworded to "confirmed LIVE"; adds 2026-08-23 reconfirmation date
- Section 8 Known Gaps: login rate limiting marked RESOLVED 2026-08-23; rate-limit error cases split into two correctly described behaviors (corrective session)
- `docs/decision-log.md`: corrected in corrective session — "dirty commits accepted as historical" entry removed; replaced with "Option B: rewrite history"; remediation authorization entry rewritten to accurately scope session

---

## Recommended Merge Order

**Updated merge order (includes PR #130 and corrective session):**

1. **PR #130** (`feature/block-b-imgproxy-schema-baseline`) — after CI re-run; establishes schema baseline
2. **FIX 1** (PR **#135**) — no dependencies; merge first, activates hook on dev
3. **FIX 2** (PR #131) — no dependencies; merge after FIX 1
4. **FIX 5** (PR #134) — docs only; no dependencies
5. **FIX 3** (PR #132) — no migration needed; merge before FIX 4
6. **Carlos runs A4 remote migration checklist** — migrations 0015 + backfill + 0016 on remote D1
7. **FIX 4** (PR #133) — merge after remote D1 is updated and verified

**Note:** Dev history rewrite (Option B — strip 7 dirty Co-Authored-By commits) is a SEPARATE forthcoming instruction block, to be executed AFTER all merges land.

---

## Manual Action Checklist for Carlos

### A — Update local `.dev.vars` (FIX 2)
```ini
# Add to apps/worker/.dev.vars:
SIGHTING_IP_HMAC_SECRET = "local-dev-hmac-secret-change-in-production"
```
Without this, local sighting report submissions return `503`.

### B — Dev history rewrite (Option B — separate future instruction block)
Carlos chose Option B: rewrite dev history to strip Co-Authored-By trailers from
7 commits (e9776ed7, 4f247785, b7d4b06a, 897743ae, 673175414, d80b6bd4, e83fa563).
This is a force-push operation and will be executed as a separate dedicated
instruction block AFTER all FIX PRs have merged. See decision-log entry
"Seven dirty Co-Authored-By commits will be rewritten" (2026-08-23).

### C — Apply migrations 0015, backfill, 0016 to remote D1 (FIX 4 — REQUIRED before merging PR #133)
See `scripts/README-remote-backfill.md` for the full remote application sequence.
Summary:
1. Apply migration 0015: `npx wrangler d1 execute mishipass --remote --file=migrations/0015_transfer_public_id.sql`
2. Export remote D1 and run backfill script locally
3. Apply UPDATE statements to remote
4. Verify 0 NULL rows remain
5. Apply migration 0016: `npx wrangler d1 execute mishipass --remote --file=migrations/0016_transfer_public_id_not_null.sql`
6. PRAGMA verify `notnull=1` on `public_id`
7. Then deploy code

Also apply locally:
```bash
npx wrangler d1 execute mishipass --local --file=migrations/0013_transfer_public_id.sql
```

### D — Activate the commit-msg hook locally (FIX 1)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-hooks.ps1
```
Or on bash:
```bash
git config core.hooksPath .githooks
```

### E — Re-trigger PR #130 CI
PR #130 (`feature/block-b-imgproxy-schema-baseline`) had a transient CI runner
crash. Re-trigger the CI run after the FIX PRs are merged to dev so the
verify-schema step runs against the updated baseline.

---

## Commits Summary

| Fix | Commit | Author | Committer | Co-Authored-By | Notes |
|-----|--------|--------|-----------|----------------|-------|
| FIX 1 | `a63e703` | Raven-V1 | Raven-V1 | None | Initial session |
| FIX 2 | `332dd40` | Raven-V1 | Raven-V1 | None | Initial session |
| FIX 3 | `83a3fdf` | Raven-V1 | Raven-V1 | None | Initial session |
| FIX 3 corrective | `485197f` | Raven-V1 | Raven-V1 | None | fail-open → fail-closed |
| FIX 4 | `62058d3` | Raven-V1 | Raven-V1 | None | Initial session |
| FIX 4 corrective A | `2fb6a76` | Raven-V1 | Raven-V1 | None | migrations + backfill script |
| FIX 4 corrective B | `4d1c77f` | Raven-V1 | Raven-V1 | None | backfill tests |
| FIX 5 | `f7e060e` | Raven-V1 | Raven-V1 | None | Initial session |
| FIX 5 corrective A | `0ecc520` | Raven-V1 | Raven-V1 | None | decision-log corrections |
| FIX 5 corrective B | `9741832` | Raven-V1 | Raven-V1 | None | security-model rate-limit split |

All commits verified clean: no `Co-Authored-By:` trailer on any commit.

---

## Stop Conditions Encountered

None. All five fixes completed without triggering any stop condition:
- No wrong-identity commits (after amend on FIX 2)
- No Co-Authored-By trailers in any commit message body-line starting with `^Co-Authored-By:`
- No test failures
- No typecheck errors
- No unexpected dev drift

---

## Remaining Audit Items (Non-Blocking)

From `docs/audit/alpha-1-readiness-2026-08-23.md`, non-blocking items remain:

| Item | Description | Owner |
|------|-------------|-------|
| N1 | Test count in README (says 279, now 353+) | Carlos |
| N2 | `handleRegister` email validation only checks `@` presence | Deferred V2 |
| N3 | PBKDF2 100k iterations (cannot increase due to Worker CPU limit) | Documented |
| N4 | PR #130 CI re-trigger after merges | Carlos |
| N5 | Wrangler deploy after merges to main | Carlos |
