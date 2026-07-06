---
generated-at: 2026-07-02T00:00:00Z
audit-id: mishipass-security-audit-2026-07-02
---

# System Analysis — Full Attack Surface

## 4.1 STRIDE-style threat model

### Spoofing

**S-1 — Owner account spoofing:**
Owner session is an opaque SHA-256 token hash stored in D1, delivered as an
HttpOnly cookie. Tokens are checked against the DB on every request. Password is
verified using PBKDF2-SHA256. No hardcoded credentials. No default passwords.
Control: adequate for Beta.

**S-2 — Cat identity spoofing via QR:**
Public IDs are validated on every lookup (`validateId` enforces format). No
internal ID accepted on public routes. Attacker cannot forge a valid cat ID
without knowing the 40-bit random segment. Control: adequate.

**S-3 — Vet spoofing:**
No vet authentication in Beta (mode-gated only). Anyone with the QR can submit
during active vet visit window. Documented Beta limitation. Mitigated by
owner-controlled activation, 24h expiry, and Save & Finish.

---

### Tampering

**T-1 — D1 data tampering:**
D1 is not directly exposed to clients. All access is through the Worker, which
enforces ownership on writes. SQL parameters are used (no string interpolation
for SQL). Control: adequate.

**T-2 — R2 photo tampering:**
R2 keys are never returned to clients. All access is through Worker media routes.
Uploads are validated (MIME, magic bytes, size). Control: adequate.

**T-3 — QR URL tampering:**
Static QR code cannot be changed by an attacker. The Worker maps public ID to
mode; mode is stored in D1 and only the authenticated owner can switch it.
Control: adequate.

---

### Repudiation

**R-1 — Sighting report repudiation:**
Reporter IP is hashed (HMAC-SHA256). The hash provides a fingerprint for
grouping reports from the same IP but cannot be reversed to identify the reporter.
This is by design (privacy-first). Repudiation risk is accepted.

**R-2 — Vet visit record repudiation:**
No vet identity is verified in Beta. Records may be submitted by anyone with QR
access during vet mode. Documented Beta limitation.

---

### Information Disclosure

**I-1 — Internal ID exposure:**
No internal database primary keys are serialized in any client response.
Public profiles use `/c/MP-CC-S1-S2`. Dashboard uses the same public ID for
all cat-level API calls. Verified by code review. Control: adequate.

**I-2 — Cartilla/medication disclosure:**
Cartilla, medication, and vaccine data is never included in public route responses.
Owner auth is required for all cartilla API routes. Code review confirms no
JOIN between public profile queries and cartilla tables. Control: adequate.

**I-3 — Owner identity disclosure:**
No owner name, email, or address is shown on public routes. Contact relay form
is the default contact mechanism. Control: adequate.

**I-4 — workers.dev URL exposure:**
The `mishipass.carlosvelazquez354.workers.dev` URL is public and contains the
handle `carlosvelazquez354`. This is an accepted name-in-URL exception (per
project guardrails). Custom domain is the long-term fix; not in Beta scope.

**I-5 — Dashboard HTML exposure to unauthenticated users:**
`/dashboard` returns the same HTML to authenticated and unauthenticated users.
The page is the combined login + app shell SPA. No sensitive data is in the
server-rendered HTML. Risk: information about dashboard structure (form field
names, tab labels) is visible without auth. This is informational only; actual
cat data requires a valid session. Control: acceptable for Beta.

**I-6 — Internal PK via public gallery photo route (VULN-W-005):**
The public gallery serve route (`/media/cats/:publicId/photos/:photoId/public`)
exposed the sequential integer `cat_photos.id` as the `:photoId` URL parameter,
and `renderActiveProfile` rendered this ID into public HTML `<img>` src attributes.
The sequential nature allowed inference of total photo row count.
No cross-cat access was possible (query enforced `c.public_id AND cp.is_public = 1`).
Control (post-fix): `photo_public_id` (CSPRNG, 16-char Crockford Base32, UNIQUE)
replaces the integer PK on all public surfaces. Rate limiting added (60 req/min,
HMAC-hashed IP). Assessment: **ADEQUATE** (fixed 2026-07-05).

---

### Denial of Service

**D-1 — Public profile enumeration flood:**
D1-backed durable rate limiting on `/c/:publicId` lookup (60 requests per minute
per HMAC-hashed IP when secret is set). When secret is absent, this rate limit
is skipped. Mitigated by Cloudflare's infrastructure-level DDoS protection.
SIGHTING_IP_HMAC_SECRET must be set in production.

**D-2 — Sighting submission flood:**
5 submissions per 10 minutes per HMAC-hashed IP. Enforced by durableRateLimit.
Control: adequate.

