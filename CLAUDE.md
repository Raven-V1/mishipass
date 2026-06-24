# CLAUDE.md — MishiPass

Operating guide for Claude Code on this repository. This file distills the
**MishiPass Project Constitution v1.0** (`docs/constitution.md`), which is the
full source of truth. Where this file and the constitution ever disagree, the
constitution wins. Where the constitution and a request disagree, **LOCKED**
decisions win and only Carlos may revise them.

---

## What MishiPass is

A **privacy-first dynamic QR passport and recovery system for cats.**

Each cat gets one permanent QR code linked to a secure public MishiPass ID. The
owner picks the active mode. The same physical QR tag behaves differently
depending on what the cat needs.

**Core differentiator:** the QR URL is permanent. The TypeScript Cloudflare
Worker reads the cat's current mode from D1 and returns the appropriate
interface. The owner changes the mode. **The QR never changes.**

### What MishiPass is NOT — never frame it as any of these

Generic pet health tracker · AI vet · symptom checker · reminder-only app ·
cat social network · generic cat profile app · medication management or
treatment-advice platform.

If a feature, label, or string risks placing MishiPass in any of those
categories, reword or remove it before writing or building it.

---

## Stack (LOCKED)

| Layer | Decision |
|---|---|
| Core runtime | TypeScript Cloudflare Workers |
| Database | Cloudflare D1 |
| File storage | Cloudflare R2 |
| Frontend | TypeScript / JavaScript, React optional |
| Python | Tooling layer only — never on the production request path |
| External hosting | None for Beta |
| WhatsApp | Manual browser share / owner-controlled sharing only |

**Production request flow:**
`QR scan → TypeScript Worker → D1 lookup → mode routing → HTML/API response`

**Cost constraint:** stack stays free or near-free. No paid service is added
without Carlos's explicit decision.

### Python role (LOCKED)

Python is an identity and tooling layer only. It defines ID formats, generates
demo QR payloads, validates test data, creates seed/demo records, and supports
security and report scripts. It does **not** handle live QR routing, live cat
creation, production auth, production uploads, WhatsApp messaging, or OCR.

Python lives at `tools/python/` — a **folder in the repo, not a branch.**

---

## Modes

| Mode | Build Priority |
|---|---|
| Active Profile | Must build |
| Missing Alert | Must build |
| Vet Visit | Must build |
| Travel · For Adoption · Memorial · Celebration | Optional — only after all must-build is done and judge-safe |

If the deadline is close, optional modes are skipped.

---

## Hard boundaries — do not cross without Carlos re-scoping

**Digital cartilla — medication boundary (absolute):**
Medication **records** are allowed. Medication **advice** is not.
- Allowed in an entry: medication name, dose as entered by vet/owner, duration,
  start date, prescribing vet/clinic, notes.
- Never build: dosage recommendations, drug-interaction checks, refill tracking,
  medication reminders, symptom-to-medication suggestions, any treatment advice.
- Required form label: `Medication Record`.
  Prohibited labels: Medication Tracker / Management / Treatment Plan / Assistant.
- Medication entries are **never** shown on any public QR profile in any mode.

**Deferred to V2 — do not build:** procedures section, medication reminders,
dosage calculators, interaction checks, OCR for vaccine labels, WhatsApp Business
backend, automatic nearby alerts, user location tracking, group chats / DMs,
full social network, full vet accounts, adoption marketplace, push
notifications, advanced travel rule engine, app-store release, external Python
service.

---

## Security & privacy principles (LOCKED — enforce in every feature)

- Use random public IDs. **Never expose internal database IDs.**
- Public URLs use `/c/MP-XX-XXXX-XXXX`, never `/cat/1`.
- Owner controls contact visibility. Default is the MishiPass relay form.
- No owner full name or exact address shown publicly.
- Vet Visit mode is temporary and auto-expires (24h from activation OR
  immediately on Save & Finish Visit, whichever comes first).
