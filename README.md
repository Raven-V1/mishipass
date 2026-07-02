# MishiPass Beta 1.5

MishiPass is a privacy-first dynamic QR passport and recovery system for cats.

Each cat gets one permanent QR code. The owner selects the active mode; the same
physical tag behaves differently depending on what the cat needs.

## Working now

- Owner registration, login, logout (PBKDF2-SHA256, HttpOnly session cookies)
- Owner dashboard (Worker-rendered HTML, same-origin)
- Cat registration with country selection
- Visual breed/color registration assist with TheCatAPI fallback
- Expanded cat profile fields (breed, color, weight, chip number, notes)
- Public cat ID generation (Crockford Base32, ~40 bits entropy)
- Real QR SVG/image generation
- Printable QR card
- Active Profile public page
- Missing Alert mode with mode switching
- WhatsApp-ready missing card with public alert link
- Opt-in Recovery Board with city and alert-age filters
- Vet Visit mode with temporary 24-hour session
- Save & Finish Visit can record vet visit, vaccines, vaccine sticker photo, and Medication Record before auto-return to Active Profile
- Owner-only Digital Cartilla for vet visits, vaccines, Medication Record, and sticker photos
- Guest and owner language support for English, Spanish, and Kazakh
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

## Deferred Version 1 optional items

- Optional modes (Travel, Adoption, Memorial, Celebration, Public Preview)

## Privacy

- Public pages use MishiPass public IDs, not internal database IDs.
- Owner contact visibility is owner-controlled; default is relay mode.
- Medical and cartilla records are private, owner-dashboard only.
- Medication Record entries are documentation-only records. MishiPass does not
  provide dosage recommendations, interaction checks, reminders, refill tracking,
  treatment plans, or medical advice.
- Recovery Board is off by default and owner opt-in only.
- No owner full name, email, or exact address is shown publicly.
- Reporter IP addresses are hashed with HMAC-SHA256 using a dedicated secret
  before storage. No raw IP is ever persisted.
- Cat profile photos are served through Worker media routes, not raw R2 URLs.
- Sighting photos are owner-only; raw R2 keys are never exposed to clients.
