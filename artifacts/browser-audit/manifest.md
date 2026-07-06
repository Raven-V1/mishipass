# MishiPass Browser Audit Manifest — 2026-07-06
Generated for ChatGPT design-fidelity comparison. Screenshots are in artifacts/browser-audit/current/. Mockups are in assets/mockups/.

Seed: dev@mishipass.local / devpass123 — owner id 900, cats MP-QA-T001-A001 through MP-QA-T006-S001.
Playwright version: 1.61.1. Chromium build: 149.0.7827.55 (chromium-1228). Viewport desktop: 1280x900. Viewport mobile: 390x844.

| Page | Route | State | Desktop PNG | Mobile PNG | Mockup |
|------|-------|-------|-------------|------------|--------|
| Root landing | / | public | root.desktop.png (145756 B) | root.mobile.png (49341 B) | assets/mockups/landingpage.jpeg, assets/mockups/desktoplanding.jpeg |
| Dashboard | /dashboard | authenticated | dashboard.desktop.png (112615 B) | dashboard.mobile.png (39440 B) | assets/mockups/dashboard.jpeg |
| Cat registration | /dashboard/register | authenticated | cat-registration.desktop.png (105621 B) | cat-registration.mobile.png (32043 B) | assets/mockups/cat_registration.jpeg |
| Settings | /dashboard/settings | authenticated | settings.desktop.png (145052 B) | settings.mobile.png (46660 B) | assets/mockups/settings.jpeg |
| Cat detail | /dashboard/cats/MP-QA-T001-A001 | authenticated | cat-detail.desktop.png (77127 B) | cat-detail.mobile.png (31739 B) | no mockup |
| QR card | /dashboard/cats/MP-QA-T001-A001/qr | authenticated | qr-card.desktop.png (196803 B) | qr-card.mobile.png (49778 B) | assets/mockups/QR_card.jpeg |
| Public profile (active) | /c/MP-QA-T001-A001 | public, unauthenticated | public-profile-active.desktop.png (81362 B) | public-profile-active.mobile.png (26506 B) | assets/mockups/public_profile.jpeg |
| Missing alert public | /c/MP-QA-T002-M001 | public, unauthenticated | missing-alert-public.desktop.png (114715 B) | missing-alert-public.mobile.png (27999 B) | assets/mockups/missing_alert.jpeg |
| Missing card | /dashboard/cats/MP-QA-T002-M001/missing-card | authenticated | missing-card.desktop.png (117071 B) | missing-card.mobile.png (34711 B) | no mockup |
| Recovery board | /recovery-board | public | recovery-board.desktop.png (123691 B) | recovery-board.mobile.png (30235 B) | assets/mockups/sighting_board.jpeg |
| Sighting report form | /c/MP-QA-T006-S001/sighting | public, unauthenticated | sighting-report.desktop.png (159699 B) | sighting-report.mobile.png (61477 B) | assets/mockups/sighting_report.jpeg |
| Sighting inbox | /dashboard/cats/MP-QA-T006-S001/sightings | authenticated | sighting-inbox.desktop.png (110210 B) | sighting-inbox.mobile.png (30121 B) | assets/mockups/empty_sighting.jpeg |
| Digital cartilla | /dashboard/cats/MP-QA-T005-C001/cartilla | authenticated | digital-cartilla.desktop.png (96987 B) | digital-cartilla.mobile.png (34594 B) | assets/mockups/digital_cartilla.jpeg |
| Public profile settings | /dashboard/cats/MP-QA-T001-A001/public-profile | authenticated | public-profile-settings.desktop.png (114391 B) | public-profile-settings.mobile.png (40600 B) | no mockup |
| Vet portal (public vet-mode profile) | /c/MP-QA-T003-V001 | public, unauthenticated | vet-portal.desktop.png (143624 B) | vet-portal.mobile.png (45245 B) | assets/mockups/vet_portal.jpeg |
| Invalid QR | /c/MP-XX-0000-0000 | public, 404 expected | invalid-qr.desktop.png (185139 B) | invalid-qr.mobile.png (78990 B) | assets/mockups/invalid_qr.jpeg |

## Notes on page mapping
- medical-record: no standalone route exists. Medical records are rendered within the cartilla page (/dashboard/cats/:id/cartilla). Mockup assets/mockups/empty_medical_record.jpeg maps to the cartilla tab state.
- vaccine-portal: no standalone route exists. Vaccine records are rendered within the cartilla page. Mockup assets/mockups/vaccine_portal.jpeg maps to the cartilla tab state.
- vet-portal: no owner-facing standalone dashboard route for vet mode. The vet-mode public QR profile (/c/:publicId) is what a vet sees on scan. Captured as vet-portal above.
- error-page: no dedicated error route. The 404 illustrated state page (invalid-qr above) demonstrates the error page design. Mockup assets/mockups/error_page.jpeg.
- sighting-inbox currently has 1 seeded sighting for MP-QA-T006-S001 (sighting id 900).
