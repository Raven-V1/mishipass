# MishiPass Beta 1.5 — Project Report

## Executive Summary

MishiPass is a privacy-first dynamic QR passport and recovery system for cats.
One permanent QR code adapts to what the cat needs — Active Profile, Missing
Alert, Vet Visit, or For Adoption — while keeping private owner and medical data
separate from public pages. Built as a Cloudflare Workers TypeScript application
with D1 and R2, it demonstrates a focused product with clear public/private
data boundaries, a dynamic QR workflow, and multilingual support.

## Project Overview

### Why built

Cat collars and QR tags typically encode static information that cannot adapt
when a cat goes missing or visits a vet. Owners need a single permanent tag
that changes behavior without reprinting. MishiPass solves this by keeping the
QR URL stable while routing scanners to the correct experience based on the
cat's current mode.

### Theme connection

MishiPass connects to the hackathon theme by demonstrating a real-world
product that uses Cloudflare's edge platform to serve different experiences
from a single static URL, combining Workers, D1, and R2 into a cohesive
privacy-first application.

### Target audience

- Cat owners who want a single collar tag that adapts to their cat's situation
- Finders who scan a found cat's QR and need mode-appropriate information
- Veterinarians documenting visits during temporary Vet Visit sessions
- Cat owner communities using the Recovery Board during missing alerts

## Key Features

- **Dynamic QR routing**: one static URL, four distinct public experiences (Active, Missing, Vet Visit, For Adoption)
- **Active Profile**: public-safe cat details and owner-controlled contact
- **Missing Alert**: city/area, reward visibility, sighting reports, WhatsApp card, Recovery Board
- **Vet Visit**: temporary mode-gated form for documentation-only records
- **For Adoption**: public adoption profile with transfer request flow
- **Digital Cartilla**: private owner-only vet visits, vaccines, sticker photos, Medication Record
- **Recovery Board**: public opt-in missing cat listings with city and alert-age filters
- **Cat Photo Gallery**: multiple photos per cat, owner-only access, selectable profile photo
- **Google login**: Logto OIDC with Authorization Code + PKCE, server-side only
- **Privacy-first**: no internal IDs, no raw R2 keys, no owner identity on public pages
- **Multilingual**: English, Spanish, and Kazakh support for owner and guest interfaces

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Cloudflare Workers | TypeScript edge compute, HTML rendering, API |
| Database | Cloudflare D1 | Structured data (SQLite-compatible) |
| File storage | Cloudflare R2 | Cat photos, sighting photos, vaccine stickers |
| Auth | PBKDF2-SHA256 + session cookies | Owner authentication |
| ID format | Crockford Base32 | ~40-bit public cat IDs |
| CI | GitHub Actions | Typecheck, tests, dependency audit |
| Dependency monitoring | Dependabot | Weekly npm/pip checks |
| Breed assist | TheCatAPI (optional) | Reference images for breed selection UI |

## Technical Architecture

### Request flow

```
QR scan / browser visit
  → Cloudflare Worker (TypeScript)
    → D1 lookup: resolve public_id → cat + current_mode
      → Mode routing:
        active   → Active Profile HTML
        missing  → Missing Alert HTML + sighting form
        vet      → Vet Visit form (if session active)
        adoption → For Adoption profile + transfer request
      → Response: server-rendered HTML or JSON API
```

### Data boundaries

| Surface | Accessible data | Protected data |
|---|---|---|
| Public `/c/:id` (active) | Cat name, country, photo, contact preference | Owner identity, cartilla, medications, internal IDs |
| Public `/c/:id` (missing) | Cat name, area, city, reward (if visible), sighting form | Owner identity, cartilla, medications, internal IDs |
| Public `/c/:id` (adoption) | Cat name, photo, breed, color, contact mode | Owner identity, cartilla, medications, internal IDs |
| Sighting form | Submit text + photo | Reporter IP (HMAC-hashed only) |
| Owner dashboard | Full cat profile, cartilla, sightings, gallery | Requires authenticated session |
| Recovery Board | Missing alerts (public-safe fields) | Owner contact (relay only), medical data |
| Vet Visit form | Temporary submit access | Existing cartilla history not shown |

### Session and auth

