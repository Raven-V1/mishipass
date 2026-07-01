# MishiPass

MishiPass is a privacy-first dynamic QR passport and recovery system for cats.

Each cat gets one permanent QR code. The owner selects the active mode; the same
physical tag behaves differently depending on what the cat needs.

## Working now

- Owner registration, login, logout (PBKDF2-SHA256, HttpOnly session cookies)
- Owner dashboard (Worker-rendered HTML, same-origin)
- Cat registration with country selection
- Expanded cat profile fields (breed, color, weight, chip number, notes)
- Public cat ID generation (Crockford Base32, ~40 bits entropy)
- Real QR SVG/image generation
- Printable QR card
- Active Profile public page
- Missing Alert mode with mode switching
- Public sighting report form with text and optional photo
- Owner sighting report inbox
- Owner-only sighting photo viewing
- Owner-scoped dashboard pages (non-owners cannot view other owners' cats)
- Contact/privacy settings with relay default
- R2 cat profile photo upload and display
- R2 sighting photo upload and storage
- MIME allowlist, size limit, and magic-byte validation for image uploads
- HMAC-SHA256 reporter IP hashing (with SIGHTING_IP_HMAC_SECRET)
- D1-backed durable rate limiting for sighting submit and public cat lookup
- No raw IP storage
- No raw R2 key exposure

## Planned (not yet built)

- Vet Visit mode with temporary session
- Save and Finish Visit auto-return to Active
- Digital cartilla (vet visits, vaccines, medications as documentation only)
- Community Recovery Board with city filters
- WhatsApp-ready missing card and shareable image
- Optional modes (Travel, Adoption, Memorial, Celebration, Public Preview)

## Privacy

- Public pages use MishiPass public IDs, not internal database IDs.
- Owner contact visibility is owner-controlled; default is relay mode.
- Medical and cartilla records are private, owner-dashboard only.
- Medication entries are documentation-only records.
- No owner full name, email, or exact address is shown publicly.
- Reporter IP addresses are hashed with HMAC-SHA256 using a dedicated secret
  before storage. No raw IP is ever persisted.
- Cat profile photos are served through Worker media routes, not raw R2 URLs.
- Sighting photos are owner-only; raw R2 keys are never exposed to clients.
