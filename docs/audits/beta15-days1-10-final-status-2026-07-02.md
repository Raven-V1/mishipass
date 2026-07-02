# MishiPass Beta 1.5 — Days 1–10 Final Status Audit

Date: 2026-07-02
Auditor: Kiro
Branch: main (commit 1ca9b0e)

## Status Table

| # | Feature | Status | Route/File | Notes |
|---|---|---|---|---|
| 1 | Owner auth | COMPLETE | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | PBKDF2-SHA256, HttpOnly session cookies |
| 2 | Cat registration | COMPLETE | `POST /api/cats`, dashboard form | Breed selector, color swatches, expanded fields |
| 3 | Public ID generation | COMPLETE | `@mishipass/shared-validation` | Crockford Base32, ~40 bits, UNIQUE+retry |
| 4 | QR URL generation | COMPLETE | `/dashboard/cats/:id/qr`, `utils/qr.ts` | Inline SVG, compact collar-tag print |
| 5 | Active Profile public mode | COMPLETE | `GET /c/:publicId` (mode=active) | Name, country, photo, safe details |
| 6 | Missing Alert mode | COMPLETE | `GET /c/:publicId` (mode=missing) | City, area, reward, sighting link |
| 7 | Sighting report form | COMPLETE | `GET/POST /c/:publicId/sighting` | Text + photo, rate-limited, HMAC IP |
| 8 | Privacy/contact settings | COMPLETE | `/api/cats/:id/contact` | Relay default, centralized dashboard tab |
| 9 | Optional reward behavior | COMPLETE | `reward_visible` in missing_alerts | Hidden by default, owner opt-in |
| 10 | WhatsApp-ready missing card | COMPLETE | `/dashboard/cats/:id/missing-card` | wa.me share link, preview text |
| 11 | Public alert link | COMPLETE | `/c/:publicId` in missing mode | Direct QR scan shows alert |
| 12 | Recovery Board opt-in | COMPLETE | `POST /api/cats/:id/recovery-board` | Owner toggles `recovery_board_opt_in` |
| 13 | Recovery Board city filter | COMPLETE | `GET /recovery-board?city=X` | Query param filter |
| 14 | Recovery Board alert-age filter | COMPLETE | `GET /recovery-board?ageDays=N` | 1-365 day filter |
| 15 | Vet Visit mode | COMPLETE | `/api/cats/:id/vet-visit/start`, public form | Mode-gated, 24h expiry |
| 16 | Save & Finish Visit auto-return | COMPLETE | `POST /api/cats/:id/vet-visit/finish` | Returns cat to active |
| 17 | Digital cartilla | COMPLETE | `/dashboard/cats/:id/cartilla`, `/api/cats/:id/cartilla` | Owner-only page + API |
| 18 | Vet visit records | COMPLETE | `POST /api/cats/:id/cartilla` (via vet-visit/finish) | Stored in vet_visits table |
| 19 | Vaccine records | COMPLETE | `POST /api/cats/:id/vaccines` | Owner-only CRUD |
| 20 | Medication Record (docs-only) | COMPLETE | `POST /api/cats/:id/medications` | No reminders/dosage/interactions |
| 21 | Vaccine sticker photos | COMPLETE | `POST /api/cats/:id/vaccines/:vId/sticker-photo` | R2 upload, owner-only serve |
| 22 | Registered country badge | COMPLETE | Public profile + dashboard cards | Flag emoji + code |
| 23 | No public medical/cartilla exposure | COMPLETE | All cartilla routes require auth | Public pages filtered by mode |
| 24 | Public pages show mode-appropriate info | COMPLETE | `handlePublicProfile` in cats.ts | Mode-switch renders per mode |
| 25 | Dependabot setup | COMPLETE | `.github/dependabot.yml` | Weekly npm monitoring |
| 26 | Security model docs | COMPLETE | `docs/security-model.md` | Updated for all Day 1-10 controls |
| 27 | README/report/demo-flow | COMPLETE | `README.md`, `docs/demo-flow.md`, `docs/beta-1.5-report.md` | Reflects actual state |

## Google/Apple Auth

- **Google:** NOT ENABLED. Button is `aria-disabled="true"` with "visual only" label.
- **Apple:** NOT ENABLED. Same as Google.
- No OAuth routes, callbacks, or secrets exist in the codebase.
- No fake redirect or fake success behavior.
- docs/security-model.md does not claim social login works.

## Conclusion

All 27 Days 1–10 checklist items are COMPLETE at the functional level.
Visual/design polish is pending Codex/Zhanerke review but does not block
functional completeness.
