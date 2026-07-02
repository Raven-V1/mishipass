# MishiPass — Decision Log

Records major decisions per Constitution Sections 10–11, using the Section 11 format.

Pre-build decisions made during Constitution v1.0 (June 12, 2026) are recorded in
Constitution Section 22 ("Key Decisions Already Made") and are not duplicated here.
This log begins at the coding period (June 24, 2026) and records decisions from
Day 1 onward.

Format:
```
## [Date] — [Decision title]
Decision: [what was decided]
Reason: [why]
Alternatives considered: [what was rejected and why]
Decided by: Project Owner
```

---

## 2026-06-24 — Project license: proprietary, all rights reserved
Decision: License the repository as proprietary "all rights reserved" (Project
Owner and Zhanerke Askerbekova), with a limited clause granting hackathon
organisers and judges permission to access, run, and test the project solely for
judging.
Reason: MishiPass is intended to continue as a product beyond the hackathon; the
team wishes to retain full ownership. The hackathon requires only that judges can
access and run the project, which the limited clause satisfies.
Alternatives considered: MIT (rejected — permits unrestricted reuse of a product
the team intends to continue). No license / silence (rejected — ambiguous, and
could appear to contradict the judge-access requirement).
Decided by: Project Owner

## 2026-06-24 — Constitution kept local, not committed to the public repo
Decision: The full Project Constitution is maintained locally by the Project
Owner and is not committed to the public GitHub repository. CLAUDE.md references it as the
local source of truth.
Reason: The repository is public. The constitution contains internal strategy and
language that frames how judge questions are anticipated; publishing it shifts
framing from "what was built" to internal planning. Public-facing explanations
(static-QR clarification, ID-enumeration note) live in the README and security
model instead, written for judges.
Alternatives considered: Commit the full constitution for transparency (rejected —
exposes internal framing). Commit a sanitized constitution (deferred — CLAUDE.md
already carries the operational subset). Move it to an in-repo "internal" folder
(rejected — anything in a public repo is public).
Decided by: Project Owner

## 2026-06-24 — CLAUDE.md added to the repository (addition to locked Section 12)
Decision: Add a sanitized CLAUDE.md operating guide at the repo root, though it is
not listed in the locked Section 12 structure.
Reason: Terminal agents read CLAUDE.md automatically; an in-repo operating guide
improves alignment. It is a distillation of the constitution with judge-perception
language removed.
Alternatives considered: Rely only on the local constitution (rejected — agents do
not read local-only files automatically).
Decided by: Project Owner

## 2026-06-24 — Attribution: Zhanerke Askerbekova named in full
Decision: Zhanerke Askerbekova is named by legal identity and title (Design Authority),
as an integral team member and co-owner, in all documentation and deliverables
where attribution is appropriate, alongside Project Owner.
Reason: She is integral to the team and the design authority; attribution should
reflect that consistently across public-facing materials.
Alternatives considered: First-name-only references as in the original
Constitution Section 8 (rejected — incomplete attribution for a public repo and
co-owner).
Decided by: Project Owner

