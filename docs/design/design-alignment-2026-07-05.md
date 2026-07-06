# Design Alignment Report — 2026-07-05

Authors: Carlos Velazquez and Zhanerke Askerbekova, Design Authority

## Summary

What was broken on live before this branch:
- The updated design work had not been shipped to production.
- Owner dashboard and registration surfaces still diverged from the current mockups.
- The public sighting form fabricated latitude/longitude from decorative map clicks.
- Served PNG assets still needed whole-image re-keying to avoid cream-edge halos on non-cream backgrounds.

What this branch fixes:
- Aligns the owner dashboard, register flow, vaccines/cartilla, vet portal, public missing alert, public sighting form, and state pages to the current mockups.
- Removes fabricated sighting coordinates. Only browser geolocation can populate `lat` / `lng`.
- Re-keys the served raster brand and illustration PNGs for clean transparency.
- Moves the transparency utility to `tools/python/rekey_design_assets.py`.

## Per-page Status

Status in this report is the current branch state before merge. Local rendered verification is complete. Production verification remains pending merge and deploy.

| Mockup | File(s) | Changes made | Current result |
|---|---|---|---|
| `dashboard.jpeg` | `apps/worker/src/pages/dashboard.ts` | Restored overview as the default landing state, kept the four quick tiles, preserved register as a tile rather than the default panel, and aligned owner action colors and card layout. | Local PASS |
| `cat_registration.jpeg` | `apps/worker/src/pages/dashboard.ts` | Kept the three-column registration layout, bottom privacy strip, cancel/save actions, and corrected register-form labels/i18n wiring. | Local PASS |
| `missing_alert.jpeg` | `apps/worker/src/routes/cats.ts` | Verified two-column public missing layout with photo panel, country/status chips, and ordered detail rows. | Local PASS |
| `sighting_report.jpeg` | `apps/worker/src/routes/sightingReports.ts` | Preserved the hidden `sightedAt` / `message` composition contract, removed decorative-map coordinate fabrication, kept geolocation-only coordinates, and retained existing POST field names. | Local PASS |
| `vaccine_portal.jpeg` / `empty_medical_record.jpeg` | `apps/worker/src/pages/cartilla.ts` | Verified empty medical state, vaccine form, history card, reassurance strip, and action colors. | Local PASS |
| `vet_portal.jpeg` | `apps/worker/src/routes/vetVisit.ts` | Verified current-status card, add-visit form, documentation-only medication fields, upload area, and save/cancel actions. | Local PASS |
| `invalid_qr.jpeg` | `apps/worker/src/routes/cats.ts`, served illustration asset | Verified illustrated invalid-QR state render and transparent-edge cleanup. | Local PASS |
| `error_page.jpeg` | `apps/worker/src/index.ts`, `apps/worker/src/utils/designPages.ts`, served illustration asset | Verified illustrated generic not-found state render and transparent-edge cleanup. | Local PASS |
| `empty_sighting.jpeg` | `apps/worker/src/pages/sightingInbox.ts`, served illustration asset | Verified the no-sightings state with the raster illustration and CTA. | Local PASS |

Production result:
- Pending Carlos review, merge, and deployment.

## Map Fix

File:
- `apps/worker/src/routes/sightingReports.ts`

Changes:
- Removed the decorative map click-to-lat/lng path entirely.
- Removed the fake coordinate reprojection helper.
- Kept the map as visual reference only.
- `Use my location` now writes the real browser geolocation values to `lat` / `lng`.
- `Clear pin` now clears `lat`, `lng`, and the coordinate readout.
- Preserved the text location field as the primary human-readable location input.

Test coverage:
- `apps/worker/src/routes/__tests__/sightingReports.test.ts`
- Explicit no-geolocation submission coverage asserts `lat: null` and `lng: null`.

## Assets Re-keyed

Served files re-keyed for clean transparency:
- `apps/worker/public/assets/brand/logo.png`
- `apps/worker/public/assets/brand/paw.png`
- `apps/worker/public/assets/illustrations/cat-invalid-qr.png`
- `apps/worker/public/assets/illustrations/cat-notfound.png`
- `apps/worker/public/assets/illustrations/cat-missing-empty.png`
- `apps/worker/public/assets/illustrations/vet-cat.png`

