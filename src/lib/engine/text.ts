/**
 * Text primitives shared across the engine.
 *
 * These are deliberately regex-based and deterministic: a tokenizer that a
 * unit test can pin down exactly is worth more here than a smarter one that
 * drifts between library versions.
 */

const WORD_RE = /[a-z0-9]+(?:'[a-z]+)?/gi;

/** Lowercased word tokens. Numbers survive; punctuation does not. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(WORD_RE) ?? []).slice();
}

/**
 * A deliberately light stemmer: enough that "renew", "renews", "renewed" and
 * "renewal" meet, not so much that unrelated words collide. It is applied to
 * both sides of every comparison, so the stems only need to agree with each
 * other — they don't need to be real words.
 */
export function stem(word: string): string {
  if (word.length <= 3 || /\d/.test(word)) return word;
  let w = word;
  if (w.endsWith("ies") && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ation") && w.length > 7) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("al") && w.length > 6) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) w = w.slice(0, -1);
  if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
  return w;
}

/**
 * Sentence split tuned for legal prose. Abbreviations that end with a period
 * ("No.", "Sec.", "Rs.", "e.g.") must not end a sentence, and clause
 * enumerators like "(a)" continue the sentence they sit in.
 */
const ABBREVIATIONS = new Set([
  "no", "sec", "art", "cl", "rs", "inc", "ltd", "llc", "co", "corp",
  "mr", "mrs", "ms", "dr", "jr", "sr", "st", "vs", "etc", "viz",
  "eg", "ie", "approx", "para", "pp", "vol",
]);

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const s = text;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== "." && ch !== "?" && ch !== "!" && ch !== ";") continue;
    // Decimal numbers ("1.5%") and section numbers ("12.3") are not boundaries.
    if (ch === "." && /\d/.test(s[i - 1] ?? "") && /\d/.test(s[i + 1] ?? "")) {
      continue;
    }
    if (ch === ".") {
      const before = s.slice(Math.max(0, i - 12), i);
      const lastWord = before.match(/[A-Za-z]+$/)?.[0]?.toLowerCase() ?? "";
      if (ABBREVIATIONS.has(lastWord.replace(/\./g, ""))) continue;
      // A single capital letter before the period is an initial, not an end.
      if (/(?:^|[^A-Za-z])[A-Z]$/.test(before)) continue;
    }
    const candidate = s.slice(start, i + 1).trim();
    if (candidate.length > 1) out.push(candidate);
    start = i + 1;
  }
  const tail = s.slice(start).trim();
  if (tail.length > 1) out.push(tail);
  return out;
}

/** Count syllables the classic way: vowel groups, silent-e discounted. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:ed|es|e)$/, "").replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

/**
 * Regex source matching one spelled-out number word ("sixty", "twenty"),
 * built from the same tables `parseNumberWord` reads, so the two can't drift.
 */
export const NUM_WORD = `(?:${[...Object.keys(UNITS).filter((w) => w !== "zero"), ...Object.keys(TENS), "hundred"].join("|")})`;

/**
 * Parse "thirty", "twenty-one", "ninety nine", or a plain numeral.
 * Legal drafting loves "thirty (30) days"; the caller handles the numeral in
 * parentheses, this handles the words.
 */
export function parseNumberWord(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10);
  const parts = cleaned.split(/[\s-]+/);
  let total = 0;
  for (const p of parts) {
    if (p in UNITS) total += UNITS[p];
    else if (p in TENS) total += TENS[p];
    else if (p === "hundred") total = (total || 1) * 100;
    else return null;
  }
  return total;
}

/** Collapse whitespace without destroying paragraph breaks. */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** First `n` characters cut at a word boundary, with an ellipsis if cut. */
export function truncateAtWord(text: string, n: number): string {
  if (text.length <= n) return text;
  const cut = text.slice(0, n);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > n * 0.6 ? lastSpace : n).trimEnd()}…`;
}

const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/**
 * Format a count with a fixed locale. `toLocaleString()` follows the machine's
 * locale, so a server set to en-IN writes "2,00,000" while the browser writes
 * "200,000" — and React discards the page when the two disagree.
 */
export function formatCount(n: number): string {
  return COUNT_FORMAT.format(n);
}
