# #HACKTHEKITTY 2026 — Project Report
## MishiPass — a dynamic QR passport & recovery system for cats

| | |
|---|---|
| **Project name** | MishiPass (Beta 1.5) |
| **Reference ID** | MP-XX-XXXX-XXXX · Version b7f8b204 |
| **Repository** | github.com/Raven-V1/mishipass |
| **Production URL** | mishipass.carlosvelazquez354.workers.dev |

---

## 1. Executive summary

MishiPass is a privacy-first dynamic QR passport and recovery system for cats. One permanent QR code adapts to what the cat needs — Active Profile, Missing Alert, Vet Visit, or For Adoption — while keeping private owner and medical data separate from public pages. Built as a Cloudflare Workers TypeScript application with D1 and R2, it delivers a focused product with clear public/private data boundaries, a dynamic QR workflow, and multilingual support in English, Spanish, and Kazakh.

---

## 2. Project overview

### 2a. Why we're building it

In Mexico, microchipping cats is uncommon, yet there is a strong cat culture and a real need to keep track of them. When a cat goes missing, owners fall back on WhatsApp and Facebook groups to spread the word and coordinate a search. Veterinary records are just as fragile — they are frequently lost or never kept up to date, so critical history disappears exactly when it matters.

MishiPass meets people where they already are: a single printed QR code on the collar, scannable by any phone, backed by a portal that uses existing technology instead of asking owners to adopt a chip reader. That one code becomes the durable record owners lack today — for everyday identification, for a lost-cat alert, for a vet visit, or for a potential adoption. It is **not a substitute for official documentation**; it is a tracker of information that helps owners keep the records needed to fulfill the requirements for official documents when the time comes.

### 2b. How it relates to the theme

MishiPass is built entirely around cats and the people who care for them. It answers the theme with a real-world product that uses Cloudflare's edge platform to serve four distinct experiences from a single static URL — combining Workers, D1, and R2 into one cohesive, privacy-first application grounded in how cat owners actually behave today.

### 2c. Target audience

- Cat owners — especially where chipping is uncommon — who want one collar tag that adapts to their cat's situation
- Finders who scan a found cat's QR and need mode-appropriate information
- Veterinarians documenting visits during temporary Vet Visit sessions
- Cat-owner communities that today rely on WhatsApp and Facebook groups to recover missing cats

---

## 3. Key features

| Feature | Description |
|---|---|
| **Dynamic QR routing** | One static URL, four distinct public experiences (Active, Missing, Vet Visit, For Adoption). |
| **Active Profile** | Public-safe cat details with owner-controlled contact. |
| **Missing Alert** | City/area, reward visibility, sighting reports, WhatsApp card, and Recovery Board. |
| **Vet Visit** | Temporary, mode-gated form for documentation-only records with 24-hour session. |
| **For Adoption** | Public adoption profile with a transfer-request flow. |
| **Digital Cartilla** | Private owner-only vet visits, vaccines, sticker photos, and Medication Record. |
| **Recovery Board** | Public opt-in missing-cat listings with city and alert-age filters. |
| **Cat photo gallery** | Multiple photos per cat, owner-only access, selectable profile photo. |
| **Google login** | Logto OIDC with Authorization Code + PKCE, server-side only. |
| **Privacy-first** | No internal IDs, no raw R2 keys, no owner identity on public pages. |
| **Multilingual** | English, Spanish, and Kazakh for both owner and guest interfaces. |

---

## 4. Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Cloudflare Workers | TypeScript edge compute, HTML rendering, and API. |
| Database | Cloudflare D1 | Structured data (SQLite-compatible). |
| File storage | Cloudflare R2 | Cat photos, sighting photos, vaccine stickers. |
| Auth | PBKDF2-SHA256 + session cookies | Owner authentication. |
| ID format | Crockford Base32 | ~40-bit public cat IDs. |
| CI | GitHub Actions | Typecheck, tests, and dependency audit. |
| Dependency monitoring | Dependabot | Weekly npm / pip checks. |
| Breed assist | TheCatAPI (optional) | Reference images for the breed-selection UI. |

---

## 5. Technical architecture

The QR encodes one static URL. Every scan reaches the Cloudflare Worker, which resolves the cat's public ID to its current mode in D1 and renders the mode-appropriate server-rendered HTML. The printed QR never changes; only the mode behind it does.

```
QR scan / browser visit
        ↓
Cloudflare Worker · TypeScript edge
        ↓
D1 lookup: public_id → cat + current_mode
        ↓
          ┌──────────── MODE ROUTING ────────────┐
          │                                       │
       Active          Missing        Vet Visit   Adoption
  Active Profile   Missing Alert +  Vet form    Adoption profile
      HTML         sighting form  (session      + transfer
                                  active)
          └───────────────────────────────────────┘
                           ↓
        Server-rendered HTML / JSON · media served via R2 routes
```

*Fig 1. Request flow — one static URL resolves to four mode-appropriate experiences.*

### Data boundaries

