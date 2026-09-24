/**
 * Deterministic entity extraction: money, dates, durations, percentages.
 *
 * A language model miscounts and misreads numbers; a regex does not. Every
 * amount shown in the UI comes from here, exactly as written in the document.
 */

import { NUM_WORD, parseNumberWord } from "./text";
import type { ExtractedEntity } from "./types";

const MONEY_RE =
  /(?:₹|Rs\.?\s?|INR\s?|USD\s?|\$|€|£)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:lakhs?|crores?|million|billion|thousand|k|m)\b)?|\b\d[\d,]*(?:\.\d{1,2})?\s?(?:rupees|dollars|euros|pounds)\b/gi;

const DATE_RES = [
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+\d{4}\b/gi,
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
];

/** "thirty (30) days", "30 days", "twelve months", "two (2) weeks" … */
const DURATION_RE = new RegExp(
  `\\b(\\d+|${NUM_WORD}(?:[-\\s]${NUM_WORD})?)\\s*(?:\\((\\d+)\\))?\\s*(day|days|week|weeks|month|months|year|years)\\b`,
  "gi",
);

// No trailing \b after "%": the boundary between "%" and a following space
// does not exist (both are non-word characters), so it would reject "2% per".
const PERCENT_RE = /\b\d{1,3}(?:\.\d{1,2})?\s?(?:%|percent\b|per\s?cent\b)/gi;

const UNIT_TO_DAYS: Record<string, number> = {
  day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30, year: 365, years: 365,
};

function dedupe(entities: ExtractedEntity[]): ExtractedEntity[] {
  const seen = new Set<string>();
  return entities.filter((e) => {
    const key = `${e.kind}:${e.text.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractEntities(text: string): ExtractedEntity[] {
  const out: ExtractedEntity[] = [];

  for (const m of text.matchAll(MONEY_RE)) {
    // "₹3,20,000," at a clause boundary drags its comma along — drop it.
    out.push({ kind: "money", text: m[0].trim().replace(/[.,]+$/, "") });
  }

  for (const re of DATE_RES) {
    for (const m of text.matchAll(re)) {
      out.push({ kind: "date", text: m[0].trim() });
    }
  }

  for (const m of text.matchAll(DURATION_RE)) {
    const [full, word, numeral, unit] = m;
    // "3 days" or "thirty (30) days" or "thirty days" — but not "the days".
    const n = numeral ? parseInt(numeral, 10) : parseNumberWord(word);
    if (n === null || n === undefined || Number.isNaN(n) || n === 0) continue;
    // Guard against absurd values from run-on matches.
    if (n > 1000) continue;
    out.push({
      kind: "duration",
      text: full.trim(),
      value: n * UNIT_TO_DAYS[unit.toLowerCase()],
    });
  }

  for (const m of text.matchAll(PERCENT_RE)) {
    const value = parseFloat(m[0]);
    out.push({ kind: "percentage", text: m[0].trim(), value: Number.isNaN(value) ? undefined : value });
  }

  return dedupe(out);
}
