# MishiPass — D1 Schema Specification

**Status:** DRAFT v0.2 — incorporates §10 council review (ChatGPT alignment + DeepSeek security). Still pending the Project Owner's final lock.
**Date:** June 25, 2026 (Day 2, coding period)
**Target path:** `docs/feature-specs/d1-schema.md`
**Authored by:** Claude (Architect), for review by **Project Owner** (Project Owner & Orchestrator) and **Zhanerke Askerbekova** (Design Authority).
**Depends on:** owner auth method (session-based recommendation, cleared by the loop). The PBKDF2 iteration constant is set by benchmark, not in this schema.

---

## 1. Design principles (from locked §7, §15)

1. **Internal PK is never serialized publicly.** Every table uses an `INTEGER PRIMARY KEY` (`id`) that never appears in any client response. The only external identifier for a cat is `public_id`.
2. **`public_id` is random and uniqueness-constrained.** Format `MP-<CC>-<S1>-<S2>` (§4). A `UNIQUE` constraint guarantees uniqueness; the Worker retries generation on constraint violation.
3. **Cartilla data is private.** `vet_visits`, `vaccines`, `medications` are reachable only through an authenticated owner session and are never joined into a public mode response.
4. **Medication entries are documentation only** (locked §4) — records, never advice/dosage/reminder/interaction, never on any public surface.
5. **Mode lives on the cat.** `cats.current_mode` is the single source of truth the Worker reads on a scan. The QR is static; the response varies by this column.
6. **Owner-controlled visibility.** Contact visibility, reward visibility, and Recovery Board publishing are explicit opt-in columns defaulting to private.

> **Auth-crypto note (corrected):** PBKDF2-SHA256 via Web Crypto is natively supported with no documented API iteration cap. The iteration count will be selected by benchmarking on the deployment tier and recorded in the security model. If the chosen count is lower than the project target, a server-side pepper stored as a Worker secret may be added as defense-in-depth.

---

## 2. Tables

> SQLite/D1 types. `TEXT` timestamps are ISO-8601 UTC.

### 2.1 `owners`
`id` INTEGER PK · `email` TEXT UNIQUE NOT NULL (store lowercased) · `password_hash` TEXT NOT NULL (PBKDF2-derived, salt+params encoded) · `created_at` · `updated_at`.

### 2.2 `sessions`
`id` INTEGER PK · `token_hash` TEXT UNIQUE NOT NULL (SHA-256 of opaque token; raw token only in the cookie) · `owner_id` FK→`owners(id)` ON DELETE CASCADE · `created_at` · `expires_at`.

### 2.3 `cats`
`id` INTEGER PK · `public_id` TEXT UNIQUE NOT NULL (`MP-<CC>-<S1>-<S2>`) · `owner_id` FK→`owners(id)` ON DELETE CASCADE · `name` TEXT NOT NULL · `country_code` TEXT NOT NULL (cosmetic, §7) · `photo_r2_key` TEXT · `current_mode` TEXT NOT NULL DEFAULT 'active' (enum: active, missing, vet, travel, adoption, memorial, celebration) · `created_at` · `updated_at`.

### 2.4 `contact_settings` (1:1 with cat)
`id` PK · `cat_id` UNIQUE FK→`cats(id)` ON DELETE CASCADE · `contact_mode` TEXT NOT NULL DEFAULT 'relay' (relay|phone|none) · `public_phone` TEXT (served only if mode='phone').
> Owner full name / exact address are **not columns** here (§7).

### 2.5 `missing_alerts` (1:1 with cat)
`id` PK · `cat_id` UNIQUE FK→`cats(id)` ON DELETE CASCADE · `last_seen_at` · `city` · `area` · `reward_amount` TEXT · `reward_visible` INTEGER NOT NULL DEFAULT 0 · `recovery_board_opt_in` INTEGER NOT NULL DEFAULT 0 · `activated_at`.

### 2.6 `sighting_reports` (public, unauthenticated input)
`id` PK · `cat_id` FK→`cats(id)` ON DELETE CASCADE · `message` TEXT (length-capped) · `photo_r2_key` TEXT · `location_text` TEXT (free text; no auto geolocation, §7) · `reporter_ip_hash` TEXT (**HMAC-SHA256 with a dedicated env secret — distinct from the password pepper**; raw IP never stored) · `created_at`.