Utility location:
- `tools/python/rekey_design_assets.py`

Reference/background notes:
- `background.jpeg` remains opaque by design and was not alpha-processed.

## Intentionally Not Changed

- Landing page: untouched per instruction.
- Auth/session/security/route-data logic: unchanged outside the approved sighting-map behavior fix.
- Schema/migrations: unchanged on this branch.
- Visibility toggles: not started on this branch.

## Visibility Outcome

Phase 3 visibility work is deferred on this report branch state.

Reason:
- The current run stops at the Phase 2 PR handoff. Tier-2 visibility begins only after Carlos merges the design PR and the merged `main` branch is the new base.

## Version IDs

- Design alignment production Version ID: pending merge and deploy.
- Cat visibility production Version ID: not started.

## Open Items

- Production deployment and live page/asset verification remain pending Carlos’s review and merge of the Phase 2 PR.
- GitHub author-profile verification for the pushed branch commits remains pending first push.

## 2026-07-05 Post-Merge Deploy Verification

Merge commit on `origin/main`:
- `fbc520fe67bcc42799182e57ecbb6b7b500ff078` (`Merge pull request #108 from Raven-V1/feature/design-alignment`)

Production deploy:
- Worker URL: `https://mishipass.carlosvelazquez354.workers.dev`
- Version ID: `b7f8b204-5b79-4a6a-b61a-8f3eb1fdfd56`

Live verification notes:
- Owner-only pages were checked with a disposable production owner session.
- Live verification cats used for rendered checks:
  - Active/Vet test cat: `MP-US-Q6YC-M69H`
  - Missing-mode test cat: `MP-US-2FXA-DAAT`
- Register-form locale verification was checked on the live `/dashboard` page after saving the owner language to `en`, `es`, and `kk-KZ` through the deployed settings flow.

### Live PASS/FAIL Table

