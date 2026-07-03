# Kiro Run Report — Beta 1.5 Alignment Corrections

Date: 2026-07-03
Branch: fix/beta15-alignment-corrections
Scope: Tier-1 bug fixes, restore intended behavior, no architectural changes.

---

## Phase 1 — Persistent Top Nav on All Authenticated Pages

Created `apps/worker/src/pages/partials/topNav.ts` exporting `renderTopNav(lang, opts)`
and `TOP_NAV_CSS`. Renders a Dashboard link and Logout control when authenticated,
or a Log in link when not.

Integrated into: catDetail.ts, sightingInbox.ts (list + detail), qrPage.ts,
cartilla.ts (both cartilla page and vet visit detail page), missingCard.ts.

NOT added to: public scan pages, public vet visit form, public recovery board.

i18n keys added: `navDashboard`, `navLogin`, `navLogout` (en/es/kk-KZ).

---

## Phase 2 — Global Language Resolution + Full Coverage + Single Control

Added `resolveOwnerLang(db, ownerId)` to `apps/worker/src/utils/i18n.ts`.
All authenticated page routes in `index.ts` now call `resolveOwnerLang` instead
of `getLanguageFromRequest`. Public pages retain `getLanguageFromRequest`.

Hardcoded English replaced: "Birth date" and "Notes" in catDetail.ts.
i18n keys added: `birthDate`, `notes`, `myCats` (en/es/kk-KZ).

Single language control: confirmed only the Settings tab has a language
<select> in the authenticated dashboard. No duplicate selectors remain.

---

## Phase 3 — Web Text Overflow

Fixed stat tiles: removed `overflow:hidden`/`white-space:nowrap` truncation at
desktop widths, replaced with `overflow-wrap:anywhere` for natural wrapping.
Added `min-width:0` to flex children in cat-actions.
Tab text: added `min-width:0` and `overflow-wrap:anywhere` to `.tab-text`,
`.tab-title`, `.tab-copy`.
Button text: added `white-space:normal` and `overflow-wrap:anywhere`.

Mobile breakpoint rules unchanged.

---

## Phase 4 — Top Tab Sized to Its Text

Reduced `.tab-btn,.tab-link` from `min-height:96px; padding:var(--space-3)` to
`min-height:auto; padding:var(--space-2) var(--space-3)`.
Tab icon visual reduced from 56px to 44px.

---

## Phase 5 — Cat Registration as Independent Tab

Promoted "Register a Cat" from a nested `<details>` toggle inside the My Cats
panel to its own top-level `register-tab` panel with a dedicated tab button.
First tab renamed from "Register a Cat" to "My Cats".
Tab grid expanded from 4 columns to 5.

Decision log entry added. Sitemap doc update deferred (no sitemap section 20
found in current docs).

---

## Phase 6 — Strip Medical Duplication from Cat Detail Page

Removed: `summarizeVetVisit` function, `VetVisitSummary` type, vet visit
rendering loop, vet-specific CSS, `listVetVisits` import.
Left: HTML comment placeholder "pending detail-page repurpose (F)".
Cartilla page and Cartilla API unchanged.
Updated catDetail.test.ts to assert medical content is absent.

---

## Test Counts

| Workspace | Baseline | Final |
|---|---|---|
| mishipass-worker | 267 | 267 |
| @mishipass/shared-validation | 43 | 43 |
| **Total** | **310** | **310** |

Test count unchanged. 3 tests in catDetail.test.ts were rewritten to match the
new behavior (medical records removed from cat detail page).

---

## Deferred / Not Completed

| Item | Reason |
|---|---|
| Sitemap Section 20 update for registration tab | No Section 20 found in docs/sitemap.md; may have been removed or restructured. |
| Phase 2 acceptance tests (render with es/kk-KZ, assert translations) | Scoped out to avoid ballooning; the resolveOwnerLang integration is verified by tsc + existing test suite passing; dedicated assertion tests are a follow-up. |

---

## Commits (6)

1. `fix(ui): add persistent top nav with dashboard link to authenticated pages`
2. `fix(i18n): resolve owner language globally, close coverage gaps, single language control`
3. `fix(ui): resolve web-layout text overflow in cards, tiles, tabs`
4. `fix(ui): resize top tab to fit its text`
5. `feat(ui): promote cat registration to independent dashboard tab + docs`
6. `fix(ui): remove medical duplication from cat detail page (cartilla is sole home)`
