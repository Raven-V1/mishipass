---
generated-at: 2026-07-02T00:00:00Z
audit-id: mishipass-security-audit-2026-07-02
---

# Triage

Severity x Likelihood scoring: H=High, M=Medium, L=Low.
Tier 1: bug fix restoring locked behavior — apply now.
Tier 2: architectural/design decision — flag for alignment, do not apply.
Tier 3: scheduled build item / enhancement — log only.

---

## TRIAGE-01 — Medication field validation: blocklist → allowlist (VULN-W-001)

Severity: MEDIUM | Likelihood: LOW | Score: M-L
Tier: 1 (code fix restoring constitution constraint: documentation-only records)

The blocklist pattern (cartilla.ts + vetVisit.ts) is fragile. Replacing it with
an allowlist directly enforces the "documentation-only" medication record boundary
from the constitution. No design decision required — the constitution is clear on
permitted fields.

**Fix applied in this audit.** See action-plan.md PLAN-01.

---

## TRIAGE-02 — SIGHTING_IP_HMAC_SECRET must be set in production (VULN-W-003)

Severity: MEDIUM | Likelihood: LOW (production deployment concern) | Score: M-L
Tier: 1 (operational — not a code change; requires wrangler secret put)

Public profile lookup rate limiting is disabled when SIGHTING_IP_HMAC_SECRET is
absent. Sighting submit already fails closed. The gap is rate limiting on public
profile lookups, not data exposure. The fix is an operational step: run
`wrangler secret put SIGHTING_IP_HMAC_SECRET` in production.

**Code change: none.** Flagged for Carlos to verify secret is set.
Status: Tier-1-blocked-on-secret.

---

## TRIAGE-03 — Stale TODO in vetSessions.ts (REDUN-002)

Severity: LOW | Likelihood: N/A | Score: L
Tier: 1 (cleanup — vet visit implementation is complete; TODO is stale)

Remove the stale `// TODO (Day 7 — §9 open items q1/q2):` comment.

**Fix applied in this audit.** See action-plan.md PLAN-02.

---

## TRIAGE-04 — Dependabot.yml: add groups and security-updates (Phase 5)

Severity: LOW | Likelihood: N/A | Score: L
Tier: 1 (configuration improvement — already required by Phase 5 of this audit)

Add `groups` (group related devDep updates) and explicit `open-pull-requests-limit`
to reduce noise on a small monorepo.

**Fix applied in this audit.** See action-plan.md PLAN-03.

---

## TRIAGE-05 — site/ GitHub Pages: retire and redirect to Worker app (Phase 8)

Severity: INFORMATIONAL | Likelihood: N/A | Score: INFORMATIONAL
Tier: 1 (operational — reversible redirect swap)

The legacy Pages URL exists and serves the old static landing page. Replace
with a redirect to the active Worker app.

**Fix applied in this audit.** See action-plan.md PLAN-04.

---

## TRIAGE-06 — Documentation honesty pass (Phase 10)

Severity: INFORMATIONAL | Likelihood: N/A | Score: INFORMATIONAL
Tier: 1 (documentation — remove WIP markers where now verifiable)

security-model.md contains "(Scheduled — not yet completed.)" for Aikido scan.
Update this to reflect that Aikido is not in scope for Beta and the audit was
completed via this manual pass.

**Fix applied in this audit.** See action-plan.md PLAN-05.

---

## TRIAGE-07 — Login endpoint lacks rate limiting (I-5)

Severity: LOW | Likelihood: LOW | Score: L-L
Tier: 2 (architectural — requires design decision: D1 rate limit or Cloudflare
WAF rule; PBKDF2 per-attempt cost is a partial mitigation)

Adding per-IP login rate limiting would require either expanding the D1-backed
durableRateLimit to cover auth endpoints or enabling a Cloudflare WAF rule.
This is a design decision that requires alignment before implementation.

**Not applied.** Flagged for Section 10 alignment.

---

## TRIAGE-08 — CORS posture for deferred apps/web split (I-5)

Severity: INFORMATIONAL (deferred) | Score: N/A
Tier: 2 (architectural — applicable only when apps/web becomes a deployed React
app at a separate origin)

**Not applied.** Flagged for Section 10 alignment when apps/web deployment
is scheduled.

---

## TRIAGE-09 — Dead stat fields in dashboard cat card (REDUN-004)

Severity: LOW | Score: L
Tier: 3 (enhancement — wire real data or remove for V1)

**Not applied.** Logged for future sprint.

---

## Summary

| Finding | Tier | Status |
|---|---|---|
| TRIAGE-01 Medication allowlist | 1 | APPLIED |
| TRIAGE-02 HMAC secret in prod | 1 | BLOCKED-ON-SECRET (Carlos action) |
| TRIAGE-03 Stale TODO | 1 | APPLIED |
| TRIAGE-04 Dependabot groups | 1 | APPLIED |
| TRIAGE-05 Pages redirect | 1 | APPLIED |
| TRIAGE-06 Docs honesty pass | 1 | APPLIED |
| TRIAGE-07 Login rate limiting | 2 | PROPOSED (alignment needed) |
| TRIAGE-08 CORS for web split | 2 | DEFERRED |
| TRIAGE-09 Dead stat fields | 3 | LOGGED |
