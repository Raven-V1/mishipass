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
