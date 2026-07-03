# MishiPass Mockup Redo Comparison Notes

Date: 2026-07-02
Branch: design/mockup-redo-visual-match

## Assets Inspected

- assets/logo/logo.jpeg: 946x513. This is the real peeking black cat illustration with paw accent, not a horizontal wordmark lockup.
- assets/mockups/desktoplanding.jpeg: 1179x787.
- assets/mockups/landingpage.jpeg: 822x1600.
- assets/mockups/dashboard.jpeg: 1179x774.
- assets/mockups/missing_alert.jpeg: 930x637.
- assets/mockups/vet_portal.jpeg: 1179x783.

## Homepage Desktop

- Mockup inspected: assets/mockups/desktoplanding.jpeg.
- Route compared: /.
- Current mismatch:
  - Header uses a tiny square cat asset plus reconstructed HTML wordmark instead of the mockup's large cat-plus-wordmark treatment.
  - Hero is a generic SaaS grid with oversized "MishiPass" headline, not the mockup's "Welcome back!" left column.
  - Feature area uses six boxed cards in a 3x2 grid; mockup uses compact icon columns in one horizontal row.
  - Login card is separated and proportioned differently; mockup places a wide card lower in the first viewport with left copy, middle form, right social buttons.
  - Background and visual atmosphere are too generic; mockup has subtle paw/wave texture and a warm soft layout.
- Exact implementation files to change:
  - apps/worker/src/utils/html.ts
  - apps/worker/src/pages/root.ts
- Planned visual correction:
  - Replace tiny header logo treatment with a wider real-logo art span plus text only where the mockup visibly shows the wordmark.
  - Rebuild / desktop first viewport into mockup-like left welcome/cat column, right compact feature row, lower login card, and privacy footer line.
  - Keep provider state honest: Google active if Logto base config is present; Apple disabled unless connector target is configured.
- Safe in low-time session: yes. This is mostly HTML/CSS in the landing renderer and shared logo helper.
- Changes made:
  - Shared branding now uses the real `logo.jpeg`, the shared page background now uses `background.jpeg`, and decorative paws now use the real `paw.png` served from `/brand/paw.png`.
  - `/` desktop first viewport was rebuilt into the mockup-like composition: header/nav, left welcome panel, right compact feature row, lower login card, and privacy footer line.
  - Feature cards were corrected to six distinct cards: Secure & Private, Digital Cartilla, QR Passport, Missing Alerts, Vet Visit Mode, Recovery Board.
  - Provider visual state remains driven by existing Logto env config. Google is active when base Logto config is present; Apple stays disabled unless `LOGTO_APPLE_CONNECTOR_TARGET` is configured.
- Remaining differences:
  - The source logo art is still a peeking-cat illustration, not a true horizontal lockup, so the header remains a CSS-composed lockup around the real art.
- Screenshot path:
  - `.codex-smoke/mockup-redo-visual-match/desktop-landing.png`
  - `.codex-smoke/mockup-redo-visual-match/desktop-landing-1024.png`
- Review required:
  - Carlos and Zhanerke visual review still required.

## Mobile Landing/Auth

- Mockup inspected: assets/mockups/landingpage.jpeg.
- Route compared: / at 390px.
- Current mismatch:
  - Current page compresses desktop sections instead of rendering the phone-like auth composition.
  - Logo/cat treatment is too small and boxed.
  - CTA hierarchy and vertical spacing do not match the mockup's centered pill-button sequence.
  - Extra landing content appears before/around the auth target.
  - Footer is present but not locked to the mockup-like auth composition.
- Exact implementation files to change:
  - apps/worker/src/utils/html.ts
  - apps/worker/src/pages/root.ts
- Planned visual correction:
  - Use a mobile-only full-screen auth panel with centered real cat art, "WELCOME TO", colored MISHIPASS letters, tagline, three pill CTAs, OR divider, login prompt, and Belvenar footer.
- Safe in low-time session: yes. CSS-only responsive split plus root markup changes.
- Changes made:
  - `/` now renders a mobile-only auth composition at small widths with centered real cat art, WELCOME TO, colored MISHIPASS letters, tagline, pill CTAs, OR divider, login prompt, and Belvenar footer.
  - The shared `background.jpeg` is now visible on mobile as well, and the auth stack fits without horizontal overflow.
- Remaining differences:
  - Phone chrome is approximated in CSS instead of copied pixel-for-pixel.
- Screenshot path:
  - `.codex-smoke/mockup-redo-visual-match/mobile-landing-auth.png`
  - `.codex-smoke/mockup-redo-visual-match/mobile-landing-auth-430.png`
- Review required:
  - Carlos and Zhanerke visual review still required.

## Dashboard

