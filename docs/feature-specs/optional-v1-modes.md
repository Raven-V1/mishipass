# MishiPass Optional V1 Modes — Feature Spec

Status: Spec only (not yet implemented)
Prerequisite: Days 1–10 must-build COMPLETE

## Scope

Optional modes extend the QR-based mode system beyond Active, Missing, and Vet Visit.
Each adds a new `current_mode` value that the public `/c/:publicId` route renders.

## Implementation Order

1. **Celebration banner** — lowest risk, simplest
2. **Public profile preview** — useful for owner review
3. **Memorial Mode** — static public-safe mode
4. **For Adoption Mode** — profile only, no marketplace
5. **Travel Mode** — status summary only, no rules engine

## Mode Specifications

### 1. Celebration Banner

- Mode value: `celebration`
- Public behavior: Shows cat name, photo, country badge, and a celebration message
- Owner controls: Set/clear celebration text (max 200 chars)
- Dashboard: "Switch to Celebration" button
- Privacy: No private data exposed; message is owner-written
- Fields: `celebration_text TEXT` on cats table (or separate table)
- Design hooks: `data-mode="celebration"` on public page

### 2. Public Profile Preview

- Not a mode — a dashboard-only feature
- Route: `/dashboard/cats/:publicId/preview`
- Shows the owner what the public currently sees without switching tabs
- No schema change needed
- Design hooks: `.preview-frame` container

### 3. Memorial Mode

- Mode value: `memorial`
- Public behavior: Shows cat name, photo, birth/death dates, a tribute message
- Owner controls: Set tribute text, optional death date
- Privacy: No medical history, no contact info shown
- Fields: `memorial_text TEXT`, `death_date TEXT` on cats table
- Design hooks: `data-mode="memorial"`
- Non-goals: No candle animations, no social sharing beyond basic URL

### 4. For Adoption Mode

- Mode value: `adoption`
- Public behavior: Shows cat name, photo, breed, age, basic personality notes
- Owner controls: Set adoption notes (max 500 chars), contact mode applies
- Privacy: Owner contact controlled by existing privacy settings
- Fields: `adoption_notes TEXT` on cats table
- Design hooks: `data-mode="adoption"`
- Non-goals: No marketplace, no listings page, no payment, no chat

### 5. Travel Mode

- Mode value: `travel`
- Public behavior: Shows cat name, photo, country badge, travel status text
- Owner controls: Set travel status summary (max 200 chars)
- Privacy: No itinerary, no dates, no destination details beyond summary
- Fields: `travel_status TEXT` on cats table
- Design hooks: `data-mode="travel"`
- Non-goals: No international travel rule engine, no document scanning, no visa tracking

## Explicit Non-Goals

- No advanced international travel rule engine
- No adoption marketplace or listings aggregator
- No social network features (likes, comments, follows)
- No reminders, medication management, dosage calculators
- No OCR, push notifications, or location tracking
- No government passport framing or official document styling

## Schema Consideration

If implementing, prefer a single additive migration:
```sql
ALTER TABLE cats ADD COLUMN celebration_text TEXT;
ALTER TABLE cats ADD COLUMN memorial_text TEXT;
ALTER TABLE cats ADD COLUMN death_date TEXT;
ALTER TABLE cats ADD COLUMN adoption_notes TEXT;
ALTER TABLE cats ADD COLUMN travel_status TEXT;
```

This keeps optional modes lightweight without new tables.

## Design Hooks for Codex

Each mode page should use:
- `data-mode="<mode>"` attribute on the main container
- Consistent layout: cat name + badge + photo + mode-specific content
- Mode badge color per mode (to be defined by design authority)
