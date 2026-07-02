# MishiPass Beta 1.5 — Days 1–10 Final Status (Logto Update)

Date: 2026-07-02
Branch: `auth/logto-google-apple`
Auditor: Claude Code

Updates the Kiro final-status audit (`beta15-days1-10-final-status-2026-07-02.md`)
with the Logto/OIDC auth additions and mockup asset commits from this branch.

## Test counts

| Suite | Tests | Result |
|---|---|---|
| `mishipass-worker` | 243 | PASS |
| `@mishipass/shared-validation` | 43 | PASS |
| **Total** | **286** | **PASS** |

TypeScript typecheck: clean.

## Updated status table

| # | Feature | Status | Route/File | Notes |
|---|---|---|---|---|
| 1 | Owner auth (email/password) | COMPLETE | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | PBKDF2-SHA256, HttpOnly session cookies |
| 1a | Google login via Logto | CODE COMPLETE / CONFIG PENDING | `GET /api/auth/logto/google` | OIDC Authorization Code + PKCE S256; provider secrets not set in production |
| 1b | Apple login via Logto | CODE COMPLETE / CONFIG PENDING | `GET /api/auth/logto/apple` | Same flow as Google; LOGTO_APPLE_CONNECTOR_TARGET must be set |
| 1c | OIDC callback | CODE COMPLETE / CONFIG PENDING | `GET /api/auth/logto/callback` | RS256 JWT validation, owner lookup/creation, MishiPass session |
| 2 | Cat registration | COMPLETE | `POST /api/cats`, dashboard form | |
| 3 | Public ID generation | COMPLETE | `@mishipass/shared-validation` | |
| 4 | QR URL generation | COMPLETE | `/dashboard/cats/:id/qr` | |
| 5 | Active Profile public mode | COMPLETE | `GET /c/:publicId` (mode=active) | |
| 6 | Missing Alert mode | COMPLETE | `GET /c/:publicId` (mode=missing) | |
| 7 | Sighting report form | COMPLETE | `GET/POST /c/:publicId/sighting` | |
| 8 | Privacy/contact settings | COMPLETE | `/api/cats/:id/contact` | |
| 9 | Optional reward behavior | COMPLETE | `reward_visible` in missing_alerts | |
| 10 | WhatsApp-ready missing card | COMPLETE | `/dashboard/cats/:id/missing-card` | |
| 11 | Public alert link | COMPLETE | `/c/:publicId` in missing mode | |
| 12 | Recovery Board (Missing-mode default) | COMPLETE | `GET /recovery-board` | |
| 13 | Recovery Board city filter | COMPLETE | `?city=X` | |
| 14 | Recovery Board alert-age filter | COMPLETE | `?ageDays=N` | |
| 15 | Vet Visit mode | COMPLETE | `/api/cats/:id/vet-visit/start` | |
| 16 | Save & Finish auto-return to Active | COMPLETE | `POST /api/cats/:id/vet-visit/finish` | |
| 17 | Digital cartilla | COMPLETE | `/dashboard/cats/:id/cartilla` | |
| 18 | Vet visit records | COMPLETE | Via vet-visit/finish | |
| 19 | Vaccine records | COMPLETE | `POST /api/cats/:id/vaccines` | |
| 20 | Medication Record (docs-only) | COMPLETE | `POST /api/cats/:id/medications` | No reminders/dosage/interactions |
| 21 | Vaccine sticker photos | COMPLETE | `POST /api/cats/:id/vaccines/:vId/sticker-photo` | |
| 22 | Registered country badge | COMPLETE | Public profile + dashboard cards | |
| 23 | No public medical/cartilla exposure | COMPLETE | All cartilla routes require auth | |
| 24 | Public pages show mode-appropriate info | COMPLETE | `handlePublicProfile` | |
| 25 | Dependabot setup | COMPLETE | `.github/dependabot.yml` | |
| 26 | Security model docs | COMPLETE | `docs/security-model.md` | Updated with OIDC section |
| 27 | README/report/demo-flow | COMPLETE | Updated with Logto env vars | |
| 28 | Real logo/mockup assets tracked | COMPLETE | `assets/mockups/` | missing_alert.jpeg and vet_portal.jpeg now committed |
| 29 | Zhanerke design pages | PENDING | `docs/design/zhanerke-page-inventory.md` | 17+ pages still needing design review or Project Owner "temporary functional UI" marking |
| 30 | Carlos manual retest | PENDING | — | Visual acceptance checklist from PR #66 not confirmed documented |
| 31 | Aikido security scan | NOT STARTED | — | Scheduled; not started on this branch per task instructions |

## What this branch adds vs. prior closure audit

1. `owner_identities` D1 table and repository (migration `0006`).
2. PKCE utilities (`utils/pkce.ts`).
3. Logto OIDC route handlers (`routes/logto.ts`): Google, Apple, callback.
4. 24 new tests for Logto routes and `verifyLogtoIdToken`.
5. Dashboard social buttons are now real anchor links when env is configured;
   disabled buttons with honest copy when not.
6. `Env` interface expanded with 6 optional Logto secrets.
7. Security model section 10 added (OIDC model).
8. Decision log entry for Logto auth decision.
9. `assets/mockups/missing_alert.jpeg` and `vet_portal.jpeg` committed.

## Unresolved items carried from prior audit

- D1 migration ledger mismatch (WARN): Wrangler reports migrations pending even
  though remote tables exist. Not changed by this branch.
- Branch protection does not enforce required CI status checks.
- `apps/worker/src/utils/brandAssets.ts` remains untracked — it belongs to the
  `visual/pass1-brand-shell` stash (Codex design scope, not auth scope).
  The stash at `stash@{0}` also modifies `dashboard.ts`; applying it after
  this auth branch merges will require conflict resolution.

## Env vars required for production Google/Apple login

```
wrangler secret put LOGTO_ENDPOINT
wrangler secret put LOGTO_APP_ID
wrangler secret put LOGTO_CLIENT_SECRET
wrangler secret put LOGTO_REDIRECT_URI
wrangler secret put LOGTO_GOOGLE_CONNECTOR_TARGET   # default: google
wrangler secret put LOGTO_APPLE_CONNECTOR_TARGET    # default: apple
```

Also required before this migration lands in production:
```
wrangler d1 execute mishipass --remote --file=apps/worker/migrations/0006_owner_identities.sql
```
