---
generated-at: 2026-07-02T00:00:00Z
audit-id: mishipass-security-audit-2026-07-02
---

# Relationship Analysis — Trust Boundaries and Data Flows

## 1. QR scan → Worker → D1 → mode routing → HTML/API response

**Flow:**
```
QR scan (unauthenticated)
  → GET /c/MP-XX-XXXX-XXXX
  → index.ts: optional HMAC-hash IP, checkDurableRateLimit (D1)
  → handlePublicProfile (routes/cats.ts)
  → D1: SELECT cat by public_id, JOIN contact_settings, missing_alerts
  → render mode-appropriate HTML
```

**Trust boundary:** Public internet → Worker. Worker is the sole trust boundary.
All input is untrusted.

**Verification:**
- Read-only D1 access: confirmed. No INSERT/UPDATE on the public profile path.
- Mode-appropriate output: each mode renders only mode-permitted fields.
  Cartilla, medications, vaccines, owner identity: never in scope.
- Contact relay: default is "relay" when no contact_settings row exists.
  Fallback is hard-coded in cats.ts (line ~160): `{ contact_mode: "relay", public_phone: null }`.
- Public ID only: no internal DB row id in any public response.
- HMAC rate limit: skips when SIGHTING_IP_HMAC_SECRET absent (degrades silently
  for profile lookup; sighting submit fails closed). Flagged as VULN-W-003.

**Finding:** PASS with noted degradation when secret absent.

---

## 2. Owner session → dashboard → D1/R2

**Flow:**
```
POST /api/auth/login (password → PBKDF2 verify → opaque token, HttpOnly cookie)
GET /dashboard (SPA shell — no session check, intentional — login form shown by default)
  → JS: GET /api/cats (credentials: same-origin)
  → Worker: resolveSession → D1 session lookup
  → handleListCats → SELECT cats WHERE owner_id = session.owner_id
```

**Trust boundary:** Authenticated owner session (HttpOnly cookie, opaque token).

**Owner scoping:**
- All `/api/cats/*` routes: resolveSession → 401 if no valid session.
- All `/dashboard/cats/:publicId/*` sub-routes: resolveSession → getCatForOwner
  (SELECT WHERE owner_id = ctx.ownerId AND public_id = :publicId) → 404 if not found.
- This pattern ensures owner A cannot access owner B's cats: the query returns
  nothing, and the handler returns 404 (not 403). This is the correct owner-scoped
  404 pattern as required by the constitution.
- `/dashboard` itself is the SPA login page — both authenticated and unauthenticated
  users receive the same static HTML shell; the JS client-side determines which
  view to render based on the `/api/cats` response status.

**R2 access:**
- Cat photos: served via `/media/cats/:publicId/photo` (no auth required — this
  is a public photo on the public profile).
- Vaccine sticker photos: served via `/media/cats/:publicId/vaccines/:vaccineId/sticker-photo`
  with owner auth check.
- Sighting photos: served via owner-authenticated route.
- No raw R2 URLs are ever returned to clients.

**Finding:** PASS. Owner scoping is correctly enforced on all authenticated routes.

---

## 3. Public sighting form (unauthenticated) → Worker → D1/R2

**Flow:**
```
GET /c/:publicId/sighting
  → render sighting form (public, no auth)
POST /c/:publicId/sighting
  → handleSightingSubmit
  → HMAC-hash reporter IP (fails closed if secret absent)
  → checkDurableRateLimit (D1) — 5 submissions per 10 min per hashed IP
  → validate file type/size/magic bytes
  → INSERT sighting_report (with hashed IP, no raw IP)
  → upload photo to R2 (if provided)
```

**Verification:**
- File type validation: MIME allowlist + magic byte check (confirmed in photos.ts).
- Size limits: enforced (3 MB for sightings).
- Rate limiting: D1-backed durable counter keyed by HMAC-hashed IP.
- No raw IP stored: only HMAC-SHA256(IP, secret) stored.
- Cat must be in "missing" mode for sighting form to be accessible (verified in
  the sighting form handler — returns 404 or error for non-missing cats).

**Finding:** PASS. Upload validation and rate limiting are correctly implemented.

---

## 4. Vet session → Worker → cartilla write

**Flow:**
```
Owner: POST /api/cats/:publicId/vet-visit/start (auth required)
  → insertVetSession (D1) — stores expires_at = now + 24h
  → updateCatMode to "vet"
Public vet: GET /c/:publicId (in vet mode)
  → render vet visit form (no auth — mode-gated)
Public vet: POST /api/cats/:publicId/vet-visit/finish (no auth)
  → handleVetVisitFinish
  → findLatestVetSession → check not expired
  → INSERT vet_visit, vaccines, medications into D1
  → update cat mode back to "active"
```

**Trust boundary:** Mode-gated (anyone with the QR can submit while in vet mode).

**Cartilla isolation:**
- handlePublicProfile never joins cartilla, vaccines, or medication tables.
- Vet visit form shows only the cat's name, country, photo, and session expiry.
- No existing cartilla history is shown on the public Vet Visit page.
- Medications entered via vet visit form are stored as documentation records only.

**Expiry:**
- 24h from activation OR Save & Finish, whichever first.
- finishVetSession sets status = "finished" and updates cat mode.
- Expired vet sessions: `findLatestVetSession` checks `expires_at > now`.

**Finding:** PASS. Known Beta limitation (no vet auth) is documented and accepted.

---

## 5. packages/shared/validation vs. apps/worker validation

`validateId` from `@mishipass/shared-validation` is used consistently in the
Worker. No inline duplication of the ID regex found. Tools in `tools/python` do
not yet exist (venv present, no source files), so Python/Worker ID format parity
cannot be verified at this time. Log as deferred pending Python tooling
implementation.

**Finding:** No drift found. Python tooling parity deferred.

---

## 6. CORS and SameSite posture

- No CORS headers are set on the Worker: the Worker currently only serves
  same-origin requests (dashboard at workers.dev, API at workers.dev).
  The deferred apps/web React app would introduce cross-origin concerns — this
  is a Tier-2 item (architectural change) and is not addressed in this audit.
- Session cookie: HttpOnly, SameSite behavior depends on deployment context.
  Custom domain adoption (planned, not in Beta scope) is the long-term fix.

**Finding:** No current CORS issues. Cross-origin concerns deferred to Tier-2.

---

## 7. Cross-boundary redundancies

None found. The Worker is the single production request handler. There is no
duplicate routing, no duplicate validation between components that are both
active in the production path.