## 2026-06-24 — Public ID format contract confirmed
Decision: The public ID format is `MP-<CC>-<S1>-<S2>` — CC a 2-letter cosmetic
country segment; S1 and S2 each 4 characters from the Crockford Base32 alphabet
(`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, excluding I, L, O, U); random segments
generated with a CSPRNG; ~40 bits of entropy. This is the contract the TypeScript
Worker must match. `tools/python/validation/test_vectors.json` is the
cross-language parity fixture.
Reason: Formalizes Constitution Section 7. Crockford Base32 avoids visually
ambiguous characters on printed tags; 40 bits is infeasible to brute-force.
Alternatives considered: Sequential/internal IDs (rejected — enumerable, leak
internal state). Longer opaque random strings (rejected — worse to read off a
printed tag).
Decided by: Project Owner

## 2026-06-24 — IDs are canonical uppercase; strict validation
Decision: Public IDs are canonical uppercase only. `validate_id` and `parse_id`
reject any lowercase, whitespace-padded, or non-ASCII value. `generate_id` rejects
any country code that is not exactly two uppercase ASCII letters, with no silent
normalization.
Reason: A single canonical form prevents TypeScript/Python parity divergence and
avoids ambiguous public URLs. Silent normalization in one implementation but not
the other is a parity footgun.
Alternatives considered: Lenient generation that uppercases input (rejected —
creates two normalization rules that can diverge across languages).
Decided by: Project Owner

## 2026-06-24 — Country code remains cosmetic (not security or uniqueness)
Decision: The country segment remains cosmetic display context only. It is not a
security boundary and does not contribute to ID uniqueness.
Reason: Country is visible on the physical tag, low-cardinality, and guessable — it
adds no enumeration resistance. It also does not meaningfully aid uniqueness, since
random segments are uniformly distributed. Making a real-world owner attribute
load-bearing would weaken the privacy-first posture.
Alternatives considered: Using the country code as part of security/uniqueness
(considered on Day 1 and rejected — no security benefit, negligible uniqueness
benefit, privacy cost). Reaffirms locked Section 7.
Decided by: Project Owner

## 2026-06-24 — Uniqueness and enumeration defenses assigned to the data/Worker layer
Decision: ID uniqueness is guaranteed by a `UNIQUE` constraint on the public-ID
column in D1 plus generate-and-retry on collision in the TypeScript Worker.
Enumeration resistance is provided by entropy plus per-IP rate limiting on the
public `/c/` lookup route. The internal database ID is never serialized to any
client response.
Reason: A `UNIQUE` constraint gives a true guarantee that random generation alone
cannot. Rate limiting, not the country code, is the correct enumeration defense.
Alternatives considered: Increasing entropy to 60 bits (deferred — unnecessary at
Beta scale and would change the locked 4-char segment format). Relying on random
generation alone for uniqueness (rejected — no guarantee).
Decided by: Project Owner

## 2026-06-24 — Kiro track participation paused
Decision: Kiro-track work is paused for now. The scaffold omits the optional
`.kiro` folder; it can be added if the team opts back in before submission.
Reason: Initial setup is focused on core repo and tooling; the Kiro opt-in is
optional and reversible before the deadline.
Alternatives considered: Scaffold the `.kiro` folder now (deferred — not needed
unless opting into the Kiro track).
Decided by: Project Owner

## 2026-06-26 — Owner authentication: session-based
Decision: Owner accounts authenticate via session-based auth — an opaque
session token issued on login, stored client-side in an HttpOnly cookie, with
only its SHA-256 hash persisted server-side (`sessions.token_hash`). No JWTs,
no third-party auth provider.
Reason: Matches the D1 schema already built (`sessions` table: token_hash,
owner_id FK, expires_at) and keeps revocation simple — deleting a row ends a
session immediately, which a stateless JWT can't do without a denylist.
Alternatives considered: JWT (rejected — revocation requires an extra
denylist table, no real benefit at this scale). Third-party auth provider
(rejected — adds a paid/external dependency, conflicts with the free-stack
constraint in §5).
Decided by: Project Owner

## 2026-06-26 — Frontend: React dashboard, Worker-rendered public pages
Decision: The owner dashboard (apps/web) is a React + TypeScript SPA. Public
QR-facing pages (Active Profile, Missing Alert, Vet form, etc.) are rendered
directly by the TypeScript Worker as server-rendered HTML, not by the React
app.
Reason: Public pages need to load instantly off a phone camera scan with no
client-side bundle — server-rendered HTML from the Worker is the right tool.
The owner dashboard is a richer, authenticated, stateful surface where React's
component model pays for itself.
Alternatives considered: Single React app serving both surfaces (rejected —
forces a JS bundle onto the public scan path, hurts the "scan and instantly
see it" demo). Plain HTML/JS for everything (rejected — dashboard has enough
state and interactivity that React saves real time during the build window).
Decided by: Project Owner

## 2026-06-26 — Root workspace config: npm workspaces
Decision: Use npm workspaces at the repo root (`apps/*`, `packages/*`) rather
than a separate package manager or independent per-app installs.
Reason: Already on Node tooling throughout (`apps/web`, `apps/worker` are both
npm packages); workspaces let `packages/shared/validation` (e.g. the TS port
of the ID-format contract) be imported by both without publishing or manual
linking.
Alternatives considered: pnpm/yarn workspaces (rejected — no added benefit
over npm workspaces at this project's size; npm is already in use, no reason
to add another tool). Independent installs per app, no shared package
(rejected — would force copy-pasting the ID-format TS port between
`apps/worker` and any future consumer).
Decided by: Project Owner

## [2026-06-29] — Dependency: @cloudflare/vitest-pool-workers major-version upgrade deferred
Decision: Hold @cloudflare/vitest-pool-workers at 0.5.30. Major upgrade to 0.16.20 deferred.
Reason: Upgrade requires breaking changes incompatible with current Cloudflare Workers test tooling. Package is a dev-only dependency with no production surface in the deployed Worker.
Alternatives considered: npm audit fix --force rejected due to risk of breaking miniflare and vitest-pool-workers integration.
Decided by: Project Owner

## [2026-06-29] — Dependency: vitest major-version upgrade deferred
Decision: Hold vitest at 2.1.9. Major upgrade to 4.1.9 deferred.
Reason: Upgrade requires breaking changes incompatible with current Cloudflare Workers test tooling. Package is a dev-only dependency with no production surface in the deployed Worker.
Alternatives considered: npm audit fix --force rejected due to risk of breaking miniflare and vitest-pool-workers integration.
Decided by: Project Owner

## [2026-06-29] — Dependency: wrangler major-version upgrade deferred
Decision: Hold wrangler at 3.114.17. Major upgrade to 4.105.0 deferred.
Reason: Upgrade requires breaking changes incompatible with current Cloudflare Workers test tooling. Package is a dev-only dependency with no production surface in the deployed Worker.
Alternatives considered: npm audit fix --force rejected due to risk of breaking miniflare and vitest-pool-workers integration.
Decided by: Project Owner

## [2026-06-29] — D1 migration tooling: use d1 execute --file, not migrations apply
Decision: Apply D1 migrations to the remote database using
`wrangler d1 execute mishipass --remote --file=migrations/<file>.sql`
instead of `wrangler d1 migrations apply mishipass --remote`.
Reason: Wrangler 3.114.17's migration runner splits the SQL file on
semicolons before execution. This breaks any migration containing a
BEGIN...END trigger block, since the semicolons inside the trigger body
are misinterpreted as statement boundaries. `wrangler d1 execute --file`
sends the file as a single batch and does not have this problem.
Alternatives considered: Removing trigger blocks from migrations (rejected
— triggers are needed for enforcement logic already written into the
schema). Upgrading to Wrangler 4 (deferred — already logged as a separate
dependency decision on 2026-06-29 due to breaking-change risk with the
current Cloudflare Workers test tooling).
Decided by: Project Owner

## [2026-06-29] — Default Cloudflare Worker runtime hostname rename deferred
Decision: Keep the production Worker on its configured Cloudflare Worker runtime
hostname for now. Do not retry an account-level runtime hostname rename.
Reason: An attempted rename to a non-identifying hostname did not save at the
account level despite the dashboard appearing to accept it. Cloudflare's own
documentation recommends production Workers use a custom domain rather than the
default runtime hostname. A public site or custom domain is a better long-term
fix than retrying the account-level hostname rename.
Alternatives considered: Retrying the dashboard hostname change repeatedly
(rejected — already attempted, did not save, and further attempts would consume
time needed for feature work). Purchasing a custom domain immediately (rejected
for Beta — not needed under the current cost constraint).
Decided by: Project Owner

## [2026-06-30] — Production Worker root redirects to public site
Decision: Redirect `GET /` and `HEAD /` on the Cloudflare Worker runtime to the
public GitHub Pages site.
Reason: The production Worker root previously returned `404 Not Found`, which
is not acceptable for public project review. After moving public presentation to
GitHub Pages, the Worker root should act as a clean redirect while `/api/...`
and `/c/:publicId` remain on the Worker runtime.
Alternatives considered: Leaving root as 404 (rejected — poor public
entry-point and smoke-test behavior). Keeping the Worker root as the main public
landing page (rejected — the default runtime hostname is not the preferred public
project URL).
Decided by: Project Owner

## [2026-06-30] — Dependency audit allowlist includes transitive test-tooling packages
Decision: Expand `.audit-known-issues.json` to include transitive packages
reported by `npm audit` under the already-deferred Cloudflare Workers / Vitest
/ Wrangler test-tooling chain.
Reason: `npm audit --json --workspaces` reports package keys for both direct
and transitive vulnerable packages. The additional entries are part of the same
dev/test tooling chain already deferred and do not add production Worker
runtime exposure.
Alternatives considered: Blocking the production root fix on a major
test-tooling upgrade (rejected — the root 404 fix is public-facing and the audit
packages remain development tooling). Ignoring the extra audit keys without
documenting them (rejected — future audits should be explicit and
reproducible).
Decided by: Project Owner

## [2026-06-30] — Public site moves to GitHub Pages
Decision: Use GitHub Pages as the public-facing MishiPass landing site while
keeping Cloudflare Workers as the QR/API runtime.
Reason: The public site should use a clean project URL that does not expose the
project owner's individual Cloudflare account subdomain. GitHub Pages is
sufficient for static public presentation, while QR routing, API behavior,
authentication, and D1 access remain on the locked Cloudflare Worker runtime.
Alternatives considered: Keeping the Worker root as the public landing page
(rejected — the default runtime hostname exposes an individual account subdomain).
Buying a custom domain (rejected — not needed for Beta and not aligned with the
current cost constraint). Moving runtime behavior to GitHub Pages (rejected —
GitHub Pages is static hosting and cannot replace Worker + D1 mode routing).
Decided by: Project Owner

## [2026-06-30] — Personal identifier cleanup policy
Decision: Keep the Project Owner's legal name only where it has a clear legal or
formal credit purpose, such as the LICENSE. Use Raven-V1 for GitHub account
references and role-based labels elsewhere.
Reason: The public repository and app should avoid exposing personal identity
details in application output, docs, tests, examples, and public site copy. The
LICENSE remains an appropriate place for formal ownership attribution.
Alternatives considered: Removing the legal name from every file including
LICENSE (rejected — legal attribution may be appropriate there). Keeping the
legal name throughout docs and tests (rejected — unnecessary exposure).
Rewriting Git history immediately (deferred — destructive and requires separate
explicit approval).
Decided by: Project Owner

## [2026-06-30] — Return frontend plan to Constitution path
Decision: Stop pursuing GitHub Pages as the app or frontend host. MishiPass
returns to the Constitution path: Cloudflare Worker remains production runtime,
D1 remains database, R2 remains file storage, Python remains tooling only, and
public QR mode routing remains Worker-based. The Worker root now serves a minimal
product landing page directly instead of redirecting to GitHub Pages. GitHub Pages,
if still enabled, is a temporary static landing only and must not expose
implementation structure or be expanded.
Reason: Hosting the dashboard on GitHub Pages creates architecture drift,
cross-origin auth and CORS complexity, and conflicts with the Beta stack rule
(§5). The Project Owner decided to recover schedule by returning to the original
Cloudflare-centred plan.
Alternatives considered: GitHub Pages dashboard (rejected — cross-origin
auth/CORS/CSRF complexity and privacy leakage through API host exposure).
Continuing the GitHub Pages detour (rejected — worsens schedule drift). Custom
domain (deferred — not needed for Beta under the current cost constraint).
Decided by: Project Owner

## [2026-06-30] — Status language rule: "implemented" requires manual verification
Decision: No feature or control in any project document may be described as
"implemented" based solely on code existence or passing unit tests. Until a
feature is manually verified working end-to-end (against a local stack or the
production deployment), use "backend/API exists, not manually verified" or
equivalent language. This corrects several entries in docs/security-model.md
that were written as "implemented" during the Day 6 build pass before manual
verification was possible.
Reason: Security controls and features that are coded but not verified are risks,
not guarantees. The distinction matters especially in a judge-facing security
model.
Decided by: Project Owner

## [2026-06-30] — Day 1-6 closure cleanup
Decision: Complete remaining Day 1-6 gaps before starting Day 7 Vet Visit.
Changes: Remove public GitHub repo link from Worker root page. Add
authenticated contact/privacy settings routes (GET/POST
/api/cats/:publicId/contact). Sync documentation.
Reason: Cleanup items blocking Day 7 readiness. Root page should not expose
repository structure publicly. Owner needs to control contact visibility before
the missing-mode public page is fully useful.
Alternatives considered: Deferring contact settings to Day 7 (rejected -- it is
a Day 5-6 item per Constitution Section 19 and missing mode needs it).
Decided by: Project Owner

## [2026-06-30] — Pre-Day-7 closure and docs sync
Decision: Sync all project documentation to observed pre-Day-7 status before
starting Vet Visit. Owner-scoped dashboard access enforced (PR #37/#38).
Migration 0002 (expanded cat fields) remains pending until Project Owner
explicitly approves application. Reporter IP hashing remains SHA-256 placeholder
(SIGHTING_IP_HMAC_SECRET does not exist). Worker-rendered dashboard is the
canonical Beta dashboard; apps/web React is deferred. QR page is a printable URL
card, not a generated QR image. Vet Visit, cartilla, Recovery Board, and WhatsApp
card are planned but not built.
Reason: Docs must not overclaim. Features that are not production-verified must
not be listed as working. Security posture is honest about current limitations.
Alternatives considered: Leaving docs out of sync (rejected -- misleading for
judges and future agents). Applying migration 0002 without explicit approval
(rejected -- schema changes to production require Project Owner decision).
Decided by: Project Owner

**(Superseded by the Day 1–6 final closure entry below. Historical context preserved.)**

## [2026-06-30T23:59:00-06:00] — Day 1–6 final closure: code complete, docs synchronized

Decision: Close Day 1–6 implementation and synchronize all project documentation
to reflect the actual deployed state.

Executor: Kiro
Reviewer/audit source: Codex
Branch: docs/day1-6-final-sync
Related PRs: #48 (Day 1–6 final closure implementation), #49 (promotion to main),
earlier PRs #41–#47 (incremental Day 5–6 implementation)

Deployed version: 95673ab7-5fa2-4188-a488-216d614c99f5

Summary of what was completed and deployed:
- Sighting photo upload (R2-backed, owner-only access)
- Public `/c/:publicId` durable rate limiting (D1-backed)
- Sighting submit rate limiting (D1-backed)
- R2 cat profile photo upload and display
- HMAC-SHA256 reporter IP hashing with SIGHTING_IP_HMAC_SECRET
- Magic-byte/content validation for image uploads
- MIME allowlist and size limit enforcement
- Real QR SVG/image generation
- Expanded cat profile fields (migration 0002 applied)
- Production deploy completed

Tests: 142 passing (worker + shared-validation)
Production smoke: root 200, dashboard 200, photo404 404, sighting-photo401 401

What is NOT started:
- Day 7 Vet Visit mode (branch created, no implementation)
- Digital cartilla
- WhatsApp card
- Recovery Board
- Optional modes (Travel, Adoption, Memorial, Celebration)
- V2 items

Docs synchronized in this closure:
- README updated to actual Day 1–6 state
- demo-flow updated with built photo/QR steps
- security-model updated (stale "planned" claims removed)
- sitemap implementation status clarified
- Codex checkpoint audit artifact added

Reason: Codex audit identified gaps (sighting photo not built, docs stale,
public lookup limiter missing). PR #48 remediated code gaps; this docs PR
synchronizes documentation to match the deployed truth.
Alternatives considered: Starting Day 7 with stale docs (rejected — misleading
for judges and violates Constitution Section 19 documentation requirements).
Decided by: Project Owner

---

## [2026-06-30T20:05:00-06:00] — Day 7 Vet Visit mode implementation

Decision: Implement Vet Visit mode as purely mode-gated (no vet token required).
24-hour session expiry. Save & Finish immediately returns cat to Active Profile.
No vet account in Beta.

Executor: Kiro
Branch: feature/vet-visit-mode
Related PRs: (to be assigned on PR creation)

Summary:
- Owner can start Vet Visit from dashboard (POST /api/cats/:publicId/vet-visit/start)
- Same QR/public URL renders vet entry form when mode = vet
- Public form accepts clinic name, vet name, visit date, reason, weight, notes
- Save & Finish (POST /api/cats/:publicId/vet-visit/finish) saves vet_visits record,
  marks vet_sessions finished, returns cat to active mode
- Owner can cancel (POST /api/cats/:publicId/vet-visit/cancel) returning to active
- Expired sessions (24h) render an expired state page, reject submissions
- No medical/cartilla history shown on public vet page
- No internal IDs exposed
- No vet account auth (known Beta limitation, documented)

Tests: 166 passing (133 worker + 33 shared-validation)
New tests: 22 vet visit specific + 2 updated cats tests

Not started:
- Digital cartilla UI
- WhatsApp card
- Recovery Board
- Optional modes
- V2 items

Reason: Constitution Day 7 milestone. Vet Visit completes the core mode-switching
trifecta (Active, Missing, Vet) demonstrating the same QR produces three different
experiences.
Decided by: Project Owner

---

## [2026-07-01T20:29:52.5809857-06:00] — chore: move project documentation to Beta 1.5

Decision: Move active product and documentation identity from Beta 1.4 to MishiPass Beta 1.5 while preserving historical entries that accurately describe earlier project state.

Executor: Codex
Branch: `fix/beta15-day10-v1-completion`
Commit: `cc4f50b` (implementation commit recorded before this decision-log hash correction)

Summary:
- Product/documentation identity moved to MishiPass Beta 1.5.
- Day 7-8 correction gaps closed for guest/owner language support, visual breed/color registration help, and Vet Visit cartilla input.
- Day 9 WhatsApp-ready Missing Card and public alert link implemented.
- Day 10 opt-in Recovery Board implemented with city and alert-age filters.
- Optional Version 1 items classified; optional modes remain deferred.

Reason: The active public project version is now MishiPass Beta 1.5, and docs must describe the current implemented state without rewriting accurate historical records.

Decided by: Project Owner

---

## [2026-07-02T21:25:11.7275449-06:00] — fix: complete Beta 1.5 UI/i18n/media/board acceptance corrections

Decision: Close the Beta 1.5 acceptance correction pass by normalizing visible language output, fixing responsive dashboard and selector layout, restoring camera-friendly photo inputs, and changing Recovery Board behavior so Missing alerts appear by default with public-safe fields only.

Executor: Codex
Branch: `fix/beta15-day10-v1-completion`
Commit: `4c61f95`

Summary:
- Completed language preservation across dashboard, public, owner, Cartilla, Vet Visit, WhatsApp-card, and Recovery Board surfaces.
- Removed duplicated visible breed/color inputs in favor of one final submitted value for each field.
- Added camera/gallery capture actions for sighting photos and vaccine sticker uploads.
- Added country badges and visual fallback handling for breed cards.
- Changed Recovery Board to follow Missing Alert mode by default.
- Added homepage and history-page content to reflect the Beta 1.5 product state.

Reason: Carlos requested a correction pass because the previous Beta 1.5 completion still showed mixed-language UI, overlapping controls, broken media affordances, and stale Recovery Board wording in manual screenshots.

Decided by: Project Owner

---

## [2026-07-02T02:04:33.3683832-06:00] — fix: close Beta 1.5 P1 acceptance findings

Decision: Close the P1 findings from the Beta 1.5 Local/GitHub/Constitution
audit without adding new product scope or changing D1/R2 schema.

Executor: Codex
Branch: `fix/beta15-p1-i18n-catapi-layout-report`
Commit: `c145a78`

Summary:
- Fixed homepage and history page i18n leakage by routing visible copy through
  the centralized English, Spanish, and Kazakh dictionary.
- Fixed CatAPI breed image handling so reference IDs are not blindly converted
  to `.jpg`; Bengal uses the known correct `.png` fallback and unknown images
  render clean placeholders.
- Updated the homepage cat visual to local generated white-cat-with-brown-spots
  artwork and documented asset origin in `docs/assets-licenses.md`.
- Fixed WhatsApp Card visible labels, back navigation, and share text to preserve
  the selected language.
- Improved responsive layout/scaling for homepage, dashboard cards, breed/color
  selector grids, WhatsApp Card, and Recovery Board.
- Finalized the Beta 1.5 report draft.

Validation:
- `npx tsc --noEmit --project apps/worker/tsconfig.json` passed.
- `npm test --workspace=mishipass-worker` passed: 215 tests.
- `npm test --workspace=@mishipass/shared-validation` passed: 43 tests.
- `npm run typecheck --workspace=@mishipass/shared-validation` passed.
- Production deploy and smoke are recorded in the PR/final status for this pass.

Reason: Carlos accepted the audit verdict as FAIL, not BLOCKER, and requested a
focused P1 acceptance fix pass before any judge-safe completion claim.

Decided by: Project Owner

---

## Open items (not yet decided)

Tracked in Constitution Section 23; each will be logged here when resolved:

_(All items from the initial list are now resolved — see entries above and in Constitution Section 22.)_
