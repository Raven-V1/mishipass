# MishiPass — Sitemap

Derived from Constitution Section 20 (LOCKED). This is the planned information
architecture for Beta 1.4. Optional modes are built only after all must-build
work is complete and public-ready.

**Hosting note (Day 7 correction):** All surfaces below are served by the
Cloudflare Worker/D1/R2 stack. GitHub Pages (`site/`) is a temporary static
landing page only — it is not a sitemap surface, not the app, and must not
host any of the routes listed here. See decision-log [2026-06-30] for rationale.

```
MishiPass
├── Public Website        ← Worker-rendered HTML on all routes
│   ├── Landing Page      ← Worker root (GET /) — minimal product page
│   ├── Public Cat Profile
│   │   ├── Active Profile View
│   │   ├── Missing Alert View
│   │   ├── Travel View (optional)
│   │   ├── Adoption View (optional)
│   │   ├── Memorial View (optional)
│   │   └── Celebration View (optional)
│   ├── Sighting Report Form
│   ├── Community Recovery Board
│   │   ├── Filter by City
│   │   ├── Filter by Alert Age
│   │   └── Open Missing Cat Alert
│   └── Public Alert Link
│
├── Owner Dashboard
│   ├── Dashboard Home
│   ├── My Cats
│   │   ├── Register New Cat
│   │   ├── Edit Cat Profile
│   │   └── View Cat QR
│   ├── QR Status Console
│   │   ├── Active Profile Mode
│   │   ├── Missing Alert Mode
│   │   ├── Vet Visit Mode
│   │   ├── Travel Mode (optional)
│   │   ├── Adoption Mode (optional)
│   │   ├── Memorial Mode (optional)
│   │   └── Celebration Mode (optional)
│   ├── Missing Center
│   │   ├── Missing Alert Setup
│   │   ├── Reward Settings
│   │   ├── WhatsApp Card Generator
│   │   ├── Public Alert Link
│   │   └── Recovery Board Publishing
│   ├── Sighting Reports
│   ├── Digital Cartilla
│   │   ├── Vet Visits
│   │   ├── Vaccines
│   │   ├── Medications
│   │   └── Vaccine Sticker Photos
│   ├── Privacy & Contact Settings
│   └── Account Settings
│
└── Temporary Vet Access
    ├── Vet Visit Entry Form
    ├── Upload Vaccine Sticker Photo
    ├── Save Draft
    ├── Save & Finish Visit
    └── Vet Session Expired Page
```

## Implementation status

### Implemented (Day 1–6 complete)

- Worker root page (landing)
- Owner dashboard home
- Register / login / logout
- Cat registration and edit (including expanded profile fields)
- QR card with real QR SVG/image
- Active Profile public view
- Missing Alert public view with mode switching
- Sighting Report Form (text + optional photo)
- Sighting Reports inbox (owner-only)
- Cat profile photo upload and display (R2-backed)
- Sighting photo owner-only display (R2-backed)
- Privacy & Contact Settings
- D1-backed rate limiting (sighting submit + public cat lookup)
- HMAC-SHA256 reporter IP hashing
- MIME/size/magic-byte image validation

### Planned (not yet built)

- Vet Visit mode and Temporary Vet Access
- Save & Finish Visit auto-return
- Digital Cartilla (vet visits, vaccines, medications)
- WhatsApp Card Generator
- Recovery Board Publishing
- Community Recovery Board with filters
- Optional modes:
  - Travel
  - Adoption
  - Memorial
  - Celebration
  - Public Preview

## Access boundaries (from the security model)

- **Public Website** surfaces show only mode-appropriate, non-sensitive
  information. Medication entries and cartilla data are never shown on any public
  surface in any mode.
- **Owner Dashboard** requires an authenticated owner session.
- **Temporary Vet Access** is reachable only while the cat is in Vet Visit mode;
  the session is temporary and auto-expires (24h from activation or immediately on
  Save & Finish Visit, whichever comes first). Not yet implemented.
