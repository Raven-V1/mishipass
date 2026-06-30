# MishiPass — Kiro Track Tracking Checklist

Not for submission yet. This is a running checklist so Kiro Track evidence gets
collected as we go, instead of reconstructed at the deadline. Lives at
`docs/kiro-track-checklist.md`.

---

## Why this exists

Per the hackathon rules (Section 11 / Section 6 "Kiro Track Opt-in"), placed
winners (1st-10th) only receive the placement-based Kiro Pro+ subscription if
they: (a) place 1st-10th, (b) actually used Kiro as part of the project, and
(c) opt in on the submission form with a short write-up plus a link to the
project's `.kiro` folder. Participation credits (the flat per-participant
credits) do not require any of this — only the placement-based Pro+ months do.

Two things have to exist by submission day:

1. A `.kiro` folder in the repo (or a ZIP of it), if Kiro's own
   spec/steering/hook artifacts are part of how it was used.
2. A short write-up: how Kiro was actually used on this project.

## Current status: not yet opted in

The decision log (`docs/decision-log.md`, 2026-06-24) currently records:

> **Kiro track participation paused** — the scaffold omits the optional
> `.kiro` folder; it can be added if the team opts back in before submission.

That decision predates the work below. Carlos should decide explicitly
whether to log a follow-up decision opting back in — this checklist doesn't
make that call, it just tracks the evidence in case the answer is yes.

## What's actually happened with Kiro so far

For the record, in case the write-up draws on it:

- Kiro ran a bounded correction task on the D1 access layer: removed an
  incorrect runtime foreign-key PRAGMA helper (`enableForeignKeys()`),
  confirmed D1's default FK enforcement was sufficient, and fixed the worker's
  Vitest configuration (`nodejs_compat` compatibility flag, D1 migration
  binding for the test pool).
- Kiro made a small, separately-scoped docs correction to
  `docs/feature-specs/d1-schema.md` (tightened wording on PBKDF2 iteration
  claims and a stale migration filename).
- With Carlos's one-time explicit authorization, Kiro committed, pushed,
  opened PR #6 (`feature/d1-access-layer` into `dev`), squash-merged it, and
  applied branch protection to `main` (require 1 approving review, no force
  pushes, no deletions).

This was all bounded, single-purpose task execution rather than Kiro's
spec/steering/hooks workflow — worth knowing before drafting the write-up,
since judges may distinguish "used Kiro's IDE features" from "used Kiro as a
terminal agent for scoped corrections."

## Open question for Carlos

If the team opts in, decide which framing the write-up uses:

- **As executed so far** — describe the bounded-task usage above (FK
  correction, test-config fix, Git/GitHub workflow with explicit
  authorization gates). No `.kiro` folder content exists yet under this
  framing unless Kiro happens to generate one as a side effect.
- **Expanded usage** — deliberately use Kiro's specs/steering/hooks features
  for some remaining Day 3+ work, which would produce real `.kiro/specs`,
  `.kiro/steering`, or `.kiro/hooks` content worth linking directly.

Either is fine under the rules (the write-up just needs to be honest about
what happened) — this is a positioning decision, not a build decision, so
it doesn't need the full Claude/ChatGPT alignment loop. Carlos decides and,
if opting in, logs it in `docs/decision-log.md`.

## Checklist (fill in before submission, not now)

- [ ] Decision logged: opted in / staying paused
- [ ] `.kiro` folder exists in the repo (or confirmed not applicable)
- [ ] `.kiro` folder link ready: `https://github.com/Raven-V1/mishipass/tree/main/.kiro`
      (only valid once it exists on `main`)
- [ ] Write-up drafted (a few sentences: specs, steering, hooks, or bounded-task
      usage — whichever applies)
- [ ] Submission form's optional Kiro field completed
