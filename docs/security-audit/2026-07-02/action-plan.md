---
generated-at: 2026-07-02T00:00:00Z
audit-id: mishipass-security-audit-2026-07-02
---

# Action Plan

## Applied in this audit (Tier 1)

---

### PLAN-01 — Medication field allowlist

Owner: Claude Code (applied), Carlos (reviews)
Tier: 1
DoD: `handleCreateMedication` and `handleVetVisitFinish` medication section
both validate only against an explicit set of permitted field names.
Any unrecognized field returns 400.

Files changed:
- `apps/worker/src/routes/cartilla.ts` — `handleCreateMedication`
- `apps/worker/src/routes/vetVisit.ts` — `handleVetVisitFinish` medication section

Status: APPLIED.

---

### PLAN-02 — Remove stale TODO in vetSessions.ts

Owner: Claude Code (applied), Carlos (reviews)
Tier: 1
DoD: No stale Day 7 TODO comment in vetSessions.ts.

File changed: `apps/worker/src/db/repositories/vetSessions.ts`

Status: APPLIED.

---

### PLAN-03 — Dependabot.yml: add groups and open-pull-requests-limit

Owner: Claude Code (applied), Carlos (reviews)
Tier: 1
DoD: .github/dependabot.yml has `groups` for each ecosystem and an
`open-pull-requests-limit` per ecosystem entry.

File changed: `.github/dependabot.yml`

Status: APPLIED.

---

### PLAN-04 — Retire legacy GitHub Pages, redirect to Worker app

Owner: Claude Code (applied), Carlos (reviews)
Tier: 1 (reversible — git-tracked)
DoD: `site/index.html` delivers a meta-refresh redirect and canonical link to
`https://mishipass.carlosvelazquez354.workers.dev/`. Legacy content removed.

File changed: `site/index.html`

Status: APPLIED.

---

### PLAN-05 — Documentation honesty pass

Owner: Claude Code (applied), Carlos (reviews)
Tier: 1
DoD: `docs/security-model.md` WIP markers updated to reflect verifiable state
as of 2026-07-02. No overclaims.

File changed: `docs/security-model.md`

Status: APPLIED.

---

## Requires Carlos action (Tier 1, blocked)

---

### PLAN-06 — Verify SIGHTING_IP_HMAC_SECRET is set in production

Owner: Carlos
Tier: 1 (operational step)
Command: `wrangler secret put SIGHTING_IP_HMAC_SECRET --env production`
DoD: Secret confirmed set in production deployment.

Status: BLOCKED-ON-SECRET. Code requires no change.

---

## Proposed for alignment (Tier 2)

---

### PLAN-07 — Add per-IP rate limiting on /api/auth/login

Owner: Carlos (decision) + implementation
Tier: 2
Alignment questions:
1. Prefer D1-backed durableRateLimit (consistent with existing pattern) or
   Cloudflare WAF rule (no code change)?
2. What threshold is appropriate? (e.g. 10 attempts per 10 min per IP)
3. Should lockout be temporary (returns 429) or permanent-until-reset?

DoD (when aligned): auth login route has per-IP rate limiting at agreed threshold.

---

### PLAN-08 — CORS posture for apps/web React app deployment

Owner: Carlos (decision)
Tier: 2
Alignment questions:
1. When apps/web is deployed (what domain / subdomain)?
2. Which API endpoints will be cross-origin?
3. What SameSite cookie strategy for cross-origin auth?

DoD (when aligned): CORS headers and cookie SameSite posture set correctly for
the production split-origin deployment.

---

## Logged (Tier 3)

---

### PLAN-09 — Wire or remove dead stat fields in dashboard cat card

Owner: TBD (V1 sprint)
Tier: 3
Current: "Next vaccine", "Weight", "Age" always show "Pending" / "Not set".
Options: wire to D1 (requires schema + API work) or remove for clean V1 UI.