**D-3 — Auth endpoint brute force:**
No explicit rate limiting on `/api/auth/login`. PBKDF2-SHA256 with 100,000
iterations slows per-attempt cost. Cloudflare infrastructure limits apply.
Explicit per-IP login rate limiting is a Tier-2 improvement (not a Beta blocker).

---

### Elevation of Privilege

**E-1 — Cross-owner access:**
Owner A cannot access owner B's cats. Owner scoping is enforced at the query
layer: `getCatForOwner` filters by both `public_id` AND `owner_id`. Dashboard
sub-routes all call `resolveSession` and pass `ctx.ownerId` to the repository.
Result when cat not found: 404 (not disclosing whether cat exists for another
owner). Control: adequate.

**E-2 — Sighting viewer accessing cartilla:**
No privilege path from sighting reporter to cartilla data. Sighting form has
no auth context. Cartilla routes require owner session. Control: adequate.

---

## 4.2 Enumeration resistance

- Two random Base32 segments = ~40 bits = ~10^12 combinations.
- HMAC-hashed IP rate limiting on public lookup (when secret is set).
- No timing oracle on public lookup (D1 query returns null; handler returns 404).

Assessment: adequate for Beta. Further hardening (adding more random bits) is
a Tier-3 V2 item.

---

## 4.3 Secrets management

| Secret | Method | Status |
|---|---|---|
| PUBLIC_BASE_URL | wrangler secret or .dev.vars (local) | REQUIRED; confirmed in prod |
| SIGHTING_IP_HMAC_SECRET | wrangler secret | REQUIRED for full rate limiting; fails closed on sighting submit when absent; profile lookup rate limit skips when absent |
| LOGTO_ENDPOINT, LOGTO_APP_ID, LOGTO_CLIENT_SECRET, LOGTO_REDIRECT_URI | wrangler secret | Optional (Logto auth disabled if absent) |
| LOGTO_GOOGLE_CONNECTOR_TARGET, LOGTO_APPLE_CONNECTOR_TARGET | wrangler secret | Optional |
| THE_CAT_API_KEY | wrangler secret | Optional |

`.gitignore` correctly excludes `.dev.vars`, `.env`, `.env.*`.
No secrets found committed in working tree or git history (grep scan performed).

**SIGHTING_IP_HMAC_SECRET must be verified set in production.** Flagged as
Tier-1-blocked-on-secret.

---

## 4.4 Supply chain

- Production runtime dependency: `qrcode-generator@^2.0.4` — no known
  vulnerabilities.
- All other dependencies are devDependencies. All known vulns are in the
  allowlist (`.audit-known-issues.json`).
- Dependabot monitors npm (apps/web, apps/worker) and pip (tools/python) weekly.
- CI gate blocks on new high/critical findings outside the allowlist.

---

## 4.5 Privacy posture

- No raw IPs stored (HMAC-SHA256 hashing).
- No owner legal identity or address on public routes.
- No nearby-user pings. No location tracking.
- workers.dev URL exposes handle: accepted exception (constitution §guardrails).
- Custom domain remains the long-term name-in-URL fix.

---

## 4.6 NIST CSF 2.0 and CISA Secure by Design mapping

| NIST CSF 2.0 Function | Control | Gap |
|---|---|---|
| Govern | Constitution v1.0, decision-log.md, CLAUDE.md | Incident response plan not formalized |
| Identify | Dependabot, CI audit gate, asset inventory | Python tooling inventory incomplete (no source yet) |
| Protect | Type-safe Worker, no internal IDs, HMAC IP hash, magic-byte validation, rate limiting, PBKDF2 | Login rate limiting absent; SIGHTING_IP_HMAC_SECRET must be set in prod |
| Detect | CI typecheck + tests + audit gate, Dependabot weekly | No runtime anomaly detection |
| Respond | Manual review per CI failures | No formalized incident response for Beta |
| Recover | D1+R2 on Cloudflare infra; migrations in version control | No automated recovery runbook |

| CISA Secure by Design Goal | Status |
|---|---|
| 1 — MFA | Not implemented (out of V1 scope) |
| 2 — No default passwords | Met (no hardcoded or default credentials) |
| 3 — Reduce vulnerability classes | Met via TypeScript type safety, no SQL interpolation, HMAC, allowlists |
| 4 — Patch installation | Partial (known vulns deferred; all are devDeps; Dependabot monitors) |
| 5 — Vulnerability disclosure policy | Not published (Beta) |
| 6 — Accurate/timely CVEs | N/A (not a software vendor) |
| 7 — Intrusion evidence | Not implemented (Beta) |

Residual gaps are Beta-accepted and recorded in decision-log.md.
