# MishiPass — Security Model

Scope: MishiPass Beta 1.4. This document records the security and privacy
properties of the system. Sections derived from locked decisions are final;
sections that depend on implementation not yet built are marked **(WIP — Day 13)**
and are finalized during the Day-13 security pass.

---

## 1. Public identifiers

Public cat URLs use the format `/c/MP-<CC>-<S1>-<S2>` — never `/cat/1` or any
internal database identifier.

- **CC** is a 2-letter country segment. It is **cosmetic display context only**,
  not a security boundary, and contributes no uniqueness. It is visible on the
  physical tag and is not relied upon for any access decision.
- **S1, S2** are each 4 characters from the Crockford Base32 alphabet
  (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`; I, L, O, U excluded to avoid misreads),
  generated with a CSPRNG (`secrets` in tooling; the Worker's equivalent in
  production).

**Entropy:** the two random segments provide ~40 bits (≈1.1×10¹² combinations),
which makes brute-force enumeration of valid IDs infeasible.

**Enumeration resistance** comes from entropy **plus** per-IP rate limiting on the
public `/c/` lookup route — not from the country code. **(WIP — Day 13:** confirm
the rate-limit threshold and that it is enforced at the Worker.**)**

**Uniqueness** is guaranteed by the data layer, not by random generation alone:
the D1 schema places a `UNIQUE` constraint on the public-ID column, and the Worker
retries generation on a constraint violation. **(WIP — Day 13:** verify the
constraint and retry path once the data layer exists.**)**

**Internal IDs:** the internal database primary key is never serialized into any
client response. The public ID is the only external identifier.

**Static-QR clarification:** the QR code itself is static. The Worker reads the
cat's current mode from D1 and returns the appropriate interface; the owner
changes the mode. The QR never changes. (Documented here and in the README so the
"dynamic" behavior is not mistaken for a changing QR code.)

---

## 2. Access model

- **Public surfaces** show only mode-appropriate, non-sensitive information.
  Scanning a QR grants **read-only** access to the public profile in its current
  mode. No management or edit capability is reachable from a scan.
- **Owner dashboard** (registration, mode switching, cartilla, settings) requires
  an authenticated owner session. **(WIP — Day 13:** document the chosen auth
  method once decided — see open items.**)**
- **Temporary vet access** is reachable only while the cat is in Vet Visit mode.

---

## 3. Privacy principles (from locked Section 7)

- Owner controls contact visibility; the default is the MishiPass relay form.
- No owner full name or exact address is shown publicly.
- Medical/cartilla data is private — owner dashboard only.
- **Medication entries are never shown on any public QR profile in any mode**, and
  are records only (no advice, dosage, interactions, or reminders).
- The Recovery Board is owner opt-in and is not shown by default.
- The reward amount is hidden by default; the owner may choose to reveal it.
- No nearby-user pings. No automatic user location tracking.

---

## 4. Input handling and uploads

- Public sighting-report uploads come from unauthenticated finders and must
  enforce **file-type validation, size limits, and per-IP rate limiting**.
- All uploads validate type, size, and content. **(WIP — Day 13:** record the
  concrete limits and validation implementation once built.**)**

---

## 5. Known Beta limitations (disclosed)

- **Vet accounts:** a vet does not need an account in Beta. Anyone who scans the
  QR while it is in Vet Visit mode could submit a record. This is a known Beta
  limitation, mitigated by the temporary, auto-expiring session, and is disclosed
  here intentionally.

---

## 6. Dependency and tooling security

- **Dependabot** monitors vulnerable dependencies (npm for `apps/web` and
  `apps/worker`, pip for `tools/python`). It is a development/security tool, not a
  product feature.
- **Aikido** security scan to be run during the Day-13 security pass; the scan
  report will be included in the submission for the Security category.
  **(WIP — Day 13.)**

---

> Sections marked **(WIP — Day 13)** are completed during the Day-13 security and
> documentation pass per Constitution Section 19. The locked properties in
> Sections 1–3 and 5 are final.
