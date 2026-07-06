# Browser QA — Production Public/Unauthenticated Flows — 2026-07-06

## Scope

- Requested target: `https://mishipass.carlosvelazquez354.workers.dev`.
- Priority order: public and unauthenticated flows first.
- Visual source of truth: repository mockups in `assets/mockups/` plus canonical design assets in `assets/design/` and `apps/worker/public/assets/`.
- Requested target: `https://mishipass.carlosvelazquez354.workers.dev`
- Priority order: public and unauthenticated flows first
- Visual source of truth: repository mockups in `assets/mockups/` plus canonical design assets in `assets/design/` and `apps/worker/public/assets/`
- Active public/unauthenticated routes identified from Worker routing:
  - `GET /`
  - `GET /history`
  - `GET /dashboard`
  - `GET /recovery-board`
  - `GET /c/:publicId`
  - `GET /c/:publicId/sighting`
  - Public media/static asset routes under `/assets/...`
  - Public cat gallery route `GET /media/cats/:publicId/photos/:photoId/public`
  - QR-driven static public cat URL format `GET /c/MP-CC-XXXX-XXXX`

## Environment limitation

Production browser/curl access from this container was blocked by the outbound proxy before the request reached the site:
## Environment Limitation

Production browser/curl access from the restricted environment was blocked by the outbound proxy before the request reached the site:

```text
curl: (56) CONNECT tunnel failed, response 403
HTTP/1.1 403 Forbidden
server: envoy
```

Because of that proxy limitation, I could not truthfully certify live production browser results for console errors, network failures, responsive screenshots, or broken production assets in this environment.

## Repository checks completed

- Confirmed the production URL documented in the repository is `https://mishipass.carlosvelazquez354.workers.dev`.
- Confirmed the Worker routes that define public/unauthenticated flows.
Because of that proxy limitation, this pass could not truthfully certify live production browser results for console errors, network failures, responsive screenshots, or broken production assets in that environment.

## Repository Checks Completed

- Confirmed the production URL documented in the repository is `https://mishipass.carlosvelazquez354.workers.dev`
- Confirmed the Worker routes that define public and unauthenticated flows
- Confirmed canonical served asset paths are:
  - `/assets/brand/logo.png`
  - `/assets/brand/paw.png`
  - `/assets/background.jpeg`
  - `/assets/illustrations/cat-invalid-qr.png`
  - `/assets/illustrations/cat-notfound.png`
  - `/assets/illustrations/cat-missing-empty.png`
  - `/assets/illustrations/vet-cat.png`
- Confirmed approved mockups available for visual comparison include landing, desktop landing, public profile, invalid QR, QR card, missing alert, empty sighting, sighting report, dashboard, cat registration, vaccine portal, vet portal, empty medical record, and error page.

## QA result status
- Confirmed approved mockups available for visual comparison include landing, desktop landing, public profile, invalid QR, QR card, missing alert, empty sighting, sighting report, dashboard, cat registration, vaccine portal, vet portal, empty medical record, and error page

## QA Result Status

| Check | Status | Notes |
|---|---:|---|
| All active production routes | Blocked | Production network tunnel returned proxy 403. Routes were identified from source. |
| Buttons and links | Blocked | Requires live browser run; source review only. |
| Visual consistency against approved mockups | Blocked | Requires live screenshots; mockups/assets located. |
| Responsive behavior | Blocked | Requires browser viewport testing. |
| Console errors | Blocked | Requires browser execution. |
| Network failures | Blocked | External production network access failed at proxy layer. |
| Broken assets | Blocked | Static asset paths verified from source and public asset tree only. |
| Incorrect scaling | Blocked | Requires screenshot inspection. |
| QR-related public flows | Blocked | QR route shape verified from source; live production scanning/opening blocked. |

## Follow-up needed outside this proxy-restricted container

Run a live browser QA pass against production with these minimum viewports:

- Desktop: 1440 × 1000
- Tablet: 768 × 1024
- Mobile: 390 × 844

For each active public/unauthenticated route, capture:

1. HTTP status and final URL.
2. Console messages.
3. Failed network requests.
4. Screenshot compared to the matching approved mockup.
5. Click results for visible buttons and links.
6. QR public URL behavior for a valid active-profile cat, invalid QR, missing-mode cat, vet-mode cat, and sighting form.
## Follow-Up Needed Outside Proxy-Restricted Environment

Run a live browser QA pass against production with these minimum viewports:

- Desktop: `1440 x 1000`
- Tablet: `768 x 1024`
- Mobile: `390 x 844`

For each active public/unauthenticated route, capture:

1. HTTP status and final URL
2. Console messages
3. Failed network requests
4. Screenshot compared to the matching approved mockup
5. Click results for visible buttons and links
6. QR public URL behavior for a valid active-profile cat, invalid QR, missing-mode cat, vet-mode cat, and sighting form
