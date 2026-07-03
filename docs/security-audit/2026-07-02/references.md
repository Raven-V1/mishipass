---
generated-at: 2026-07-02T00:00:00Z
audit-id: mishipass-security-audit-2026-07-02
---

# References and Attribution

The following sources guided the security strategy, threat modeling, control
selection, and framework mapping used in this audit and in `docs/security-model.md`.
Listed for attribution and guidance credit only. No source text is reproduced.

---

## Web application security concepts and common threats

**Cloudflare — What is web application security?**
Publisher: Cloudflare, Inc.
Title: "What is web application security?"
URL: https://www.cloudflare.com/learning/security/what-is-web-application-security/
Accessed: 2026-07-02

**OWASP Top 10**
Publisher: OWASP Foundation
Title: OWASP Top Ten Web Application Security Risks
URL: https://owasp.org/www-project-top-ten/
Accessed: 2026-07-02

Controls mapped: input validation, injection prevention, auth session management,
sensitive data exposure, XSS, CSRF (SameSite cookies), security misconfiguration.

---

## Cloudflare platform and product guidance

**Cloudflare Resource Hub — Solution and Product Guides**
Publisher: Cloudflare, Inc.
URL: https://www.cloudflare.com/resource-hub/?resourcetype=Solution+%26+Product+Guides
Accessed: 2026-07-02

**Cloudflare Resource Hub — Whitepapers**
Publisher: Cloudflare, Inc.
URL: https://www.cloudflare.com/resource-hub/?resourcetype=Whitepaper
Accessed: 2026-07-02

**Cloudflare Developer Documentation**
Publisher: Cloudflare, Inc.
URL: https://developers.cloudflare.com/directory/
Accessed: 2026-07-02

Topics covered: Workers security model, D1 query binding (parameterized queries),
R2 access control, Durable Objects, KV rate limiting patterns, HMAC in Workers.

---

## Application security lifecycle

**IBM Documentation — WebSphere Application Server 9.0.5 — Securing applications and their environment**
Publisher: IBM
URL: https://www.ibm.com/docs/en/was/9.0.5?topic=securing-applications-their-environment
Accessed: 2026-07-02

Used for: control structuring, defence-in-depth layering, audit evidence organization.

**IBM Documentation — WebSphere Application Server 9.0.5 — Authenticating users**
Publisher: IBM
URL: https://www.ibm.com/docs/en/was/9.0.5?topic=security-authenticating-users
Accessed: 2026-07-02

Used for: authentication pattern reference (session token model, credential hashing).

**IBM Redbook SG24-8100 — Using the IBM Security Framework and IBM Security Blueprint**
Publisher: IBM
URL: https://www.redbooks.ibm.com/abstracts/sg248100.html
Accessed: 2026-07-02

Used for: risk decision documentation, audit evidence structure.

---

## Governance and framework mapping

**NIST Cybersecurity Framework 2.0**
Publisher: National Institute of Standards and Technology
URL: https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
Published: February 26, 2024
Accessed: 2026-07-02

Controls mapped to: Govern, Identify, Protect, Detect, Respond, Recover functions.

**CISA Secure by Design Pledge**
Publisher: Cybersecurity and Infrastructure Security Agency
URL: https://www.cisa.gov/securebydesign/pledge
Published: May 8, 2024
Accessed: 2026-07-02

Controls mapped to: MFA goal, default password goal, vulnerability class reduction
goal, patching goal.

---

## Secure SDLC

**NIST SP 800-218 — Secure Software Development Framework (SSDF)**
Publisher: National Institute of Standards and Technology
URL: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218.pdf
Accessed: 2026-07-02

Used for: secure development lifecycle practice reference (design, code review,
testing, dependency management).

---

## Verification and testing requirements

**OWASP Application Security Verification Standard (ASVS)**
Publisher: OWASP Foundation
URL: https://owasp.org/www-project-application-security-verification-standard/
Accessed: 2026-07-02

Used for: verification requirements reference (authentication, session management,
input validation, access control, file upload security).
