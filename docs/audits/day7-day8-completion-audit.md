# MishiPass Day 7/8 Completion Audit

Date: 2026-07-01
Branch: `fix/day7-day8-audit-cartilla-settings`

## Baseline

- Local branch started from `dev`.
- `origin/dev` and `origin/main` are aligned at `ace4ff5` (`Merge pull request #60 from Raven-V1/dev`).
- Working tree was clean before this branch was created.
- Open PRs are Dependabot-only PRs #54-#58 and are intentionally out of scope.
- Existing migrations: `0001_initial.sql`, `0002_cat_profile_fields.sql`, `0003_rate_limits.sql`, `0004_soft_delete_cats.sql`.

## Audit Findings

### Constitution and Security Model

- Production request path remains TypeScript Cloudflare Worker + D1 + R2. No Python production path found.
- Public QR pages use Worker-rendered HTML and route by D1 `current_mode`.
- Medical/cartilla tables are private by design in repository code and are not joined into public `/c/:publicId` responses.
- Medication schema remains documentation-only: no reminders, refill tracking, dosage calculation, interaction checks, or advice fields.
- Vet Visit is mode-gated, 24-hour limited, and Save & Finish returns the cat to Active Profile.

### GitHub and Branch State

- `dev` and `main` are in sync at audit start.
- Dependabot PRs are separate dependency work and were not merged.
- No local uncommitted work existed at audit start.

### Migration State

- Cartilla tables already exist in `0001_initial.sql`.
- Expanded cat profile fields exist in `0002_cat_profile_fields.sql`.
- Soft delete exists in `0004_soft_delete_cats.sql`.
- Missing schema for owner language preference.

### Day 7 Actual Behavior

- Vet Visit routes exist:
  - `POST /api/cats/:publicId/vet-visit/start`
  - `POST /api/cats/:publicId/vet-visit/cancel`
  - `POST /api/cats/:publicId/vet-visit/finish`
- Owner cat detail page lists vet visits, but entries are not clickable detail views.
- Dashboard keeps Vet Visit controls and hides Sightings unless the cat is Missing.

### Day 8 Actual Behavior

- `vet_visits`, `vaccines`, and `medications` repository functions exist.
- Owner-only Digital Cartilla UI routes are missing.
- Vaccine sticker/photo upload route and media route are missing.
- Medication records are not exposed publicly, but there is no owner UI/API to add them.

### Dashboard and Settings Actual Behavior

- Cat photo upload route stores R2 keys privately and public media route serves `/media/cats/:publicId/photo`.
- `/api/cats` does not return a safe photo URL or photo-present flag, so dashboard cards cannot render uploaded photos.
- Dashboard cat cards render as a vertical list, not a board/grid.
- Owner language settings are absent.
- Breed and color inputs are manual text fields only.
- No TheCatAPI proxy exists.

### Docs vs Behavior

- `docs/security-model.md` correctly states privacy invariants.
- `docs/sitemap.md` lists Digital Cartilla, WhatsApp, and Recovery Board as planned IA; it does not prove completion.
- Day 8 Digital Cartilla claims should remain bounded until owner UI and routes are implemented.

## Implementation Checklist

- [x] Write audit artifact and bounded checklist.
- [x] Add safe dashboard photo rendering and board/grid layout.
- [x] Add owner language preference storage, routes, dashboard selector, and tests.
- [x] Add optional TheCatAPI proxy and breed/color assisted dashboard controls with fallback.
- [x] Add owner-only Digital Cartilla UI/API routes for vet visits, vaccines, medications, and vaccine sticker photos.
- [x] Add clickable vet visit detail route.
- [x] Add upload validation for vaccine sticker photos.
- [x] Confirm public QR pages do not expose cartilla or medication data.
- [x] Update docs only where behavior changes.
- [x] Run typecheck and tests.
- [x] Apply migrations, deploy, and smoke production.

## Implementation Results

- Dashboard cards now use a wrapping board/grid and render uploaded cat photos through `/media/cats/:publicId/photo`, with a placeholder when no photo exists.
- `/api/cats` returns `hasPhoto` and `photoUrl`; it still does not expose `photo_r2_key`, internal IDs, or owner IDs.
- Owner settings now support language codes `en`, `es`, and `kk-KZ`, rendered as English, Español, and Қазақша in the dashboard selector.
- Dashboard, guest selector, and key public pages use centralized language support with English fallback; user-entered medical/cartilla content is not translated.
- Breed assist uses `GET /api/cat-reference/breeds`, an optional server-side TheCatAPI proxy. The dashboard never exposes `THE_CAT_API_KEY`, and registration works with local fallback options if TheCatAPI is unavailable.
- Color/markings now provide common local options plus optional free-text notes.
- Digital Cartilla owner UI exists at `/dashboard/cats/:publicId/cartilla`.
- Vet visit entries link to `/dashboard/cats/:publicId/cartilla/vet-visits/:visitId` and render escaped detail fields.
- Owner-only vaccine and medication creation routes exist. Medication copy is `Medication Record`, and advice-like fields are rejected.
- Vaccine sticker photos upload through owner-gated API routes and are served through owner-gated media routes.

## Intentionally Deferred

- WhatsApp card generator was completed in the Beta 1.5 Day 9/10 correction branch.
- Recovery Board work was completed in the Beta 1.5 Day 9/10 correction branch.
- Optional modes remain unbuilt.
- OCR, reminders, medication advice, drug interaction checks, refill tracking, treatment plans, nearby alerts, and full vet accounts remain out of scope.
