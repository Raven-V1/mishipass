// Compact country list for cat registration. ISO 3166-1 alpha-2.
export const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "MX", name: "Mexico" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "ES", name: "Spain" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "JP", name: "Japan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Peru" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "KR", name: "South Korea" },
  { code: "RU", name: "Russia" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
];

export function getCountryName(code: string): string {
  const found = COUNTRIES.find(c => c.code === code);
  return found ? found.name : code;
}

const COUNTRY_FLAGS: Record<string, string> = {
  AR: "🇦🇷",
  AU: "🇦🇺",
  BE: "🇧🇪",
  BR: "🇧🇷",
  CA: "🇨🇦",
  CH: "🇨🇭",
  CL: "🇨🇱",
  CN: "🇨🇳",
  CO: "🇨🇴",
  CZ: "🇨🇿",
  DE: "🇩🇪",
  ES: "🇪🇸",
  FR: "🇫🇷",
  GB: "🇬🇧",
  IN: "🇮🇳",
  IT: "🇮🇹",
  JP: "🇯🇵",
  KR: "🇰🇷",
  KZ: "🇰🇿",
  MX: "🇲🇽",
  NL: "🇳🇱",
  NO: "🇳🇴",
  NZ: "🇳🇿",
  PE: "🇵🇪",
  PL: "🇵🇱",
  PT: "🇵🇹",
  RU: "🇷🇺",
  SE: "🇸🇪",
  US: "🇺🇸",
};

export function getCountryFlag(code: string): string {
  return COUNTRY_FLAGS[code.toUpperCase()] || "";
}

export function getCountryBadgeLabel(code: string): string {
  const normalized = code.toUpperCase();
  const flag = getCountryFlag(normalized);
  const name = getCountryName(normalized);
  return flag ? `${flag} ${name}` : `${normalized} ${name}`;
}
