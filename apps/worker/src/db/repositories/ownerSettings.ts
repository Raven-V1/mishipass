export type OwnerLanguageCode = "en" | "es" | "kk-KZ";

export interface OwnerSettingsView {
  language_code: OwnerLanguageCode;
}

const DEFAULT_SETTINGS: OwnerSettingsView = { language_code: "en" };

export function isOwnerLanguageCode(value: string): value is OwnerLanguageCode {
  return value === "en" || value === "es" || value === "kk-KZ";
}

export async function getOwnerSettings(
  db: D1Database,
  ownerId: number,
): Promise<OwnerSettingsView> {
  const row = await db
    .prepare(`SELECT language_code FROM owner_settings WHERE owner_id = ?`)
    .bind(ownerId)
    .first<{ language_code: string }>();

  if (!row || !isOwnerLanguageCode(row.language_code)) {
    return DEFAULT_SETTINGS;
  }

  return { language_code: row.language_code };
}

export async function upsertOwnerSettings(
  db: D1Database,
  ownerId: number,
  languageCode: OwnerLanguageCode,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO owner_settings (owner_id, language_code)
       VALUES (?, ?)
       ON CONFLICT(owner_id) DO UPDATE SET
         language_code = excluded.language_code,
         updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`,
    )
    .bind(ownerId, languageCode)
    .run();
}
