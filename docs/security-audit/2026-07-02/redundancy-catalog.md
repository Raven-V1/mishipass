---
generated-at: 2026-07-02T00:00:00Z
audit-id: mishipass-security-audit-2026-07-02
---

# Redundancy Catalog

## REDUN-001 — Medication field blocklist vs. allowlist

File: `apps/worker/src/routes/cartilla.ts`, `apps/worker/src/routes/vetVisit.ts`

Blocklists of prohibited field names maintain two parallel lists (one per file)
when a single shared allowlist pattern would be more robust and less
maintenance-heavy. Addressed in Tier-1 fix.

---

## REDUN-002 — TODO comment in vetSessions.ts

File: `apps/worker/src/db/repositories/vetSessions.ts:3`

```typescript
// TODO (Day 7 — §9 open items q1/q2):
```

Day 7 vet visit implementation is complete. This TODO is stale. Remove it.

---

## REDUN-003 — packages/shared/validation vs. Worker ID validation (no drift found)

`packages/shared/validation/src/idFormat.ts` defines `validateId`. The Worker
imports it via `@mishipass/shared-validation`. No drift was found — the Worker
uses the shared package consistently and does not duplicate the regex inline.
This is a positive finding (no redundancy).

---

## REDUN-004 — Dead stats fields in dashboard cat card HTML

File: `apps/worker/src/pages/dashboard.ts:line ~163`

The cat card grid renders four stat boxes:
```
Next vaccine → "Pending"
Weight → "Not set"
Age → "Not set"
QR Status → currentMode
```

Three of four always show hardcoded placeholder values. These are not connected
to real D1 data. For Beta, this is acceptable cosmetic scaffolding, not a
security issue. Log as redundancy: dead stat UI that would benefit from either
wiring to real data or removal before V1.

Classification: cosmetic / deferred. Not a security finding.

---

## REDUN-005 — .dev.vars.example duplicates information in docs

`apps/worker/.dev.vars.example` and `docs/security-model.md §2` both list the
secrets the Worker uses. These are the authoritative source (wrangler docs).
The duplication is acceptable and intentional (one for dev onboarding, one for
security documentation).

---

## REDUN-006 — DASHBOARD_HTML_TEMPLATE built once at module load (positive pattern)

`apps/worker/src/pages/dashboard.ts:187`

```typescript
const DASHBOARD_HTML_TEMPLATE = buildDashboardHtml();
```

The heavy dashboard HTML is constructed once at module initialization, not on
every request. This is a positive pattern (no redundancy, better performance).
No action required.
