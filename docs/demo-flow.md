# MishiPass — Demo Flow

Derived from Constitution Section 21 (LOCKED).

**What the demo must prove:** the same physical QR tag becomes different tools
depending on the cat's situation. The QR code itself never changes — the
TypeScript Worker reads the cat's current mode from D1 and returns the appropriate
interface.

## Built and verified

| Step | Action | What it shows |
|---|---|---|
| 1 | Register cat | System generates a public ID (e.g. `MP-MX-7X3B-9K21`) and public URL |
| 2 | QR card displays actual QR SVG/image | Real scannable QR, not just a printable URL |
| 3 | Scan QR / open public URL — Active Profile | Cat name, photo, country badge, privacy-controlled contact |
| 4 | Upload/display cat profile photo | R2-backed photo with MIME/size/magic-byte validation |
| 5 | Switch to Missing Alert | City, area, optional reward setting |
| 6 | Scan the same URL — Missing Alert | A different experience from the same URL |
| 7 | Finder submits text sighting report | Location and message; owner receives it in inbox |
| 8 | Finder submits optional photo sighting report | Photo stored in R2; rate-limited and validated |
| 9 | Owner opens sighting inbox and sees report/photo | Owner-only access to sighting photos |
| 10 | Privacy/contact settings remain owner-controlled | Relay default; owner can toggle visibility |

## Planned, not yet built

| Feature | Status |
|---|---|
| WhatsApp card | Not built |
| Vet Visit mode | Not built (Day 7 target) |
| Save and Finish Visit | Not built |
| Digital cartilla | Not built |
| Recovery Board | Not built |
| Optional modes (Travel, Adoption, Memorial, Celebration) | Not built |

## Recording notes (for Day 14)

- Keep the video under 5 minutes (submission requirement).
- Narrate in English; the URL-scan moments (steps 3, 6) are the core of the
  demo — show the same URL producing different pages.
- State explicitly on camera that the QR/URL is static and only the mode changes.
