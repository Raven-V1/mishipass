# UI Action Matrix

Last updated: 2026-07-05
Branch: `fix/zhanerke-production-redesign`

## Status Legend

- `AUDIT`: current implementation inspected
- `PENDING`: implementation/test work still required
- `PASS`: final verified result
- `FAIL`: known defect remains

## Matrix

| Page | Visible control | Expected action | Actual implementation | API or destination | Current defect | Final test result |
|---|---|---|---|---|---|---|
| Landing | `About` | Scroll to About section | Anchor link | `#about` | Works locally, but page structure still needs redesign parity | AUDIT / PENDING |
| Landing | `Features` | Scroll to Features section | Anchor link | `#features` | Works locally, but desktop/mobile hierarchy still off | AUDIT / PENDING |
| Landing | `How it works` | Scroll to section | Anchor link | `#how-it-works` | Works locally | AUDIT / PENDING |
| Landing | `Contact` | Scroll to section | Anchor link | `#contact` | Works locally | AUDIT / PENDING |
| Landing | `Sign up` | Go to real sign-up flow | Anchor to login area | `#sign-up` | Not a real sign-up route or registration workflow | FAIL |
| Landing | `Log In` | Authenticate and enter dashboard | JS submit handler | `POST /api/auth/login` then `/dashboard` | Works, but no field-level validation and surrounding layout still diverges | AUDIT / PENDING |
| Landing | `Forgot password` | Real recovery flow or honest unavailable state | Link to dashboard | `/dashboard?lang=...` | Wrong destination; misleading | FAIL |
| Landing | `Remember me` | Persist session preference or reflect honest no-op state | Checkbox only | none | Decorative only; no persistence behavior | FAIL |
| Landing | `Google` | Start Google auth if configured, else be disabled | Disabled button when not configured | `/api/auth/logto/google` only when configured | Honest disabled state already present when unavailable | AUDIT / PENDING |
| Landing | `Apple` | Start Apple auth if configured, else be disabled | Disabled button when not configured | `/api/auth/logto/apple` only when configured | Honest disabled state already present when unavailable | AUDIT / PENDING |
| Dashboard | `Register a Cat` | Navigate to dedicated registration page | Tab/button inside dashboard shell | in-page dashboard state | Wrong IA; registration is embedded instead of separate route | FAIL |
| Dashboard | `Contact & Privacy` | Open contact/privacy settings | Dashboard tab/button | in-page dashboard state | Global tab exists, but cat-specific approved owner settings page is missing | FAIL |
| Dashboard | `Settings` | Open owner settings | Dashboard tab/button | in-page dashboard state | Works as tab, but not aligned to approved page structure | AUDIT / PENDING |
| Dashboard | `Missing Cat Board` | Open missing/recovery board | Dashboard tab/button | in-page dashboard state | Route exists separately at `/recovery-board`, dashboard uses tab metaphor instead | FAIL |
| Dashboard cat card | `Details` | Open owner cat detail | Link | `/dashboard/cats/:id` | Works | AUDIT / PENDING |
| Dashboard cat card | `View Public Profile` | Open owner-facing public profile/QR settings page or explicit public preview per approved flow | Direct public page link | `/c/:id` | Sends owner straight to public page; approved owner control page missing | FAIL |
| Dashboard cat card | `QR Card` | Open printable QR tag page | Link | `/dashboard/cats/:id/qr` | Route works, but page content violates approved front/back rule | FAIL |
| Dashboard cat card | `Digital Cartilla` | Open cartilla page | Link | `/dashboard/cats/:id/cartilla` | Works | AUDIT / PENDING |
| Dashboard cat card | `Photo Upload` | Open or trigger photo workflow | Not present as standalone action on current card except gallery/detail flows | detail/gallery routes | Approved dashboard action missing | FAIL |
| Dashboard cat card | `Report Missing` | Switch cat to missing with real missing data | JS handler and inline missing fields | `POST /api/cats/:id/missing` | Works, but interaction is nested into the dashboard card and not aligned to approved action bar | AUDIT / PENDING |
| Dashboard cat card | `Start Vet Visit` | Start temporary vet mode | JS handler with confirm | `POST /api/cats/:id/vet-visit/start` | Works, but needs end-to-end verification with Save & Finish | AUDIT / PENDING |
| Dashboard cat card | `Delete` | Soft-delete owned cat | JS handler with confirm | `POST /api/cats/:id/remove` | Works, but visual layout still not aligned | AUDIT / PENDING |
| Dashboard | `Logout` | End session | Button/form or JS fetch | `POST /api/auth/logout` | Works | AUDIT / PENDING |
| Dashboard | `Language` | Load/save owner language | JS save flow | `GET/POST /api/settings` | Works for owner settings, but page structure still wrong | AUDIT / PENDING |
| Registration | `Back to Dashboard` | Return without duplicating forms | Not a standalone route yet | dashboard state | Dedicated route missing | FAIL |
| Registration | `Profile Photo upload` | Select/upload photo for new cat | Preview-only file input | local preview only | Not wired to persisted create flow | FAIL |
| Registration | `Color selectors` | Set one source-of-truth field | JS button selection | create-cat payload | Works, but embedded in dashboard state | AUDIT / PENDING |
| Registration | `Breed search` | Filter breed options | JS input filter | `/api/cat-reference/breeds` source | Works | AUDIT / PENDING |
| Registration | `More breeds` | Expand list | JS buttons | in-page state | Works | AUDIT / PENDING |
| Registration | `Cancel` | Leave registration safely | JS state reset/confirm | in-page dashboard state | No dedicated page to navigate away from | FAIL |
| Registration | `Next: Review & Save` | Create cat once with one submit path | JS submit handler | `POST /api/cats` | API works, but route/page architecture is wrong | AUDIT / PENDING |
| Owner public profile page | `Download QR` | Download usable QR asset | Missing | none | Not implemented on current owner surfaces | FAIL |
| Owner public profile page | `Print QR` | Trigger print flow | Missing on owner settings surface | none | Owner settings surface missing | FAIL |
| Owner public profile page | `Copy Link` | Copy real public URL | Implemented only on printable QR page | runtime clipboard | Wrong page and incomplete approved layout | FAIL |
| Owner public profile page | visibility toggles | Load, change, save persisted values | No dedicated toggle UI for approved controls | contact settings API only partially available | Approved toggles missing | FAIL |
| Owner public profile page | `Back` | Return to prior owner page | Missing | none | Owner settings surface missing | FAIL |
| Owner public profile page | `Save Changes` | Persist toggles | Missing | none | Owner settings surface missing | FAIL |
| QR Card | `Download PDF` | Download printable file | Missing | none | No download action exists | FAIL |
| QR Card | `Print Card` | Open print workflow | Button | `window.print()` | Works, but print content still structurally wrong | AUDIT / PENDING |
| Missing public page | `Report a sighting` | Open sighting form | Link | `/c/:id/sighting` | Works | AUDIT / PENDING |
| Missing owner page | `Open public alert` | Open current public missing page | Link | `/c/:id` | Works | AUDIT / PENDING |
| Missing owner page | poster/share action | Open poster/share workflow | WhatsApp card page only | `/dashboard/cats/:id/missing-card` | Naming and layout diverge from approved missing poster flow | FAIL |
| Adoption public page | `Request to Adopt` | Submit real transfer request | JS button handler | `POST /api/cats/:id/request-transfer` | Real action exists; design source still needs final alignment | AUDIT / PENDING |
| Sighting form | location input | Capture human-readable location | Text input | form POST | Works | AUDIT / PENDING |
| Sighting form | `Use my location` | Attach real coordinates | JS geolocation | hidden `lat` / `lng` fields | Works, but approved search/drop-pin map UI is still not met | AUDIT / PENDING |
| Sighting form | `Clear pin` | Remove attached coordinates | JS handler | clears hidden fields | Works | AUDIT / PENDING |
| Sighting form | photo upload | Attach valid image | multipart upload | `POST /c/:id/sighting` | Server validates, but create-side UI still needs approved layout polish | AUDIT / PENDING |
| Sighting form | `Cancel` | Return to public profile | Link | `/c/:id` | Works | AUDIT / PENDING |
| Sighting form | `Submit Report` | Submit once and show success | Form submit | `POST /c/:id/sighting` | Works, but success state uses generic empty-state illustration page | AUDIT / PENDING |
| Cartilla empty state | `Add Vaccine` | Jump to vaccine workflow | Anchor | `#vaccine-form` | Works only within page; approved CTA behavior should be clearer | AUDIT / PENDING |
| Cartilla empty state | `Add Vet Visit` | Open vet visit workflow | Link | `/dashboard/cats/:id` | Wrong destination for approved dedicated flow | FAIL |
| Vaccine page | `Cancel` | Return safely | Link | `/dashboard/cats/:id` | Works, but not ideal if page becomes dedicated section/route | AUDIT / PENDING |
| Vaccine page | `Save Vaccine` | Persist full form data | JS submit posts partial payload | `POST /api/cats/:id/vaccines` | UI collects more fields than current request sends | FAIL |
| Vaccine page | history entries | Show real saved history | server-rendered records | vaccines list | Works, but layout/detail density differs from mockup | AUDIT / PENDING |
| Vet visit | `Add Vet Visit` | Open/start visit workflow | Links/buttons in dashboard/cartilla/public vet states | start/cancel/finish APIs | Works in fragments, but approved dedicated owner page needs verification | AUDIT / PENDING |
| Vet visit | `Save Visit` | Persist visit data | current route implementation split | vet visit APIs | Needs full end-to-end verification against Save & Finish behavior | AUDIT / PENDING |
| Vet visit | `Save & Finish` | Save then return QR to active profile | public vet mode flow | `POST /api/cats/:id/vet-visit/finish` | Must be verified live end-to-end | PENDING |
| Vet visit | `Cancel` | Abort current action safely | split implementations | dashboard/public routes | Needs page-by-page verification | PENDING |
| Error state | `Go Home` | Return to landing | Link | `/` | Works | AUDIT / PENDING |
| Invalid QR state | `Return Home` | Return to landing | Link | `/` | Works | AUDIT / PENDING |

## Immediate Repair Priorities

1. Split registration off the dashboard and move `Register a Cat` onto its own route.
2. Build the missing owner-facing Public Profile & QR settings surface using existing contact/privacy APIs.
3. Rebuild the printable QR page so the front is QR-only and the back carries all supporting content.
4. Remove fake or misleading controls on landing and cartilla flows.
