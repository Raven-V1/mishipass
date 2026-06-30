# MishiPass

MishiPass is a privacy-first dynamic QR passport and recovery system for cats.

Public site: https://raven-v1.github.io/mishipass/

## Public-Facing Overview

MishiPass gives each cat one permanent QR route. The owner can change the cat's
active mode without replacing the physical tag.

Current Beta modes:

- Active Profile
- Missing Alert
- Vet Visit

Public QR route pattern: `/c/MP-XX-XXXX-XXXX`

## Runtime Boundary

The public site is static and hosted on GitHub Pages. The QR/API backend remains
a TypeScript Cloudflare Worker with D1 for persistence.

The configured Cloudflare Worker runtime handles:

- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/cats`
- `/api/cats/:catId/missing`
- `/api/cats/:catId/active`
- `/c/:publicId`

GitHub Pages does not serve API routes, QR mode routing, authentication, or D1
access.

## Privacy Notes

- Public pages use MishiPass public IDs, not internal database IDs.
- Owner contact visibility is owner-controlled.
- Medical/cartilla records remain private.
- Medication entries are documentation-only records and are not public-facing.