- Save & Finish Visit returns the QR to Active Profile automatically.
- Medical/cartilla data is private — owner dashboard only.
- Recovery Board is owner opt-in, not shown by default.
- No nearby-user pings. No automatic location tracking.
- Reward amount hidden by default; owner may reveal it.
- Public sighting-report uploads (unauthenticated): enforce file-type
  validation, size limits, and per-IP rate limiting. All uploads validate type,
  size, and content.
- Vet needs no account in Beta — documented Beta limitation: anyone scanning
  during Vet Visit mode could submit a record.
- Dependabot monitors vulnerable dependencies (dev/security tool, not a feature).

**ID format note for the security model:** the country segment in
`MP-MX-7X3B-9K21` is cosmetic display context, not a security boundary.
Uniqueness comes from the random segments.

**Dynamic-QR clarification (README + report):** the QR is static; the Worker
reads the current mode from D1 and returns the right interface. State this to
pre-empt judges flagging "dynamic QR" as misleading.

---

## Your role as Claude Code (LOCKED)

> Claude and ChatGPT advise. Codex and Claude Code execute. Zhanerke designs.
> Carlos orchestrates and decides.

- You handle larger, multi-file implementation tasks **with clear specs**.
- You scaffold features once architecture is confirmed, and refactor within
  defined boundaries.
- **Every task must be specced before you execute.** If a request is open-ended
  ("build the dashboard", "make it secure"), stop and ask for a spec.
- You may suggest, but you do not decide design. No user-facing feature is
  "done" without Zhanerke's approval (or Carlos marking it temporary functional
  UI).
- Carlos reviews all your output before it is committed. Carlos handles all Git
  operations.

---

## Branch strategy (LOCKED)

```
main       → always deployable, judge-safe, protected
dev        → working integration branch
feature/*  → one branch per feature
docs/*     → documentation-only changes
chore/*    → setup, config, dependency work
```

**No direct commits to `main`.** Feature branches → `dev` via PR. `dev` → `main`
only at stable milestones. `tools/python/` is a folder, not a branch.

---

## Repository structure (planned, LOCKED)

```
mishipass/
├── README.md
├── CLAUDE.md
├── docs/
│   ├── constitution.md
│   ├── beta-1.4-report.md
│   ├── sitemap.md
│   ├── security-model.md
│   ├── demo-flow.md
│   ├── decision-log.md
│   ├── feature-specs/
│   └── design/
├── apps/
│   ├── web/         (public/, src/, package.json)
│   └── worker/      (src/, wrangler.toml, package.json)
├── tools/
│   └── python/      (id_format/, qr_utils/, seed_data/, validation/, reports/)
├── packages/
│   └── shared/validation/
├── assets/          (mockups/, logo/, qr-samples/)
├── .github/dependabot.yml
├── .gitignore
└── LICENSE
```

---

## Definition of Done

A feature is done only when: it matches its written spec; works in manual
testing; exposes no internal DB ID on any public surface; shows only
mode-appropriate info on public pages; keeps cartilla/medical data behind owner
auth; shows medication entries as records only (no advice/reminders); routes QR
modes correctly; enforces upload type/size/rate limits where applicable;
respects Zhanerke's approved design on user-facing surfaces; is committed to the
correct branch; and has related docs updated if behavior, architecture, or copy
changed.

For Beta 1.4, **done means judge-safe, not perfect.**

---

## Feature workflow (no steps skipped)

Spec → alignment check (scope/privacy/framing) → design approval if user-facing →
task split → execute → Carlos review → manual test → QR-scan test if on the QR
path → commit to correct branch → doc sync.

## Scope test before adding any feature

1. Does it make MishiPass a health tracker / reminder app / AI vet / symptom
   checker / social network? → **Reject.**
2. In the locked must-build list? → **Build it.**
3. In the locked optional list? → **Only after all must-build is done.**
4. In the V2 list? → **Log it, do not build it.**
5. New and on no list? → **Full alignment check with Carlos before adding it.**

Terminal-agent suggestions are not approvals. Drift is not a decision.