| Surface | File(s) | Mockup | Live URL checked | Result | Notes |
|---|---|---|---|---|---|
| Brand asset: logo | `apps/worker/public/assets/brand/logo.png` | brand lockup | `https://mishipass.carlosvelazquez354.workers.dev/assets/brand/logo.png` | PASS | HTTP 200, `image/png`, clean transparent edge on live pages. |
| Brand asset: paw | `apps/worker/public/assets/brand/paw.png` | paw accent | `https://mishipass.carlosvelazquez354.workers.dev/assets/brand/paw.png` | PASS | HTTP 200, `image/png`. |
| Background | `apps/worker/public/assets/background.jpeg` | global background | `https://mishipass.carlosvelazquez354.workers.dev/assets/background.jpeg` | PASS | HTTP 200, `image/jpeg`. |
| Illustration: cat not found | `apps/worker/public/assets/illustrations/cat-notfound.png` | `error_page.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/assets/illustrations/cat-notfound.png` | PASS | HTTP 200, `image/png`. |
| Illustration: invalid QR | `apps/worker/public/assets/illustrations/cat-invalid-qr.png` | `invalid_qr.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/assets/illustrations/cat-invalid-qr.png` | PASS | HTTP 200, `image/png`. |
| Illustration: no sightings | `apps/worker/public/assets/illustrations/cat-missing-empty.png` | `empty_sighting.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/assets/illustrations/cat-missing-empty.png` | PASS | HTTP 200, `image/png`. |
| Illustration: no medical records | `apps/worker/public/assets/illustrations/vet-cat.png` | `empty_medical_record.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/assets/illustrations/vet-cat.png` | PASS | HTTP 200, `image/png`. |
| Dashboard overview default | `apps/worker/src/pages/dashboard.ts` | `dashboard.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/dashboard` | PASS | Live render opened on the overview cards, not the Register a Cat panel. |
| Register a Cat layout | `apps/worker/src/pages/dashboard.ts` | `cat_registration.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/dashboard` | PASS | Live register panel shows Profile Photo, Basic Information, Physical Characteristics, and Microchip sections with the redesigned card layout. |
| Register labels in English | `apps/worker/src/pages/dashboard.ts` | `cat_registration.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/dashboard` | PASS | `Birth date`, `Microchip (Optional)`, `Microchip number`, `Implant date`, `Additional Notes (Optional)`, `Mixed / Other`, `Mixed / Unknown / Other`, `Unsaved changes will be lost. Are you sure?`, `Discard`, and `Keep editing` rendered as translated labels, not raw keys. |
| Register labels in Spanish | `apps/worker/src/pages/dashboard.ts` | `cat_registration.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/dashboard` | PASS | Live `/dashboard` rendered `Fecha de nacimiento`, `Número de microchip`, `Fecha de implante`, `Notas adicionales (Opcional)`, `Mixto / otro`, `Mixto / desconocido / otro`, `Descartar`, and `Seguir editando` after saving owner language to `es`. |
| Register labels in Kazakh | `apps/worker/src/pages/dashboard.ts` | `cat_registration.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/dashboard` | PASS | Live `/dashboard` rendered `Туған күні`, `Микрочип нөмірі`, `Имплантация күні`, `Қосымша ескертпелер (міндетті емес)`, `Аралас / басқа`, `Аралас / белгісіз / басқа`, `Бас тарту`, and `Өңдеуді жалғастыру` after saving owner language to `kk-KZ`. |
| Missing Alert public view | `apps/worker/src/routes/cats.ts` | `missing_alert.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/c/MP-US-2FXA-DAAT?lang=en` | PASS | Live render matches the two-column missing profile: photo left, `US United States` chip then `Missing` chip, followed by City, Area / neighborhood, Reward, Last seen, Breed / Mix, Color / Markings, Age, Sex, Microchip number, and Contact rows. |
| Public sighting form layout | `apps/worker/src/routes/sightingReports.ts` | `sighting_report.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/c/MP-US-2FXA-DAAT/sighting?lang=en` | PASS | Live render matches the two-column mockup with the decorative map, health condition, photo upload block, date/time, notes, and submit/cancel actions. |
| Sighting map fix | `apps/worker/src/routes/sightingReports.ts` | `sighting_report.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/c/MP-US-2FXA-DAAT/sighting?lang=en` | PASS | Clicking the decorative map left `lat` and `lng` blank. `Use my location` populated real geolocation values `39.739236` / `-104.990251` and showed the centered pin. POST field names remained `lat`, `lng`, `sightedAt`, `message`, `city`, `healthCondition`, `photoCapture`, `photoUpload`, `area`, `reporterName`, and `reporterContact`. |
| No Medical Records state + Vaccines layout | `apps/worker/src/pages/cartilla.ts` | `empty_medical_record.jpeg`, `vaccine_portal.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/dashboard/cats/MP-US-Q6YC-M69H/cartilla?lang=en` | PASS | Live owner page shows the empty medical illustration state, Add Vaccine / Add Vet Visit CTAs, split vaccine form and history card, medication section, and reassurance strip. |
| No Sightings Yet state | `apps/worker/src/pages/sightingInbox.ts` | `empty_sighting.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/dashboard/cats/MP-US-2FXA-DAAT/sightings?lang=en` | PASS | Live owner page shows the centered raster illustration, title, subtitle, and `Share Missing Poster` CTA. |
| Vet Visit page | `apps/worker/src/routes/vetVisit.ts` | `vet_portal.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/c/MP-US-Q6YC-M69H?lang=en` | PASS | Live public Vet Visit page matches the mockup structure. Medication fields remain documentation-only; no reminder, dosage-tracking, or interaction UI was added. |
| Invalid QR state page | `apps/worker/src/routes/cats.ts` | `invalid_qr.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/c/not-a-real-cat?lang=en` | PASS | Live render matches the mockup and the illustration edge is clean against the background. |
| Cat Not Found state page | `apps/worker/src/index.ts`, `apps/worker/src/utils/designPages.ts` | `error_page.jpeg` | `https://mishipass.carlosvelazquez354.workers.dev/this-route-does-not-exist?lang=en` | PASS | Live render matches the mockup and the illustration edge is clean against the background. |

Outcome:
- No live discrepancies remained after deployment.
- No follow-up fix commit was required in this post-merge verification run.
