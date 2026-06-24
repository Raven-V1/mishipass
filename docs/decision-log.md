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
Decided by: Carlos
```

---

## 2026-06-24 — Project license: proprietary, all rights reserved
Decision: License the repository as proprietary "all rights reserved" (Carlos
Velazquez and Zhanerke Askerbekova), with a limited clause granting hackathon
organisers and judges permission to access, run, and test the project solely for
judging.
Reason: MishiPass is intended to continue as a product beyond the hackathon; the
team wishes to retain full ownership. The hackathon requires only that judges can
access and run the project, which the limited clause satisfies.
Alternatives considered: MIT (rejected — permits unrestricted reuse of a product
the team intends to continue). No license / silence (rejected — ambiguous, and
could appear to contradict the judge-access requirement).
Decided by: Carlos

## 2026-06-24 — Constitution kept local, not committed to the public repo
Decision: The full Project Constitution is maintained locally by Carlos and is
not committed to the public GitHub repository. CLAUDE.md references it as the
local source of truth.
Reason: The repository is public. The constitution contains internal strategy and
language that frames how judge questions are anticipated; publishing it shifts
framing from "what was built" to internal planning. Judge-facing explanations
(static-QR clarification, ID-enumeration note) live in the README and security
model instead, written for judges.
Alternatives considered: Commit the full constitution for transparency (rejected —
exposes internal framing). Commit a sanitized constitution (deferred — CLAUDE.md
already carries the operational subset). Move it to an in-repo "internal" folder
(rejected — anything in a public repo is public).
Decided by: Carlos

## 2026-06-24 — CLAUDE.md added to the repository (addition to locked Section 12)
Decision: Add a sanitized CLAUDE.md operating guide at the repo root, though it is
not listed in the locked Section 12 structure.
Reason: Terminal agents read CLAUDE.md automatically; an in-repo operating guide
improves alignment. It is a distillation of the constitution with judge-perception
language removed.
Alternatives considered: Rely only on the local constitution (rejected — agents do
not read local-only files automatically).
Decided by: Carlos

## 2026-06-24 — Attribution: Zhanerke Askerbekova named in full
Decision: Zhanerke Askerbekova is named by full name and title (Design Authority),
as an integral team member and co-owner, in all documentation and deliverables
where attribution is appropriate, alongside Carlos Velazquez.
Reason: She is integral to the team and the design authority; attribution should
reflect that consistently across public-facing materials.
Alternatives considered: First-name-only references as in the original
Constitution Section 8 (rejected — incomplete attribution for a public repo and
co-owner).
Decided by: Carlos

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
Decided by: Carlos

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
Decided by: Carlos

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
Decided by: Carlos

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
Decided by: Carlos

## 2026-06-24 — Kiro track participation paused
Decision: Kiro-track work is paused for now. The scaffold omits the optional
`.kiro` folder; it can be added if the team opts back in before submission.
Reason: Initial setup is focused on core repo and tooling; the Kiro opt-in is
optional and reversible before the deadline.
Alternatives considered: Scaffold the `.kiro` folder now (deferred — not needed
unless opting into the Kiro track).
Decided by: Carlos

---

## Open items (not yet decided)

Tracked in Constitution Section 23; each will be logged here when resolved:

- Frontend framework: React vs plain HTML/CSS/JS
- Owner authentication method
- D1 schema field definitions
- Root workspace config (root `package.json` workspaces + base `tsconfig.json`)
