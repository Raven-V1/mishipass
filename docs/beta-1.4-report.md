# MishiPass — Beta 1.4 Report

> **Status: WIP skeleton.** This report is finalized on Day 13 per Constitution
> Section 19, once the build is complete. The headings below are the planned
> structure; content is filled in as features are completed. Do not treat unfilled
> sections as final.

---

## 1. Overview

MishiPass is a privacy-first dynamic QR passport and recovery system for cats.
Each cat has one permanent QR code linked to a secure public ID; the owner selects
the active mode, and the same physical tag behaves differently depending on what
the cat needs.

*(Expand on outcome and scope of Beta 1.4 at finalization.)*

## 2. What was built

*(To be completed. List the delivered must-build features: owner accounts, cat
registration, public ID generation, Active Profile, Missing Alert + sighting
reports, Vet Visit + Save & Finish, digital cartilla, WhatsApp card, Recovery
Board. Note any optional modes attempted and any features deferred to V2.)*

## 3. Architecture

*(To be completed. Production request flow: QR scan → TypeScript Cloudflare Worker
→ D1 lookup → mode routing → response. Storage: D1 and R2. Python's tooling-only
role. Reference the sitemap and demo flow.)*

## 4. Security and privacy

*(To be completed. Summarize the security model: public-ID scheme and entropy,
enumeration/rate-limiting, uniqueness via D1 UNIQUE constraint, no internal-ID
exposure, private cartilla, medication records-only boundary, upload validation,
the vet-no-account Beta limitation, Dependabot, and the Aikido scan result.
Reference docs/security-model.md.)*

## 5. Known limitations

*(To be completed. Carry over the disclosed Beta limitations, e.g. vet accounts.)*

## 6. How to run

*(To be completed, or reference the README. Setup, environment, and testing
instructions; testing credentials if required.)*

## 7. Team and credits

Project Owner — project owner and orchestrator.
Zhanerke Askerbekova — Design Authority.

*(Expand with role detail at finalization.)*

---

> Finalize alongside README, security model, and demo flow on Day 13.
