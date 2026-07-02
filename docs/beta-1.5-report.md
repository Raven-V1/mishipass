# MishiPass Beta 1.5 Report

## Overview

MishiPass Beta 1.5 is a privacy-first dynamic QR passport and recovery system
for cats. Each cat has one permanent QR URL. The owner changes the cat's mode,
and the same QR presents the correct public experience: Active Profile, Missing
Alert, or temporary Vet Visit.

MishiPass is not an official passport, legal ID, travel document, AI vet,
symptom checker, medication advice tool, reminder app, or social network.

## Problem

Cat collars and QR tags often become stale because printed codes cannot adapt
when a cat is missing or when a finder or vet needs different information.
Owners also need a way to document vet visits and vaccines without publishing
private medical records to anyone who scans the tag.

## Solution

MishiPass keeps the physical QR stable while changing the page behind it.
Owners can register a cat, print or save the QR, and switch modes from the
owner dashboard. Public pages only show mode-appropriate information and avoid
private owner, location, and Digital Cartilla data.

## Core Flow

1. The owner registers a cat and receives a public MishiPass ID and QR URL.
2. Active Profile shows public-safe cat details and owner-controlled contact.
3. Missing Alert adds city/area, reward visibility, sighting reports, a manual
   WhatsApp-ready card, and Recovery Board visibility.
4. Vet Visit temporarily allows a scanner to add visit documentation, vaccines,
   sticker photos, and Medication Record entries.
5. Save & Finish returns the QR to Active Profile.
6. The owner reviews private Digital Cartilla records from the dashboard.

## Built Features

- Owner registration, login, logout, and session-protected dashboard.
- Cat registration with country, sex, color/markings, breed/mix, and photo.
- Random public cat IDs and QR URL generation.
- Active Profile, Missing Alert, and Vet Visit mode routing.
- Sighting reports with photo upload validation.
- Privacy/contact settings and reward visibility controls.
- WhatsApp-ready Missing Card with manual share link.
- Public Recovery Board with city and alert-age filters.
- Owner-only Digital Cartilla with vet visits, vaccines, sticker photos, and
  Medication Record documentation.
- Registered country badge display.
- English, Spanish, and Kazakh owner/guest language support.
- Dependabot configuration and security documentation.

## Security And Privacy

The production request path is TypeScript Cloudflare Workers with D1 for data
and R2 for private media objects. Public routes use the public MishiPass ID and
do not expose internal database IDs, raw R2 keys, owner email, owner full name,
or exact address.

Digital Cartilla data is owner-only except for temporary Vet Visit submission
while Vet Visit mode is active. Medication Record entries are documentation-only:
there is no dosage calculation, interaction checking, treatment planning,
refill logic, reminder behavior, or medical advice.

WhatsApp sharing is manual browser sharing only. Recovery Board listings are
public-safe Missing Alert summaries and do not include private owner or medical
data.

## Stack

- Cloudflare Workers TypeScript runtime.
- Cloudflare D1 database.
- Cloudflare R2 media storage.
- TheCatAPI is optional reference assistance for breed/profile completion.
- Python is tooling-only and is not part of the production request path.

## Demo Flow

1. Open the homepage and Recovery Board.
2. Log in to the owner dashboard.
3. Register a cat with country badge, breed/color selection, and photo.
4. Open the public Active Profile from the QR route.
5. Switch to Missing Alert, review the public alert, WhatsApp Card, and board.
6. Submit or review a sighting report.
7. Switch back to Active and confirm board removal.
8. Start Vet Visit, add visit/vaccine/sticker/Medication Record documentation,
   and Save & Finish.
9. Review owner-only Digital Cartilla.

## Known Beta Limitations

- Vet Visit mode is temporary and scanner-submitted; dedicated vet accounts are
  deferred.
- TheCatAPI assistance is optional and must degrade to local fallback choices.
- Recovery Board uses city and alert-age filters only; there are no nearby
  pings, automatic location tracking, or public editing tools.
- The final user acceptance pass depends on manual review of responsive layout
  and language screenshots after deployment.

## Deferred Or Out Of Scope

- Version 2 features.
- Additional animal species.
- AI vet, symptom checker, medical advice, medication reminders, or refill
  tracking.
- Official/legal passport or travel-document claims.
- Social network, marketplace, shelter CRM, push notifications, or WhatsApp
  backend automation.

## Judging Alignment

MishiPass Beta 1.5 demonstrates a focused product with a clear cat owner
problem, a dynamic QR recovery workflow, privacy-first public/private data
boundaries, multilingual demo readiness, and a deployable Cloudflare-native
implementation.
