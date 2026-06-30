# MishiPass

MishiPass is a privacy-first dynamic QR passport and recovery system for cats.

Each cat gets one permanent QR code. The owner selects the active mode; the same
physical tag behaves differently depending on what the cat needs.

## Working now

- Owner registration, login, logout (PBKDF2-SHA256, HttpOnly session cookies)
- Owner dashboard (Worker-rendered HTML, same-origin)
- Cat registration with country selection
- Public cat ID generation (Crockford Base32, ~40 bits entropy)
- Active Profile public page
- Missing Alert mode with mode switching
- Public sighting report form (text-only, rate-limited)
- Owner sighting report inbox
- Owner-scoped dashboard pages (non-owners cannot view other owners' cats)
- Printable public URL card per cat
- Contact/privacy settings with relay default

## Planned (not yet built)

- Vet Visit mode with temporary session
- Save and Finish Visit auto-return to Active
- Digital cartilla (vet visits, vaccines, medications as documentation only)
- Community Recovery Board with city filters
- WhatsApp-ready missing card and shareable image
- Expanded cat profile fields (pending database migration)
- QR image generation (currently printable URL card only)
- R2 photo upload and display
- Durable rate limiting

## Privacy

- Public pages use MishiPass public IDs, not internal database IDs.
- Owner contact visibility is owner-controlled; default is relay mode.
- Medical and cartilla records are private, owner-dashboard only.
- Medication entries are documentation-only records.
- No owner full name, email, or exact address is shown publicly.
- Reporter IP addresses are hashed before storage (SHA-256 placeholder;
  HMAC-SHA256 with dedicated secret is a pending security hardening item).