- Mockup inspected: assets/mockups/dashboard.jpeg.
- Route compared: /dashboard after auth.
- Current mismatch:
  - Header/logo still depends on the small lockup helper.
  - Dashboard card model is closer to an admin list than the mockup's single large profile surface.
  - Tab cards are compact and lack the large coral active Register a Cat composition.
  - Cat summary lacks the wide photo-left/profile-right/stats-row structure.
  - Breed selector has improved non-overlap, but the overall dashboard scale is still cramped versus the mockup.
- Exact implementation files to change:
  - apps/worker/src/utils/html.ts
  - apps/worker/src/pages/dashboard.ts
- Planned visual correction:
  - Apply shared logo/header fix now.
  - Only touch dashboard CSS/card scale if time remains after landing; avoid changing auth/session/API behavior.
- Safe in low-time session: partial only. A full dashboard restructure is more than a quick CSS correction because cat cards are generated in inline JS.
- Changes made:
  - Dashboard header inherits the corrected logo/background system.
  - Tab cards were rebuilt into larger mockup-like surfaces with a coral active Register a Cat card and larger icon treatment.
  - Owner cat cards were reshaped into a wider photo-left/profile-right layout with a visible stats row and safer mobile stacking.
  - Breed cards retain card layout with taller media areas and non-overlapping responsive sizing.
- Remaining differences:
  - Stats row still uses placeholders for fields not returned by the existing API payload.
- Screenshot path:
  - `.codex-smoke/mockup-redo-visual-match/dashboard-desktop.png`
  - `.codex-smoke/mockup-redo-visual-match/dashboard-mobile.png`
- Review required:
  - Carlos and Zhanerke visual review still required.

## Missing Alert

- Mockup inspected: assets/mockups/missing_alert.jpeg.
- Route compared: /c/:publicId when cat is missing.
- Current mismatch:
  - Header uses the same small lockup helper.
  - Layout is narrower and more utility-like than the mockup's centered alert hero and wide white card.
  - Heading/subtitle hierarchy does not fully match; subtitle is missing.
  - Photo placeholder and data rows are not scaled like the mockup.
  - Report/contact CTA structure is functional but not mockup-aligned.
- Exact implementation files to change:
  - apps/worker/src/utils/html.ts
  - apps/worker/src/routes/cats.ts
- Planned visual correction:
  - Shared logo/header fix now.
  - Defer deeper missing-alert card rebuild unless landing work is completed with time left.
- Safe in low-time session: partial only. Safe CSS/markup changes exist, but lower priority than landing.
- Changes made:
  - Missing Alert now uses the corrected shared logo/background system.
  - The public missing page now has a centered heading/subtitle, badge row, larger photo/card layout, and a calmer urgent hierarchy closer to the mockup.
  - Country and missing state moved into visible badges, while the data list now starts at city/area/reward details.
- Remaining differences:
  - Public CTA density is still lighter than the static mockup.
- Screenshot path:
  - `.codex-smoke/mockup-redo-visual-match/missing-alert-desktop.png`
  - `.codex-smoke/mockup-redo-visual-match/missing-alert-mobile.png`
- Review required:
  - Carlos and Zhanerke visual review still required.

## Vet Portal

- Mockup inspected: assets/mockups/vet_portal.jpeg.
- Route compared: /c/:publicId when cat is in vet mode.
- Current mismatch:
  - Header uses the same small lockup helper.
  - Page is a narrow generic form, not the mockup's wide white work surface.
  - Current visit status panel is present but less prominent.
  - Form is single-column, while mockup uses two-column desktop grouping.
  - Upload and Save/Finish controls are not styled like the mockup.
- Exact implementation files to change:
  - apps/worker/src/utils/html.ts
  - apps/worker/src/routes/vetVisit.ts
- Planned visual correction:
  - Shared logo/header fix now.
  - Defer full wide-form rebuild unless time remains, because vet behavior must not be disturbed.
- Safe in low-time session: partial only. CSS/form markup is safe but lower priority than landing and logo.
- Changes made:
  - Vet Visit now uses the corrected shared logo/background system.
  - The page was rebuilt from a narrow single-column form into a wider mockup-like work surface with a left profile/status column and a right multi-section form.
  - Medication wording was kept documentation-only and the Save & Finish action is visually emphasized without changing route behavior.
- Remaining differences:
  - The existing backend schema limits the visible form fields to the current supported fields, so some purely mockup-only labels were not added.
- Screenshot path:
  - `.codex-smoke/mockup-redo-visual-match/vet-portal-desktop.png`
  - `.codex-smoke/mockup-redo-visual-match/vet-portal-mobile.png`
- Review required:
  - Carlos and Zhanerke visual review still required.
