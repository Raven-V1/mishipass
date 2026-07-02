export type LanguageCode = "en" | "es" | "kk-KZ";

export const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "kk-KZ", label: "Қазақша" },
];

const STRINGS: Record<LanguageCode, Record<string, string>> = {
  en: {
    activeProfile: "Active Profile",
    additionalDetails: "Additional details",
    area: "Area / neighborhood",
    backToProfile: "Back to profile",
    callOwner: "Call owner",
    city: "City",
    clinicName: "Clinic name",
    contactOwner: "Contact the owner through MishiPass",
    dashboard: "Owner Dashboard",
    description: "One permanent QR per cat. The owner controls what a scan shows: Active Profile, Missing Alert, or Vet Visit. The QR never changes.",
    language: "Language",
    lastSeen: "Last seen",
    medicationRecord: "Medication Record",
    missing: "Missing",
    noPhoto: "No photo available",
    photo: "Photo",
    reason: "Reason for visit",
    reportSighting: "Report a sighting",
    reportSightingOf: "Report a sighting of",
    reward: "Reward",
    saveFinishVisit: "Save & Finish Visit",
    sightingClosed: "This cat is not currently accepting sighting reports.",
    sightingSubmitted: "Thank you. Your sighting report has been submitted.",
    submitSighting: "Submit sighting report",
    tagline: "Privacy-first dynamic QR passport and recovery system for cats.",
    vetName: "Vet name",
    vetVisit: "Vet Visit",
    visitDate: "Visit date",
    weight: "Weight",
  },
  es: {
    activeProfile: "Perfil activo",
    additionalDetails: "Detalles adicionales",
    area: "Zona / vecindario",
    backToProfile: "Volver al perfil",
    callOwner: "Llamar al dueño",
    city: "Ciudad",
    clinicName: "Clínica",
    contactOwner: "Contacta al dueño por MishiPass",
    dashboard: "Panel del dueño",
    description: "Un QR permanente por gato. El dueño controla qué muestra el escaneo: Perfil activo, Alerta de pérdida o Visita veterinaria. El QR nunca cambia.",
    language: "Idioma",
    lastSeen: "Última vez visto",
    medicationRecord: "Registro de medicamento",
    missing: "Perdido",
    noPhoto: "No hay foto disponible",
    photo: "Foto",
    reason: "Motivo de la visita",
    reportSighting: "Reportar avistamiento",
    reportSightingOf: "Reportar avistamiento de",
    reward: "Recompensa",
    saveFinishVisit: "Guardar y finalizar visita",
    sightingClosed: "Este gato no está aceptando reportes de avistamiento.",
    sightingSubmitted: "Gracias. Tu reporte de avistamiento fue enviado.",
    submitSighting: "Enviar reporte",
    tagline: "Pasaporte QR dinámico y sistema de recuperación para gatos, centrado en la privacidad.",
    vetName: "Veterinario",
    vetVisit: "Visita veterinaria",
    visitDate: "Fecha de visita",
    weight: "Peso",
  },
  "kk-KZ": {
    activeProfile: "Белсенді профиль",
    additionalDetails: "Қосымша мәліметтер",
    area: "Аудан / маңай",
    backToProfile: "Профильге оралу",
    callOwner: "Иесіне қоңырау шалу",
    city: "Қала",
    clinicName: "Клиника атауы",
    contactOwner: "Иесімен MishiPass арқылы байланысыңыз",
    dashboard: "Ие панелі",
    description: "Әр мысыққа бір тұрақты QR. Иесі сканерлеуде не көрсетілетінін басқарады: Белсенді профиль, Жоғалу ескертуі немесе Вет сапары. QR өзгермейді.",
    language: "Тіл",
    lastSeen: "Соңғы көрінген уақыт",
    medicationRecord: "Дәрі жазбасы",
    missing: "Жоғалған",
    noPhoto: "Фото жоқ",
    photo: "Фото",
    reason: "Сапар себебі",
    reportSighting: "Көргенін хабарлау",
    reportSightingOf: "Көргенін хабарлау:",
    reward: "Сыйақы",
    saveFinishVisit: "Сақтау және аяқтау",
    sightingClosed: "Бұл мысық қазір көру хабарламаларын қабылдамайды.",
    sightingSubmitted: "Рақмет. Көру туралы хабарлама жіберілді.",
    submitSighting: "Хабарлама жіберу",
    tagline: "Құпиялылыққа бағытталған мысықтарға арналған динамикалық QR паспорт және қайтару жүйесі.",
    vetName: "Ветеринар",
    vetVisit: "Вет сапары",
    visitDate: "Сапар күні",
    weight: "Салмақ",
  },
};

export function isLanguageCode(value: string): value is LanguageCode {
  return value === "en" || value === "es" || value === "kk-KZ";
}

export function normalizeLanguage(value: string | null | undefined): LanguageCode {
  return value && isLanguageCode(value) ? value : "en";
}

export function getLanguageFromRequest(request: Request): LanguageCode {
  const url = new URL(request.url);
  const queryLang = url.searchParams.get("lang");
  if (isLanguageCode(queryLang || "")) return queryLang as LanguageCode;
  const cookie = request.headers.get("Cookie") || "";
  const match = /(?:^|;\s*)mp_lang=([^;]+)/.exec(cookie);
  if (match) return normalizeLanguage(decodeURIComponent(match[1]!));
  return "en";
}

export function t(lang: LanguageCode, key: string): string {
  return STRINGS[lang][key] || STRINGS.en[key] || key;
}

export function languageSelectHtml(lang: LanguageCode): string {
  const options = LANGUAGE_OPTIONS.map(option =>
    `<option value="${option.code}"${option.code === lang ? " selected" : ""}>${option.label}</option>`,
  ).join("");
  return `<label for="mp-language">${t(lang, "language")}</label><select id="mp-language" class="language-select">${options}</select>`;
}

export const LANGUAGE_SCRIPT = `<script>
(function(){
  var s=document.getElementById("mp-language");
  if(!s)return;
  try{var saved=localStorage.getItem("mp_lang"); if(saved && !location.search.includes("lang=")){ s.value=saved; }}catch(e){}
  s.addEventListener("change",function(){
    try{localStorage.setItem("mp_lang",s.value);}catch(e){}
    document.cookie="mp_lang="+encodeURIComponent(s.value)+"; Path=/; Max-Age=31536000; SameSite=Lax";
    var u=new URL(location.href); u.searchParams.set("lang",s.value); location.href=u.toString();
  });
})();
</script>`;
