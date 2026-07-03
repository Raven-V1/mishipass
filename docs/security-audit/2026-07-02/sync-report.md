---
generated-at: 2026-07-02T00:00:00Z
audit-id: mishipass-security-audit-2026-07-02
---

# Pre-Audit Sync Report

## Git Status (pre-branch-cut)

```
# branch.oid d2209cf3cebe95b79f0ef63ea16fca3d8cb43c9a
# branch.head main
# branch.upstream origin/main
# branch.ab +0 -0
? .codex-smoke/cdp-capture.mjs (untracked)
? .codex-smoke/edge-profile/ (untracked)
? .codex-smoke/mockup-redo-visual-match/ (untracked)
```

## Ahead/Behind Status (as of 2026-07-02T00:00:00Z)

| Branch | Ahead origin | Behind origin |
|---|---|---|
| main | 0 | 0 |
| dev | 0 | 0 |

## Open PRs

None (gh pr list returned empty array).

## Dependabot Alerts

Count: 0 (gh api dependabot/alerts returned empty array).
No outstanding vulnerability alerts at audit start.

## Uncommitted / Untracked Work

- `.codex-smoke/cdp-capture.mjs` — browser smoke test script (untracked, not staged)
- `.codex-smoke/edge-profile/` — Edge browser profile dir (untracked, not staged)
- `.codex-smoke/mockup-redo-visual-match/` — visual match artifacts (untracked, not staged)

These are browser/tooling artifacts. Stash was attempted but aborted due to CRLF
line-ending warnings in the Edge profile binaries. Since these files are untracked
they do not affect the working tree for branch creation. Disposition: added
`.codex-smoke/` to `.gitignore` on this branch; files will not be committed.
No pre-audit stash was created; no files were dropped.

## Branch Creation

Branch `security/full-audit-2026-07-02` cut from `main` at
`d2209cf3cebe95b79f0ef63ea16fca3d8cb43c9a` on 2026-07-02T00:00:00Z.

## Final Sync Verification

(Populated at Phase 12 after merge.)
