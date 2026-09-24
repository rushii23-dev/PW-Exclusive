/**
 * Languages the AI layer can write in.
 *
 * Access to legal information is partly a language problem: a tenant in Pune
 * may read Marathi far more comfortably than contract English. The document
 * stays as written — quotes are never translated, so they still match the
 * paper — but every explanation around them can be in the reader's language.
 *
 * Client-safe: no SDK imports here, the UI reads this list directly.
 */

export const LANGUAGES = [
  { code: "en", name: "English", native: "English", dir: "ltr" },
  { code: "hi", name: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "mr", name: "Marathi", native: "मराठी", dir: "ltr" },
  { code: "bn", name: "Bengali", native: "বাংলা", dir: "ltr" },
  { code: "ta", name: "Tamil", native: "தமிழ்", dir: "ltr" },
  { code: "te", name: "Telugu", native: "తెలుగు", dir: "ltr" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", dir: "ltr" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", dir: "ltr" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", dir: "ltr" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", dir: "ltr" },
  { code: "ur", name: "Urdu", native: "اردو", dir: "rtl" },
  { code: "es", name: "Spanish", native: "Español", dir: "ltr" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? "English";
}

/**
 * Attributes for an element holding text written in `code`. The codes are
 * valid BCP 47 tags, so a screen reader switches voice (Hindi read with an
 * English voice is unintelligible) and Urdu lays out right to left. Only
 * model-written text gets these — quotes stay in the document's language.
 */
export function languageAttributes(code: LanguageCode): { lang: LanguageCode; dir: "ltr" | "rtl" } {
  return { lang: code, dir: LANGUAGES.find((l) => l.code === code)?.dir ?? "ltr" };
}
