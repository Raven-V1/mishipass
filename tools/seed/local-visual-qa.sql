-- MishiPass local visual-QA seed
-- Apply with: npx wrangler d1 execute mishipass --local --file=tools/seed/local-visual-qa.sql
-- NEVER use --remote with this file.
--
-- Uses high IDs (900+) to avoid collisions with existing local dev data.
-- Password for dev@mishipass.local is "devpass123"
-- Hash scheme: $pbkdf2-sha256$<iterations>$<base64-salt>$<base64-hash>
-- Pre-computed with fixed salt "devseeddevelopme" (16 bytes ASCII), 100000 iterations.

-- ── owner ──────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO owners (id, email, password_hash)
VALUES (
  900,
  'dev@mishipass.local',
  '$pbkdf2-sha256$100000$ZGV2c2VlZGRldmVsb3BtZQ==$JcxK/4U+IX115p874XU8yy/0sQhCz4/V6Z3PTsjIC+k='
);

INSERT OR IGNORE INTO owner_settings (owner_id, language_code, units)
VALUES (900, 'en', 'metric');

-- ── cats ───────────────────────────────────────────────────────────────────

-- T001: Active Profile cat (has placeholder photo reference)
INSERT OR IGNORE INTO cats (id, public_id, owner_id, name, country_code, photo_r2_key, current_mode)
VALUES (901, 'MP-QA-T001-A001', 900, 'Luna', 'MX', 'qa/placeholder-profile.jpg', 'active');

-- T002: Missing Alert cat (reward hidden, published to Recovery Board)
INSERT OR IGNORE INTO cats (id, public_id, owner_id, name, country_code, current_mode)
VALUES (902, 'MP-QA-T002-M001', 900, 'Mochi', 'MX', 'missing');

-- T003: Vet Visit cat (vet session active, expires 2099-01-01)
INSERT OR IGNORE INTO cats (id, public_id, owner_id, name, country_code, current_mode)
VALUES (903, 'MP-QA-T003-V001', 900, 'Kiku', 'MX', 'vet');

-- T004: Empty cartilla cat
INSERT OR IGNORE INTO cats (id, public_id, owner_id, name, country_code, current_mode)
VALUES (904, 'MP-QA-T004-E001', 900, 'Sora', 'MX', 'active');

-- T005: Populated cartilla cat
INSERT OR IGNORE INTO cats (id, public_id, owner_id, name, country_code, current_mode)
VALUES (905, 'MP-QA-T005-C001', 900, 'Hana', 'MX', 'active');

-- T006: Cat with a sighting report attached
INSERT OR IGNORE INTO cats (id, public_id, owner_id, name, country_code, current_mode)
VALUES (906, 'MP-QA-T006-S001', 900, 'Nori', 'MX', 'missing');

-- ── contact_settings ───────────────────────────────────────────────────────
INSERT OR IGNORE INTO contact_settings (cat_id, contact_mode) VALUES (901, 'relay');
INSERT OR IGNORE INTO contact_settings (cat_id, contact_mode) VALUES (902, 'relay');
INSERT OR IGNORE INTO contact_settings (cat_id, contact_mode) VALUES (903, 'relay');
INSERT OR IGNORE INTO contact_settings (cat_id, contact_mode) VALUES (904, 'relay');
INSERT OR IGNORE INTO contact_settings (cat_id, contact_mode) VALUES (905, 'relay');
INSERT OR IGNORE INTO contact_settings (cat_id, contact_mode) VALUES (906, 'relay');

-- ── missing_alerts ─────────────────────────────────────────────────────────

-- T002: Missing Alert, reward hidden, Recovery Board opt-in
INSERT OR IGNORE INTO missing_alerts
  (cat_id, last_seen_at, city, area, reward_amount, reward_visible, recovery_board_opt_in, activated_at)
VALUES (
  902,
  '2026-07-01T08:00:00Z',
  'Ciudad Juarez',
  'Centro',
  '500 MXN',
  0,
  1,
  '2026-07-01T08:00:00Z'
);

-- T006: Missing Alert for sighting cat
INSERT OR IGNORE INTO missing_alerts
  (cat_id, last_seen_at, city, area, reward_amount, reward_visible, recovery_board_opt_in, activated_at)
VALUES (
  906,
  '2026-07-02T10:00:00Z',
  'Ciudad Juarez',
  'Zona Centro',
  NULL,
  0,
  1,
  '2026-07-02T10:00:00Z'
);

-- ── vet_sessions ───────────────────────────────────────────────────────────

-- T003: Active vet session, expires 2099
INSERT OR IGNORE INTO vet_sessions (cat_id, token_hash, activated_at, expires_at, status)
VALUES (
  903,
  'qa-vet-token-hash-placeholder-t003',
  '2026-07-06T00:00:00Z',
  '2099-01-01T00:00:00Z',
  'active'
);

-- ── cat_photos ─────────────────────────────────────────────────────────────

-- T001: placeholder profile photo row (id 910 avoids collision with existing 100/101)
INSERT OR IGNORE INTO cat_photos (id, cat_id, r2_key, is_profile, is_public, photo_public_id)
VALUES (910, 901, 'qa/placeholder-profile.jpg', 1, 1, 'QAPROFILEPHOT901');

-- T005: sticker photo reference for populated cartilla
INSERT OR IGNORE INTO cat_photos (id, cat_id, r2_key, is_profile, is_public, photo_public_id)
VALUES (911, 905, 'qa/placeholder-sticker.jpg', 0, 0, 'QASTICKERPHOT905');

-- ── cartilla data for T005 ─────────────────────────────────────────────────

-- vet visit entry
INSERT OR IGNORE INTO vet_visits (id, cat_id, visit_date, vet_or_clinic_name, notes)
VALUES (900, 905, '2026-06-15', 'Clinica Veterinaria QA', 'Annual wellness exam. All good.');

-- vaccine record
INSERT OR IGNORE INTO vaccines (id, cat_id, vaccine_name, date_given, sticker_photo_r2_key)
VALUES (900, 905, 'Quadrivalente FVRCP', '2026-06-15', 'qa/placeholder-sticker.jpg');

-- medication record (documentation only — no advice columns)
INSERT OR IGNORE INTO medications
  (id, cat_id, medication_name, dose, duration, start_date, prescriber_name, notes)
VALUES (
  900,
  905,
  'Amoxicilina',
  '50mg',
  '7 days',
  '2026-06-15',
  'Dr. QA Veterinario',
  'Post-procedure precautionary. Medication Record only.'
);

-- ── sighting report for T006 ───────────────────────────────────────────────
INSERT OR IGNORE INTO sighting_reports
  (id, cat_id, message, photo_r2_key, location_text, reporter_ip_hash, lat, lng)
VALUES (
  900,
  906,
  'Seen near the market, friendly cat.',
  NULL,
  'Mercado Juarez, Ciudad Juarez',
  'qa-reporter-ip-hash-placeholder',
  31.7381,
  -106.4870
);