### 2.7 `vet_sessions` (temporary vet access, §7)
`id` PK · `cat_id` FK→`cats(id)` ON DELETE CASCADE · `token_hash` TEXT UNIQUE (**if a session token is issued, store only its SHA-256 hash, mirroring 2.2; if access is purely mode-gated, omit and document the §7 known limitation**) · `activated_at` NOT NULL · `expires_at` NOT NULL (**§23 OPEN ITEM** — 24h from activation OR immediate on Save & Finish, whichever first; confirm before building) · `status` TEXT NOT NULL DEFAULT 'active' (active|finished|expired).

### 2.8 Cartilla — private, owner-dashboard only (§4)
**`vet_visits`**: `id`, `cat_id` FK, `visit_date`, `vet_or_clinic_name`, `notes`, `created_at`.
**`vaccines`**: `id`, `cat_id` FK, `vaccine_name`, `date_given`, `sticker_photo_r2_key`, `created_at`.
**`medications`** *(documentation only, §4)*: `id`, `cat_id` FK, `medication_name`, `dose`, `duration`, `start_date`, `prescriber_name`, `notes`, `created_at`.
> Encoded by absence: no `reminder_*`, `next_dose`, `interaction_*`, or `refill_*` columns. None may be added without a logged re-scope (§4).

---

## 3. Constraints & indexes
- `UNIQUE(cats.public_id)` enables the retry-on-collision path. `UNIQUE(owners.email)`, `UNIQUE(sessions.token_hash)`.
- Indexes: `cats(public_id)` (hot `/c/:id` lookup), `sessions(token_hash)`, `missing_alerts(city)`, `sighting_reports(cat_id, created_at)`.
- All child tables `ON DELETE CASCADE` so deleting a cat/owner leaves no orphaned private data.

## 4. ID-format contract (confirmed)
Worker-generated live IDs MUST pass the Python tooling's canonical validator:
```
^MP-[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$
```
Crockford Base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, I/L/O/U excluded). Ranges `P-T` then `V-Z` exclude U (re-verified). Uppercase canonical only. Python defines/validates; TypeScript generates to the same contract.

## 5. Access-layer rules (from council review — maps to §15 DoD)
1. **No `SELECT *` on any client-facing path.** Every public/owner query uses an explicit column allow-list.
2. **Public mode responses** return only whitelisted public columns (`public_id`, `name`, `current_mode`, mode-appropriate fields). Cartilla/medication columns are never in a public query.
3. **Ownership enforced in the WHERE clause** for all cartilla access, e.g. `... WHERE cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)` — cannot be bypassed by guessing a cat.
4. Internal `id` is never placed in a response body or URL.

## 6. Input & upload validation (from council review — maps to §7)
- **Parameterized queries everywhere** via `env.DB.prepare(...).bind(...)`. No string concatenation.
- **Sighting uploads:** MIME allow-list (`image/jpeg`, `image/png`, `image/webp`) **+ magic-byte content check**, size cap (≈5 MB) enforced before processing, filename sanitized (strip path separators, ≤255 chars).
- **Rate limiting:** per-`reporter_ip_hash` counter (e.g. 5 submissions/min) for the unauthenticated sighting path.

## 7. Enumeration defense (from council review — maps to §7)
Entropy (~40 bits) + per-IP rate limiting on `/c/:id`, **plus** a global rate limit and **uniform response/timing for hit vs. miss** so existence isn't leaked. Country code contributes no uniqueness. Proof-of-work is **out of scope for Beta** (over-engineering for the threat model).

## 8. Migrations
`apps/worker/migrations/0001_initial.sql` creates all tables and uses **normal D1 foreign-key constraints; D1 enforces foreign keys by default.** All schema changes ship as numbered migration files.

## 9. Open questions for final lock
1. **Vet session:** token-based (hash it) vs. purely mode-gated — decide and reflect in 2.7.
2. **Vet session expiry** (§23) — confirm the `expires_at` rule.
3. **Field lengths** for free-text (`message`, `notes`, `name`) for validation.
4. **R2 key strategy** so object keys leak neither internal IDs nor owner identity.

---

*Draft for review. Finalize only after the Project Owner's decision, then log in `docs/decision-log.md` and commit.*
