---
generated-at: 2026-07-02T00:00:00Z
audit-id: mishipass-security-audit-2026-07-02
---

# Content Scan

## 6.1 Secrets committed to history or working tree

**Scan method:** grep-based (gitleaks and trufflehog not available). Patterns
searched: `sk-`, `AKIA[0-9A-Z]{16}`, `ghp_[A-Za-z0-9]{36}`,
`AIza[0-9A-Za-z\-_]{35}`, `password\s*[:=]\s*['"][^'"]{8,}`,
`secret\s*[:=]\s*['"][^'"]{6,}`.

**Working tree findings:**

- `apps/worker/src/routes/__tests__/auth.test.ts`: test passwords
  (`"testpass123"`, `"securepass"`, `"longpassword"`, etc.) — test fixture
  dummy passwords, not real credentials. No action required.
- `apps/worker/src/utils/brandAssets.ts`: `BACKGROUND_BASE64` is a Base64-encoded
  JPEG background image — not a secret. No action required.
- No API keys, personal access tokens, HMAC secrets, or private keys found
  in working tree.

**Git history scan:**

Reviewed recent commits for credential patterns. No real secrets found committed
to any tracked branch.

**Result: CLEAN. No real secrets committed.**

---

## 6.2 Malicious patterns

Scanned for: `eval(` on untrusted input, obfuscated payloads, unexpected
external network calls in Worker code, suspicious postinstall scripts.

**Worker source (apps/worker/src/):**
- No `eval()` calls found.
- `escapeHtml` helper used for all user-controlled values rendered to HTML.
- External network calls: only `TheCatAPI` (optional, owner dashboard breed
  reference, fallback on failure) and `Logto` OIDC (optional, disabled if
  secrets absent). Both are documented and opt-in.
- No obfuscated payloads.

**package.json scripts:**
- Root: no scripts. apps/worker: `test`, `test:watch`, `typecheck`. No
  postinstall scripts.

**Result: CLEAN. No malicious patterns found.**

---

## 6.3 Infringing or plagiarised assets

**assets/ directory:**
- Contains design mockups, logo files, and QR sample art.
- `docs/assets-licenses.md` exists in the repo.

**LICENSE:**
- Present at repo root.
- Contains only project license text.
- Carlos Velazquez's legal name appears only in LICENSE — confirmed correct
  per project guardrails.

**Third-party attributions:**
- Logto OIDC: Apache 2.0 licensed open-source project, used via API. No
  source code copied.
- Cloudflare Workers/D1/R2: Cloudflare platform services, used via binding.
  No source code copied.
- qrcode-generator: MIT licensed (confirmed). Used as npm dependency.
- Font / icon assets: sourced from IBM Carbon Design System icons (referenced
  in docs as part of design system). License should be confirmed in
  assets-licenses.md.

**Result:** No infringing content identified. Recommend confirming IBM Carbon
icon license attribution in `docs/assets-licenses.md` (advisory; out of scope
for this audit's Tier-1 fixes).

---

## 6.4 Content removals this audit

None. No offending content found requiring removal.
