# MishiPass Beta 1.5

MishiPass is a privacy-first dynamic QR passport and recovery system for cats.

Each cat gets one permanent QR code. The owner selects the active mode; the same
physical tag behaves differently depending on what the cat needs. The QR URL is
static — the Cloudflare Worker reads the cat's current mode from D1 and returns
the appropriate public interface.

MishiPass is not an official passport, government document, AI vet, medication
manager, social network, or marketplace.

## Working now

- Owner registration, login, logout (PBKDF2-SHA256, HttpOnly session cookies)
- Google login via Logto OIDC (Authorization Code + PKCE, server-side)
- Owner dashboard (Worker-rendered HTML, same-origin)
- Cat registration with country selection
- Visual breed/color registration assist with TheCatAPI fallback
- Expanded cat profile fields (breed, color, weight, chip number, notes)
- Public cat ID generation (Crockford Base32, ~40 bits entropy)
- Real QR SVG/image generation
- Printable QR card
- Active Profile public page
- Missing Alert mode with mode switching
- For Adoption mode with transfer request flow
- WhatsApp-ready missing card with public alert link
- Recovery Board with city and alert-age filters
- Vet Visit mode with temporary 24-hour session
- Save & Finish Visit can record vet visit, vaccines, vaccine sticker photo, and Medication Record before auto-return to Active Profile
- Owner-only Digital Cartilla for vet visits, vaccines, Medication Record, and sticker photos
- Cat photo gallery (multiple photos per cat, owner-only gallery, selectable profile photo)
- Guest and owner language support for English, Spanish, and Kazakh
- Public sighting report form with text and optional photo
- Owner sighting report inbox
- Owner-only sighting photo viewing
- Owner-scoped dashboard pages (non-owners cannot view other owners' cats)
- Contact/privacy settings with relay default
- R2 cat profile photo upload and display
- R2 sighting photo upload and storage
- MIME allowlist, size limit, and magic-byte validation for image uploads
- HMAC-SHA256 reporter IP hashing (with SIGHTING_IP_HMAC_SECRET)
- D1-backed durable rate limiting for sighting submit and public cat lookup
- No raw IP storage
- No raw R2 key exposure

## Intentionally not enabled

- Apple login — button is visible as a design placeholder only; Logto Apple connector is not configured

## Deferred Version 1 optional items

- Optional modes (Travel, Memorial, Celebration)

## How the QR works

The QR encodes a static URL: `https://<worker>/c/MP-XX-XXXX-XXXX`. When scanned,
the Cloudflare Worker looks up the cat's `current_mode` in D1 and renders the
appropriate HTML page. The owner changes the mode from the dashboard; the printed
QR never changes.

## Privacy

- Public pages use MishiPass public IDs, not internal database IDs.
- Owner contact visibility is owner-controlled; default is relay mode.
- Medical and cartilla records are private, owner-dashboard only.
- Medication Record entries are documentation-only records. MishiPass does not
  provide dosage recommendations, interaction checks, reminders, refill tracking,
  treatment plans, or medical advice.
- Recovery Board is visible for cats in Missing Alert mode and only shows public-safe fields.
- No owner full name, email, or exact address is shown publicly.
- Reporter IP addresses are hashed with HMAC-SHA256 using a dedicated secret
  before storage. No raw IP is ever persisted.
- Cat profile photos are served through Worker media routes, not raw R2 URLs.
- Sighting photos are owner-only; raw R2 keys are never exposed to clients.

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers (TypeScript) |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| Auth | PBKDF2-SHA256 + opaque session tokens (HttpOnly cookies) |
| CI | GitHub Actions |
| Dependency monitoring | Dependabot |
| Optional breed assist | TheCatAPI (free tier, not required) |

## Prerequisites

- Node.js 18+
- npm 9+
- Wrangler CLI (`npm install -g wrangler` or use `npx wrangler`)
- A Cloudflare account with Workers, D1, and R2 enabled

## Local development

```bash
cd apps/worker
cp .dev.vars.example .dev.vars   # fill in local secrets
npx wrangler d1 execute mishipass --local --file=migrations/0001_initial.sql
npx wrangler d1 execute mishipass --local --file=migrations/0002_cat_profile_fields.sql
npx wrangler d1 execute mishipass --local --file=migrations/0003_rate_limits.sql
npx wrangler d1 execute mishipass --local --file=migrations/0004_soft_delete_cats.sql
npx wrangler d1 execute mishipass --local --file=migrations/0005_owner_settings.sql
npx wrangler d1 execute mishipass --local --file=migrations/0006_owner_identities.sql
npx wrangler d1 execute mishipass --local --file=migrations/0007_cat_photos.sql
npx wrangler d1 execute mishipass --local --file=migrations/0008_add_cat_next_vaccine_date.sql
npx wrangler d1 execute mishipass --local --file=migrations/0009_add_cat_photo_visibility.sql
npx wrangler d1 execute mishipass --local --file=migrations/0010_add_cat_microchip.sql
npx wrangler d1 execute mishipass --local --file=migrations/0011_transfer_units.sql
npx wrangler d1 execute mishipass --local --file=migrations/0012_sighting_lat_lng.sql
npx wrangler dev
```

## Running tests

```bash
npm test --workspace=mishipass-worker        # 279 tests (29 test files)
npm test --workspace=@mishipass/shared-validation  # 43 tests
npx tsc --noEmit --project apps/worker/tsconfig.json
```

## Required environment variables / secrets

| Variable | Purpose | Where set |
|---|---|---|
| `SIGHTING_IP_HMAC_SECRET` | HMAC key for reporter IP hashing | `wrangler secret` |
| `THE_CAT_API_KEY` | Optional — breed image CDN assist | `wrangler secret` |
| `PUBLIC_BASE_URL` | Worker's canonical public URL | `wrangler.toml` env |

### Optional — Logto OIDC (Google / Apple login)

Five secrets must be set for Google login to activate. Apple additionally
requires `LOGTO_APPLE_CONNECTOR_TARGET`. Buttons render as disabled when
provider secrets are absent.

| Variable | Purpose | Where set |
|---|---|---|
| `LOGTO_ENDPOINT` | Logto tenant URL (e.g. `https://tenant.logto.app`) | `wrangler secret` |
| `LOGTO_APP_ID` | Logto application client ID | `wrangler secret` |
| `LOGTO_CLIENT_SECRET` | Logto application client secret | `wrangler secret` |
| `LOGTO_REDIRECT_URI` | Absolute callback URL registered in Logto | `wrangler secret` |
| `LOGTO_GOOGLE_CONNECTOR_TARGET` | Logto connector target for Google (default: `"google"`) | `wrangler secret` |
| `LOGTO_APPLE_CONNECTOR_TARGET` | Logto connector target for Apple (default: `"apple"`) | `wrangler secret` |

Google requires a Logto Google connector configured with Google Cloud OAuth 2.0
credentials. Apple requires a Logto Apple connector and an Apple Developer
Program account. Provider credentials are never committed to this repository.

**For judges:** Google login is active on the production deployment. You can
test it directly at the production URL. Email/password registration also works
without any external service. Apple login is not active.

## Production deployment

```bash
cd apps/worker
npx wrangler deploy
```

Production URL: `https://mishipass.carlosvelazquez354.workers.dev`

## Judge testing instructions

1. **Visit the production URL:** https://mishipass.carlosvelazquez354.workers.dev
2. **Log in:** Use Google login (active) or register a new account with email/password.
3. **Reach a live demo cat:** After login, the dashboard shows registered cats. If none exist, register a new cat (any name, any country). The system generates a public ID and QR code.
4. **Scan or open the QR URL:** Click the QR card or open `/c/MP-XX-XXXX-XXXX` directly to see the Active Profile.
5. **Switch modes:** From the dashboard, switch the cat to Missing Alert or start a Vet Visit to see different experiences from the same URL.
6. **Vet Visit mode without a real vet account:** Click "Start Vet Visit" from the dashboard. Then open the same public QR URL — it shows the vet entry form. Anyone can fill it in (this is a documented Beta limitation; dedicated vet accounts are deferred). Click "Save & Finish Visit" to return the cat to Active Profile automatically.
7. **Recovery Board:** Visit `/recovery-board` to see any cats currently in Missing Alert mode.

## Commit attribution correction - 2026-07-05

Two commits on main were recorded under an incorrect automated committer identity (a bot account and a Co-Authored-By trailer) and were rewritten to the correct authors: Raven-V1 for tooling/logic, Zhanerke Askerbekova for design. Pre-rewrite state preserved in backup/pre-attribution-rewrite-2026-07-05. Collaborators must re-sync main (and dev) after the force-push.

## Submission notes

- Do not include `node_modules/`, `dist/`, or `.wrangler/` in any submission package.
- No personal API keys are committed. TheCatAPI key is optional and free-tier only.
- The repo is public at: https://github.com/Raven-V1/mishipass
