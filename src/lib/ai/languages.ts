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
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "es", name: "Spanish", native: "Español" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? "English";
}
