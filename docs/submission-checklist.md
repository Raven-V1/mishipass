# MishiPass — Submission Checklist

Team / Registered Group: **Belvenar Analytics Development**

## Documentation

- [x] README.md complete with prerequisites, local run, test commands, tech stack
- [x] Project report complete (`docs/beta-1.5-report.md`) — office-hours template
- [x] Demo flow documented (`docs/demo-flow.md`)
- [x] Security model documented (`docs/security-model.md`)
- [x] Decision log maintained (`docs/decision-log.md`)
- [x] Days 1–10 audit artifact (`docs/audits/beta15-days1-10-final-status-2026-07-02.md`)
- [x] Design page inventory (`docs/design/zhanerke-page-inventory.md`)

## Demo Video

- [ ] Recorded at minimum 720p
- [ ] Duration 5–10 minutes (under 5 preferred)
- [ ] First 30–45 seconds introduce project and problem
- [ ] Shows key features only; dead space cut
- [ ] QR static / mode dynamic clearly stated on camera
- [ ] Uploaded / linked in submission

## Source Code

- [x] Source code present in repository
- [x] Documentation in `docs/` folder
- [x] No `node_modules/` in repo or submission package
- [x] No `dist/` or build output committed
- [x] No `.wrangler/` state committed (gitignored)
- [x] No personal/paid API keys committed
- [x] TheCatAPI key is optional, free-tier, set as Worker secret only
- [x] Test/demo credentials are local `.dev.vars` only (gitignored)

## Repository State

- [x] GitHub URL: https://github.com/Raven-V1/mishipass
- [x] Production URL: https://mishipass.carlosvelazquez354.workers.dev
- [x] Open PRs: 0 (after auth/logto-google-apple merge)
- [x] Remote branches: main, dev only (after auth branch merge)
- [x] main and dev synced (after auth branch merge)
- [x] All tests passing (286 total: 243 worker + 43 shared)
- [x] TypeScript typecheck clean

## Security

- [x] No internal database IDs exposed publicly
- [x] No raw R2 keys in any response
- [x] No owner identity on public pages
- [x] HMAC-SHA256 IP hashing with dedicated secret
- [x] Google/Apple OIDC routes implemented via Logto (code present; config pending in production)
- [x] No AI/LLM runtime on production request path
- [ ] Aikido security scan report (scheduled, not yet completed)

## Production Smoke

- [x] `GET /` → 200
- [x] `GET /dashboard` → 200
- [x] `GET /api/cat-reference/breeds` → 200
- [x] `GET /c/invalid` → 404
- [x] Breed endpoint returns real image URLs
- [x] No secret markers in breed response

## Package / ZIP (if required)

- [ ] Confirm package does not include `node_modules/`
- [ ] Confirm package does not include `.wrangler/`
- [ ] Confirm package does not include executables
- [ ] Confirm package size is reasonable
- [ ] README at root of package

## Constitution Alignment

- [x] Beta 1.5 label used (updated from Beta 1.4)
- [x] Days 1–10 must-build scope verified complete
- [x] Medication Record is documentation-only (no advice/reminders)
- [x] No official passport/government document framing
- [x] No social network or marketplace features
- [x] Privacy-first: public/private boundaries respected