- PBKDF2-SHA256 password hashing (Web Crypto API)
- Opaque session token in HttpOnly cookie; only SHA-256 hash stored in D1
- Session expiry enforced server-side
- Owner-scoped queries prevent cross-owner data access
- Google login: **active** via Logto OIDC (Authorization Code + PKCE, server-side); secrets confirmed set in production 2026-07-05
- Apple login: **not enabled** (Logto Apple connector not yet configured; `LOGTO_APPLE_CONNECTOR_TARGET` not set)

## Testing Matrix

| Category | Tool | Count | Status |
|---|---|---|---|
| Worker unit tests | Vitest + @cloudflare/vitest-pool-workers | 279 | Passing |
| Shared validation | Vitest | 43 | Passing |
| TypeScript typecheck | `tsc --noEmit` | all workspaces | Clean |
| npm audit | npm audit (root + apps/worker) | 0 findings | Clean |
| Production smoke | curl.exe | 4 routes | root:200, dashboard:200, breeds:200, invalid:404 |

### Manual verification coverage

- QR scan → Active Profile rendering
- Mode switch → Missing Alert with sighting form
- Sighting photo upload validation (MIME, size, magic-byte)
- Vet Visit start → form → Save & Finish → auto-return to Active
- Recovery Board city/alert-age filters
- WhatsApp card share link generation
- Privacy settings (relay/phone/hidden) reflected on public page
- Owner-scoped access (cannot view other owners' cats)
- Rate limiting on public lookup and sighting submit

## Tools Used

| Tool | Role |
|---|---|
| Kiro | AI implementation assistant |
| Codex | AI design review and visual polish assistant |
| Claude / ChatGPT | AI advisory review assistants |
| Cloudflare Workers | Production runtime |
| Cloudflare D1 | Production database |
| Cloudflare R2 | Media storage |
| GitHub Actions | CI pipeline |
| Dependabot | Automated dependency monitoring (not a contributor) |
| Wrangler | Deployment CLI |

## Learnings & Takeaways

- Server-rendered HTML from Workers is fast and avoids client-side JS bundle
  costs for public-facing pages that need instant QR scan response.
- D1's SQLite compatibility works well for a structured product but requires
  careful migration tooling (semicolon splitting in trigger blocks).
- Privacy-first architecture decisions made early (public IDs, no internal ID
  exposure, HMAC IP hashing) save significant rework later.
- Mode-gated access (Vet Visit) is a practical Beta alternative to full account
  systems when scope and risk are documented.
- Multilingual support is easier to add during build than to retrofit.

## Acknowledgments

- Registered team / group: Belvenar Analytics Development
- Project owner and implementation lead: Carlos Velazquez
- Design authority: Zhanerke Askerbekova
- Platform: Cloudflare Workers, D1, and R2
- Dependency monitoring: Dependabot
- Optional breed reference: TheCatAPI
- AI-assisted implementation/review tools: Kiro, Codex, Claude, ChatGPT

Belvenar Analytics Development is the registered display-only brand for this
team's hackathon participation. It is not a git identity, commit author, or
code contributor.

Dependabot was used for dependency monitoring. Major-version PRs that failed CI
or conflicted were closed/deferred and are not counted as merged project
contributions.

## Design Inventory

See `docs/design/zhanerke-page-inventory.md` for the full list of pages
requiring design review.

## Submission Checklist

See `docs/submission-checklist.md` for the complete pre-submission verification list.

## Known Beta Limitations

- Vet Visit mode is temporary and scanner-submitted; dedicated vet accounts are deferred.
- Apple login button is a design placeholder only — Logto Apple connector not configured.
- TheCatAPI assistance is optional and degrades to local fallback choices.
- Recovery Board uses city and alert-age filters only; no location tracking.
- Medication Record is documentation-only: no dosage, reminders, or interactions.
- D1 migration ledger is empty (base tables applied by hand); `wrangler d1 migrations list` shows all 12 migrations as "to be applied" despite the schema being current. This is a known operational drift condition, not a data integrity issue.

## Deferred / Out of Scope

- Version 2 features and optional modes (Travel, Memorial, Celebration)
- Additional animal species
- AI vet, symptom checker, medication reminders, or medical advice
- Official/legal passport or travel-document claims
- Social network, marketplace, shelter CRM, push notifications
- WhatsApp backend automation (manual share link only)
- Dedicated vet accounts (mode-gated temporary access used instead)
- Apple login (Logto Apple connector not configured)
