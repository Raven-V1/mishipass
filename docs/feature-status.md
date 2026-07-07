# MishiPass Beta 1.5 — Feature Status Audit

Audit date: 2026-07-03
Auditor: Kiro (Phase 0, autonomous task set)

## Constitution Section 3 Must-Build Checklist

| Feature | Status | Notes |
|---|---|---|
| Owner auth (session-based, PBKDF2) | verified | Login, register, logout, session middleware all functional. 279 Worker tests passing (43 shared-validation). |
| Cat registration | verified | POST /api/cats creates cat with public ID, country, name, profile fields. |
| Public ID generation (MP-XX-XXXX-XXXX) | verified | CSPRNG Crockford Base32, UNIQUE constraint + retry. Shared-validation 43 tests. |
| QR URL (/c/:publicId) | verified | Static QR resolves to mode-routed page. QR SVG generation present. |
| Active Profile public page | verified | Public profile renders name, country badge, photo, contact preference. |
| Missing Alert mode and switch flow | verified | Switch to missing, missing alert upsert, public missing page with sighting form. |
| Sighting report form (public) | verified | Unauthenticated form, photo upload, rate limiting, IP hashing. |
| Privacy and contact settings | verified | Owner controls contact_mode (relay/phone/none), public_phone. |
| Reward setting | verified | reward_amount stored, reward_visible flag respected. |
| WhatsApp-ready missing card | verified | /dashboard/cats/:id/missing-card renders shareable card with WhatsApp link. |
| Public alert link | verified | /c/:publicId in missing mode shows public alert. |
| Recovery Board with city and age filters | verified | /recovery-board page with city filter, alert-age filter, opt-in control. |
| Vet Visit mode with temp session | verified | 24h expiry, mode-gated public form, Save & Finish returns to active. |
| Save & Finish Visit auto-return | verified | handleVetVisitFinish sets mode back to active, marks session finished. |
| Digital cartilla (vet visits) | verified | vet_visits table, cartilla page lists visits, detail page per visit. |
| Digital cartilla (vaccines) | verified | vaccines table, vaccine creation via vet form and owner API. |
| Digital cartilla (medications - documentation only) | verified | medications table, Medication Record label, no advice fields. |
| Vaccine sticker photos | verified | Upload via vet form, served through authenticated route. |
| Registered country badge | verified | Country badge on cat card and detail page. |
| Dependabot | verified | .github/dependabot.yml active, weekly npm + pip monitoring. |
| Security model doc | verified | docs/security-model.md comprehensive, updated to Beta 1.5. |
| README | verified | README reflects Beta 1.5 state. |
| Beta report | verified | docs/beta-1.4-report.md exists (covers historical state). |

## Confirmed UI/UX Bugs (Observed in Code Audit)

| Bug | Severity | Notes |
|---|---|---|
| Duplicate language selector | P1 | Both topbar (guest-language-select) and settings tab (language-select) present in authenticated dashboard view. |
| Hardcoded English stat labels | P1 | "Next vaccine", "Weight", "Age", "QR Status", "Pending", "Not set" in loadCats() not routed through i18n. |
| Phone frame on mobile login | P2 | .phone-shell has border + border-radius simulating a phone bezel. |
| No sighting report detail view | P2 | Reports listed but not openable; no individual detail route. |
| Vet weight not synced to cat profile | P2 | Weight in vet form saves to notes field but never updates cats.weight. |
| No vet form section selector | P2 | All sections (visit, vaccine, medication) shown simultaneously, no toggle. |
| Mode badge color not reflecting state | P2 | Mode badge always same styling regardless of active/missing/vet. |
| Text overflow in stat tiles | P2 | Four-tile stat row collides at narrow widths, no wrapping. |
| Login form on home page non-functional | P1 — FIXED | Fixed 2026-07-03 (toast null-guard). See docs/hotfix-login-report.md. |
| Missing "Back to Dashboard" on some pages | P2 | Some authenticated pages missing consistent back navigation. |

## Optional and Deferred Features

| Feature | Status | Notes |
|---|---|---|
| Photo gallery (multiple photos per cat) | built | Multi-photo gallery with profile selection, public/private toggle (photo_public_id), migration 0007-0013. |
| Travel mode | deferred | Optional mode, not in must-build. |
| For Adoption mode | built | Adoption profile, transfer request flow, i18n. Route wired, tested, deployed. |
| Memorial mode | deferred | Optional mode. |
| Celebration mode | deferred | Optional mode. |
| Push notifications | deferred-v2 | V2 item. |
| WhatsApp Business backend | deferred-v2 | V2 item. |
| Full vet accounts | deferred-v2 | V2 item. |
| Adoption marketplace | deferred-v2 | V2 item. |
