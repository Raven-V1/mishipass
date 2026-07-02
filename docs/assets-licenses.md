# Assets And Licenses

## Homepage Cat Visual

- File/source: inline SVG in `apps/worker/src/pages/root.ts`
- Description: illustrated black cat mascot with MishiPass QR tag
- Origin: local generated artwork created for MishiPass Beta 1.5
- License risk: no external stock image, hotlink, or third-party copyrighted
  asset is used

## Real Logo and Mockups

- `assets/logo/logo.jpeg` — MishiPass real logo, supplied by Carlos/Zhanerke
- `assets/mockups/background.jpeg` — Background reference, internal design
- `assets/mockups/desktoplanding.jpeg` — Desktop landing reference
- `assets/mockups/landingpage.jpeg` — Landing page reference
- `assets/mockups/dashboard.jpeg` — Dashboard mobile reference
- Origin: Carlos/Zhanerke supplied internal design reference
- License: proprietary project asset, not external stock art

## Carbon Design System Icons

- File: `apps/worker/src/utils/icons.ts`
- Source: IBM Carbon Design System (https://github.com/carbon-design-system/carbon)
- License: Apache-2.0
- Usage: vendored SVG paths only (no npm dependency installed)
- Only specific icons needed are included

## TheCatAPI Breed Reference Images

- Source: https://thecatapi.com
- Usage: CDN image URLs referenced for breed card display
- License: TheCatAPI free tier allows non-commercial use with attribution
- API key stored as Cloudflare Worker secret, never exposed in client output
