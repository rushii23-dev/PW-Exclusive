/**
 * Obligation extraction: which sentences place a duty on whom.
 *
 * Attribution is positional and lexical — the subject nearest the modal verb
 * decides the party. "Unclear" is a first-class answer: better to admit it
 * than to guess which side "the party of the first part" is.
 */

import { splitSentences, truncateAtWord } from "./text";
import type { DocumentType, Obligation, Party } from "./types";

/** Which words name the reader's side, and which the other side's. */
interface Perspective {
  you: RegExp;
  them: RegExp;
}

/** For a document of unknown kind: the usual names for each side. */
const GENERIC: Perspective = {
  you: /\b(?:tenant|lessee|employee|contractor|consultant|freelancer|borrower|customer|client|user|subscriber|buyer|purchaser|licensee|you|recipient|renter|occupant)\b/i,
  them: /\b(?:landlord|lessor|employer|company|corporation|provider|vendor|lender|seller|licensor|firm|owner|management|we|us)\b/i,
};

/**
 * Who the reader is depends on the document. A "client" is the reader of a
 * subscription's terms but the other side of a freelance contract — where
 * "the Client shall pay the Contractor" is a promise made *to* the reader.
 */
const PERSPECTIVES: Partial<Record<DocumentType, Perspective>> = {
  "rental-agreement": {
    you: /\b(?:tenant|lessee|licensee|guest|occupant|renter|you)\b/i,
    them: /\b(?:landlord|lessor|licensor|owner|management|we|us)\b/i,
  },
  "employment-contract": {
    you: /\b(?:employee|you)\b/i,
    them: /\b(?:employer|company|corporation|firm|management|we|us)\b/i,
  },
  "service-agreement": {
    you: /\b(?:contractor|consultant|freelancer|service provider|you)\b/i,
    them: /\b(?:client|customer|company|corporation|firm|we|us)\b/i,
  },
  "loan-agreement": {
    you: /\b(?:borrower|you)\b/i,
    them: /\b(?:lender|bank|company|we|us)\b/i,
  },
  "terms-of-service": {
    you: /\b(?:user|customer|subscriber|member|you)\b/i,
    them: /\b(?:company|provider|platform|we|us)\b/i,
  },
};

const DUTY_RE =
  /\b(?:shall|must|will be required to|is required to|are required to|agrees? to|undertakes? to|is obligated to|are obligated to|covenants? to|is responsible for|are responsible for)\b/i;

/** Negations and permissions are not duties. */
const NOT_A_DUTY_RE =
  /\b(?:shall not be (?:liable|responsible|obligated|obliged|required)|shall (?:have|be under) no (?:obligation|duty|liability)|shall be entitled|shall have the right|shall mean|shall be deemed|shall constitute|shall survive|shall remain|shall be governed|shall be construed|shall be binding|shall apply|shall include)\b/i;

/**
 * A party named right after a preposition is on the receiving end of the
 * sentence — "assigns to the Client", "notice from the Landlord" — not the
 * one being bound.
 */
const AFTER_PREPOSITION = /\b(?:to|by|from|for|with|of|against|upon|towards?|behalf of)\s+(?:the\s+|such\s+|any\s+|each\s+)?$/i;

/** "the Landlord and the Tenant": two parties joined into one subject. */
const JOINED = /^\s*(?:and|or|and\/or)\s+(?:the\s+)?$/i;

interface Mention {
  party: "you" | "counterparty";
  start: number;
  end: number;
}

function subjectMentions(before: string, sides: Perspective): Mention[] {
  const mentions: Mention[] = [];
  for (const [party, re] of [
    ["you", sides.you],
    ["counterparty", sides.them],
  ] as const) {
    for (const m of before.matchAll(new RegExp(re.source, "gi"))) {
      if (AFTER_PREPOSITION.test(before.slice(0, m.index))) continue;
      mentions.push({ party, start: m.index, end: m.index + m[0].length });
    }
  }
  return mentions.sort((a, b) => a.start - b.start);
}

function attribute(sentence: string, dutyIndex: number, sides: Perspective): Party {
  // The subject sits before the modal verb. Of the parties named there, the
  // last one not governed by a preposition is usually it: in "If the Tenant
  // defaults, the Landlord shall…" the opening clause names the Tenant, but
  // the Landlord is bound.
  const mentions = subjectMentions(sentence.slice(0, dutyIndex), sides);
  const subject = mentions.at(-1);
  if (!subject) return "unclear";
  const partner = mentions.at(-2);
  if (
    partner &&
    partner.party !== subject.party &&
    JOINED.test(sentence.slice(partner.end, subject.start))
  ) {
    return "both";
  }
  return subject.party;
}

export function extractObligations(text: string, documentType?: DocumentType): Obligation[] {
  const sides = (documentType && PERSPECTIVES[documentType]) || GENERIC;
  const out: Obligation[] = [];
  for (const sentence of splitSentences(text)) {
    const duty = DUTY_RE.exec(sentence);
    if (!duty) continue;
    if (NOT_A_DUTY_RE.test(sentence)) continue;
    out.push({
      party: attribute(sentence, duty.index, sides),
      text: truncateAtWord(sentence.trim(), 260),
    });
  }
  return out;
}
