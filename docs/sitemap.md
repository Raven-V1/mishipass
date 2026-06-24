# MishiPass — Sitemap

Derived from Constitution Section 20 (LOCKED). This is the planned information
architecture for Beta 1.4. Optional modes are built only after all must-build
work is complete and judge-safe.

```
MishiPass
├── Public Website
│   ├── Landing Page
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

## Access boundaries (from the security model)

- **Public Website** surfaces show only mode-appropriate, non-sensitive
  information. Medication entries and cartilla data are never shown on any public
  surface in any mode.
- **Owner Dashboard** requires an authenticated owner session.
- **Temporary Vet Access** is reachable only while the cat is in Vet Visit mode;
  the session is temporary and auto-expires (24h from activation or immediately on
  Save & Finish Visit, whichever comes first).
