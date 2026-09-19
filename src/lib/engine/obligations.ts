/**
 * Obligation extraction: which sentences place a duty on whom.
 *
 * Attribution is positional and lexical — the subject nearest the modal verb
 * decides the party. "Unclear" is a first-class answer: better to admit it
 * than to guess which side "the party of the first part" is.
 */

import { splitSentences, truncateAtWord } from "./text";
import type { Obligation, Party } from "./types";

/** Words that identify the reader's side, by document convention. */
const YOU_WORDS =
  /\b(?:tenant|lessee|employee|contractor|consultant|freelancer|borrower|customer|client|user|subscriber|buyer|purchaser|licensee|you|recipient|renter|occupant)\b/i;

const THEM_WORDS =
  /\b(?:landlord|lessor|employer|company|corporation|provider|vendor|lender|seller|licensor|firm|owner|management|we|us)\b/i;

const DUTY_RE =
  /\b(?:shall|must|will be required to|is required to|are required to|agrees? to|undertakes? to|is obligated to|are obligated to|covenants? to|is responsible for|are responsible for)\b/i;

/** Negations and permissions are not duties. */
const NOT_A_DUTY_RE =
  /\b(?:shall not be (?:liable|responsible|obligated)|shall be entitled|shall have the right|shall mean|shall be deemed|shall constitute|shall survive|shall remain|shall be governed|shall be construed|shall be binding|shall apply|shall include)\b/i;

function attribute(sentence: string, dutyIndex: number): Party {
  // Look at the subject region before the modal verb.
  const before = sentence.slice(0, dutyIndex);
  const youMatch = before.match(YOU_WORDS);
  const themMatch = before.match(THEM_WORDS);
  if (youMatch && themMatch) {
    // "Tenant and Landlord shall…" — both; otherwise the later mention is
    // usually the grammatical subject.
    const lastYou = before.toLowerCase().lastIndexOf(youMatch[0].toLowerCase());
    const lastThem = before.toLowerCase().lastIndexOf(themMatch[0].toLowerCase());
    if (/\b(?:and|or)\b/i.test(before.slice(Math.min(lastYou, lastThem), Math.max(lastYou, lastThem)))) {
      return "both";
    }
    return lastYou > lastThem ? "you" : "counterparty";
  }
  if (youMatch) return "you";
  if (themMatch) return "counterparty";
  return "unclear";
}

export function extractObligations(text: string): Obligation[] {
  const out: Obligation[] = [];
  for (const sentence of splitSentences(text)) {
    const duty = DUTY_RE.exec(sentence);
    if (!duty) continue;
    if (NOT_A_DUTY_RE.test(sentence)) continue;
    out.push({
      party: attribute(sentence, duty.index),
      text: truncateAtWord(sentence.trim(), 260),
    });
  }
  return out;
}