| Surface | Publicly accessible | Always protected |
|---|---|---|
| Public `/c/:id` (active) | Cat name, country, photo, contact preference | Owner identity, cartilla, medications, internal IDs |
| Public `/c/:id` (missing) | Cat name, area, city, reward (if visible), sighting form | Owner identity, cartilla, medications, internal IDs |
| Sighting form | Submit text + optional photo | Reporter IP (HMAC-hashed only) |
| Owner dashboard | — requires an authenticated session — | Full profile, cartilla, sightings, gallery |
| Recovery Board | Missing alerts (public-safe fields) | Owner contact (relay only), medical data |

### Session & authentication

- PBKDF2-SHA256 password hashing via the Web Crypto API; opaque session token in an HttpOnly cookie, only its SHA-256 hash stored in D1.
- Session expiry enforced server-side; owner-scoped queries prevent cross-owner data access.
- Google login is active via Logto OIDC (Authorization Code + PKCE, server-side). Apple login is a visible placeholder only — the Logto Apple connector is not configured.
- Reporter IPs are HMAC-SHA256 hashed before storage; no raw IP and no raw R2 keys are ever persisted or exposed.

---

## 6. Testing matrix

Automated coverage: 279 Worker unit tests and 43 shared-validation tests passing, clean `tsc --noEmit` across workspaces, and 0 npm-audit findings. Key manual flows verified against local/staging below.

| Feature / flow | Steps | Expected result | Actual result | Pass / fail |
|---|---|---|---|---|
| QR → Active Profile | Register cat, open `/c/:id` | Active Profile renders with name, country badge, photo, contact preference | Renders as expected | Pass |
| Mode switch → Missing | Switch cat to Missing, reopen same URL | Missing Alert view with sighting form (different experience, same URL) | Renders as expected | Pass |
| Sighting photo upload | Submit sighting with image | MIME, size, and magic-byte validation enforced; photo stored in R2 | Validation enforced | Pass |
| Vet Visit round-trip | Start Vet Visit, open URL, Save & Finish | Vet form shows; on finish, cat auto-returns to Active Profile | Auto-return confirmed | Pass |
| Recovery Board filters | Open `/recovery-board`, apply city + alert-age filters | Listings filter correctly by city and age | Filters work | Pass |
| Privacy settings | Toggle relay / phone / hidden | Public page reflects chosen contact mode | Reflected correctly | Pass |
| Owner-scoped access | Attempt to view another owner's cat | Access denied; cross-owner data not returned | Access denied | Pass |

---

## 7. Future improvements

With another week — and beyond Beta — the roadmap focuses on closing the record-keeping loop and reducing manual steps:

- Dedicated veterinarian accounts to replace temporary, scanner-submitted Vet Visit sessions.
- Optional modes — Travel, Memorial, and Celebration — building on the existing mode-routing engine.
- Exportable record summaries to help owners assemble the paperwork required for official documents and travel.
- Individual sighting-report detail views and richer owner inbox management.
- WhatsApp Business backend automation beyond the current manual share link.
- Push notifications for new sightings on cats in Missing Alert mode.

---

## 8. Tools we used

| Tool | Role |
|---|---|
| Kiro | AI implementation assistant |
| Codex | AI design review and visual-polish assistant |
| Claude / ChatGPT | AI advisory review assistants |
| Cloudflare Workers, D1, R2 | Production runtime, database, and media storage |
| GitHub Actions | CI pipeline (typecheck, tests, audit) |
| Dependabot | Automated dependency monitoring (not a contributor) |
| Wrangler | Deployment CLI |

---

## 9. Learnings & takeaways

- Server-rendered HTML from Workers is fast and avoids client-side JS bundle costs for public pages that need an instant QR-scan response.
- D1's SQLite compatibility works well for a structured product but requires careful migration tooling (semicolon splitting in trigger blocks).
- Privacy-first decisions made early — public IDs, no internal-ID exposure, HMAC IP hashing — save significant rework later.
- Mode-gated access (Vet Visit) is a practical Beta alternative to full account systems when scope and risk are documented.
- Multilingual support is far easier to add during the build than to retrofit afterward.
- Designing around existing behavior — QR, WhatsApp, Facebook groups — lowers adoption friction more than introducing new hardware like chips.

---

## 10. Acknowledgments

- Registered team: **Belvenar Analytics Development** — a display-only brand for hackathon participation, not a code contributor.
- Project owner & implementation lead: Carlos Velazquez · Design authority: Zhanerke Askerbekova.
- Platform: Cloudflare Workers, D1, and R2.
- Optional breed reference: TheCatAPI (free tier). Dependency monitoring: Dependabot.
- AI-assisted implementation and review: Kiro, Codex, Claude, and ChatGPT.

---

## Submission checklist

- [x] Video demo (HD, or at least 720p)
- [x] README.md — prerequisites, run instructions, configuration
- [x] Project report (this document, in `docs/project-report/`)
- [x] Source code in `src/`
- [x] No unrelated files, executables, auto-generated code, or package folders (e.g. `node_modules/`, `build/`, `dist/`, `vendor/`)
