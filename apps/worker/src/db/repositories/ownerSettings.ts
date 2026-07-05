export type OwnerLanguageCode = "en" | "es" | "kk-KZ";
export type OwnerUnits = "metric" | "imperial";

export interface OwnerSettingsView {
  language_code: OwnerLanguageCode;
  units: OwnerUnits;
}

const DEFAULT_SETTINGS: OwnerSettingsView = { language_code: "en", units: "metric" };

export function isOwnerLanguageCode(value: string): value is OwnerLanguageCode {
  return value === "en" || value === "es" || value === "kk-KZ";
}

export function isOwnerUnits(value: string): value is OwnerUnits {
  return value === "metric" || value === "imperial";
}

export async function getOwnerSettings(
  db: D1Database,
  ownerId: number,
): Promise<OwnerSettingsView> {
  const row = await db
    .prepare(`SELECT language_code, units FROM owner_settings WHERE owner_id = ?`)
    .bind(ownerId)
    .first<{ language_code: string; units: string }>();

  return {
    language_code: row && isOwnerLanguageCode(row.language_code) ? row.language_code : "en",
    units: row && isOwnerUnits(row.units) ? row.units : "metric",
  };
}

export async function upsertOwnerSettings(
  db: D1Database,
  ownerId: number,
  languageCode: OwnerLanguageCode,
  units: OwnerUnits = "metric",
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO owner_settings (owner_id, language_code, units)
       VALUES (?, ?, ?)
       ON CONFLICT(owner_id) DO UPDATE SET
         language_code = excluded.language_code,
         units = excluded.units,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`,
    )
    .bind(ownerId, languageCode, units)
    .run();
}
