/**
 * Internal-inconsistency detection.
 *
 * A contract that disagrees with itself is a problem whoever wrote it: when
 * two clauses conflict, the reader cannot know which one a court, a landlord
 * or an employer will rely on. These checks find the contradictions that can
 * be proven from the text alone — each one quotes both sides, so the reader
 * can see the conflict with their own eyes.
 *
 * Deliberately conservative. A check that cries wolf teaches people to ignore
 * it, so every rule here fires only on patterns that are wrong or ambiguous
 * on their face.
 */

import { extractEntities } from "./entities";
import { parseNumberWord, splitSentences, truncateAtWord } from "./text";
import type { Clause, Inconsistency, InconsistencyEvidence } from "./types";

const NUM_WORD =
  "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)";

/** "sixty (60)", "twenty-one (21)", "thirty (45)" … */
const WORD_THEN_DIGITS_RE = new RegExp(
  `\\b(${NUM_WORD}(?:[-\\s]${NUM_WORD})*)\\s*\\((\\d{1,4})\\)`,
  "gi",
);

function evidence(clause: Clause, quote: string): InconsistencyEvidence {
  return { clauseId: clause.id, heading: clause.heading, quote: truncateAtWord(quote, 260) };
}

function sentenceContaining(clause: Clause, needle: string): string {
  const lower = needle.toLowerCase();
  return (
    splitSentences(clause.text).find((s) => s.toLowerCase().includes(lower)) ?? needle
  );
}

function clauseName(e: InconsistencyEvidence, clauses: Clause[]): string {
  const clause = clauses.find((c) => c.id === e.clauseId);
  if (!clause) return "another clause";
  return clause.heading ? `“${clause.heading}”` : `clause ${clause.index + 1}`;
}

/* ── 1. Spelled-out number disagrees with its numeral ─────────────────── */

function numberWordMismatches(clauses: Clause[]): Inconsistency[] {
  const out: Inconsistency[] = [];
  for (const clause of clauses) {
    for (const m of clause.text.matchAll(WORD_THEN_DIGITS_RE)) {
      const [full, word, digits] = m;
      const spelled = parseNumberWord(word);
      const numeral = parseInt(digits, 10);
      if (spelled === null || spelled === numeral) continue;
      out.push({
        id: `number-mismatch-${clause.id}-${m.index}`,
        kind: "number-mismatch",
        title: "Words and figures disagree",
        explanation: `The text says “${full.trim()}” — the words mean ${spelled} but the figure says ${numeral}. When words and figures conflict, which one wins is not something to leave to chance. Ask for this to be corrected before signing.`,
        evidence: [evidence(clause, sentenceContaining(clause, full))],
        source: "engine",
      });
    }
  }
  return out;
}

/* ── 2. Different notice periods for ending the agreement ──────────────── */

const ENDING_RE = /\b(terminat\w*|vacat\w*|resign\w*|cancel\w*|end (?:this|the) (?:agreement|lease|contract|employment))\b/i;

/**
 * True only when the duration *is* the notice: "sixty (60) days written
 * notice", "notice period of 30 days". A probation length or "fifteen days
 * salary in lieu of notice" merely shares a sentence with the word.
 */
function isNoticePeriod(sentence: string, durationText: string): boolean {
  const at = sentence.indexOf(durationText);
  if (at === -1) return false;
  const after = sentence.slice(at + durationText.length);
  const before = sentence.slice(0, at);
  return (
    /^\s*(?:'s\s+|’s\s+)?(?:prior\s+|advance\s+)?(?:written\s+)?notice\b/i.test(after) ||
    /\bnotice\s+(?:period\s+)?of\s+(?:at\s+least\s+|not\s+less\s+than\s+)?$/i.test(before)
  );
}

function conflictingNoticePeriods(clauses: Clause[]): Inconsistency[] {
  const periods: Array<{ days: number; text: string; clause: Clause; sentence: string }> = [];
  for (const clause of clauses) {
    for (const sentence of splitSentences(clause.text)) {
      if (!/\bnotice\b/i.test(sentence) || !ENDING_RE.test(sentence)) continue;
      for (const e of extractEntities(sentence)) {
        if (e.kind !== "duration" || !e.value) continue;
        if (!isNoticePeriod(sentence, e.text)) continue;
        periods.push({ days: e.value, text: e.text, clause, sentence });
      }
    }
  }
  const distinct = [...new Map(periods.map((p) => [p.days, p])).values()];
  if (distinct.length < 2) return [];
  // Two figures in one sentence are usually a deliberate pair ("sixty (60)
  // days for the tenant, thirty (30) for the landlord") — still worth
  // surfacing, but only when they come from different clauses is it a
  // genuine contradiction rather than a stated asymmetry.
  const clausesInvolved = new Set(distinct.map((p) => p.clause.id));
  if (clausesInvolved.size < 2) return [];

  const shown = distinct.slice(0, 3);
  return [
    {
      id: "conflicting-notice",
      kind: "conflicting-values",
      title: "Notice periods don’t match",
      explanation: `Ending the agreement is tied to different notice periods in different places: ${shown
        .map((p) => `${p.text} (${clauseName(evidence(p.clause, p.sentence), clauses)})`)
        .join(" vs ")}. If they apply to the same situation they contradict each other; if they apply to different parties, the terms are uneven. Ask which period applies to you, and get it written down.`,
      evidence: shown.map((p) => evidence(p.clause, p.sentence)),
      source: "engine",
    },
  ];
}

/* ── 3. The same amount stated as different figures ────────────────────── */

const AMOUNT_LABELS: Array<{ key: string; label: string; re: RegExp }> = [
  { key: "deposit", label: "security deposit", re: /\b(?:security\s+)?deposit\b/i },
  { key: "rent", label: "monthly rent", re: /\b(?:monthly\s+)?rent\b/i },
  { key: "salary", label: "salary", re: /\b(?:salary|ctc|cost to company|remuneration|annual compensation)\b/i },
  { key: "fee", label: "fee", re: /\b(?:service|monthly|annual|retainer|subscription)\s+fees?\b/i },
];

/** Words that make the amount a change to a figure, not the figure itself. */
const REVISION_RE = /\b(increas|escalat|revis|increment|hike|raise|additional|deduct|penalt|late|interest|per day|each day|maintenance|reduc)\w*/i;

/** How far from its label an amount may sit and still be that label's value. */
const LABEL_BEFORE_CHARS = 45;
const LABEL_AFTER_CHARS = 25;

function normaliseAmount(text: string): string {
  return text.replace(/[^\d.]/g, "").replace(/\.0+$/, "").replace(/^0+/, "");
}

/**
 * The label an amount belongs to, judged by proximity: "security deposit of
 * Rs. 50,000" or "Rs. 32,000 as monthly rent". Revision words in that same
 * window ("rent shall increase to Rs. 21,000") disqualify it — but a
 * revision word elsewhere in the sentence ("…refunded after deductions")
 * does not.
 */
function labelFor(sentence: string, start: number, end: number, re: RegExp): boolean {
  const before = sentence.slice(Math.max(0, start - LABEL_BEFORE_CHARS), start);
  const after = sentence.slice(end, end + LABEL_AFTER_CHARS);
  if (REVISION_RE.test(before)) return false;
  return re.test(before) || re.test(after);
}

function conflictingAmounts(clauses: Clause[]): Inconsistency[] {
  const out: Inconsistency[] = [];
  for (const { key, label, re } of AMOUNT_LABELS) {
    const seen: Array<{ value: string; text: string; clause: Clause; sentence: string }> = [];
    for (const clause of clauses) {
      for (const sentence of splitSentences(clause.text)) {
        if (!re.test(sentence)) continue;
        const monies = extractEntities(sentence).filter((e) => e.kind === "money");
        // Two amounts in one sentence ("Rs. 32,000 rent and Rs. 3,20,000
        // deposit") are usually a deliberate pairing; attribution is too
        // uncertain to call either one a contradiction.
        if (monies.length !== 1) continue;
        const start = sentence.indexOf(monies[0].text);
        if (start === -1 || !labelFor(sentence, start, start + monies[0].text.length, re)) continue;
        const value = normaliseAmount(monies[0].text);
        if (!value) continue;
        seen.push({ value, text: monies[0].text, clause, sentence });
      }
    }
    const distinct = [...new Map(seen.map((s) => [s.value, s])).values()];
    if (distinct.length < 2) continue;
    out.push({
      id: `conflicting-${key}`,
      kind: "conflicting-values",
      title: `The ${label} is stated differently`,
      explanation: `The document names more than one figure for the ${label}: ${distinct
        .slice(0, 3)
        .map((d) => d.text)
        .join(" and ")}. Confirm which figure is correct and make sure every clause says the same thing.`,
      evidence: distinct.slice(0, 3).map((d) => evidence(d.clause, d.sentence)),
      source: "engine",
    });
  }
  return out;
}

/* ── 4. More than one place named for disputes ─────────────────────────── */

const COURT_RE = /\bcourts?\s+(?:at|of|in)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/g;
const NOT_PLACES = new Set(["Law", "Competent", "Appropriate", "The", "Such", "Any", "Its"]);

function multipleJurisdictions(clauses: Clause[]): Inconsistency[] {
  const places = new Map<string, { clause: Clause; sentence: string; name: string }>();
  for (const clause of clauses) {
    for (const m of clause.text.matchAll(COURT_RE)) {
      const name = m[1].trim();
      if (NOT_PLACES.has(name.split(" ")[0])) continue;
      const k = name.toLowerCase();
      if (!places.has(k)) places.set(k, { clause, sentence: sentenceContaining(clause, m[0]), name });
    }
  }
  if (places.size < 2) return [];
  const list = [...places.values()].slice(0, 3);
  return [
    {
      id: "multiple-jurisdictions",
      kind: "conflicting-values",
      title: "More than one place is named for disputes",
      explanation: `Different clauses send disputes to different places: ${list
        .map((p) => p.name)
        .join(" and ")}. If there is ever a disagreement, this is exactly the question that gets argued first. Ask for a single forum.`,
      evidence: list.map((p) => evidence(p.clause, p.sentence)),
      source: "engine",
    },
  ];
}

/* ── 5. A cross-reference to a clause that doesn't exist ──────────────── */

const XREF_RE = /\b(?:clause|section|paragraph)\s+(\d{1,3})(?:\.\d+)*\b/gi;
const NUMBERED_LINE_RE = /^\s*(?:(?:clause|section|article)\s+)?(\d{1,3})(?:\.\d+)*[.):]?\s+\S/gim;

function missingReferences(clauses: Clause[], document: string): Inconsistency[] {
  const defined = new Set<number>();
  for (const m of document.matchAll(NUMBERED_LINE_RE)) defined.add(parseInt(m[1], 10));
  // Without a clear numbering scheme there is nothing to check against.
  if (defined.size < 3) return [];

  const out: Inconsistency[] = [];
  const reported = new Set<number>();
  for (const clause of clauses) {
    for (const m of clause.text.matchAll(XREF_RE)) {
      const n = parseInt(m[1], 10);
      if (defined.has(n) || reported.has(n)) continue;
      reported.add(n);
      out.push({
        id: `missing-reference-${n}`,
        kind: "missing-reference",
        title: `Refers to ${m[0].trim()}, which isn’t in the document`,
        explanation: `This clause relies on ${m[0].trim()}, but the document has no clause with that number. The missing text could change what this clause means — ask for the complete version, or for the reference to be fixed.`,
        evidence: [evidence(clause, sentenceContaining(clause, m[0]))],
        source: "engine",
      });
    }
  }
  return out;
}

export function findInconsistencies(clauses: Clause[], document: string): Inconsistency[] {
  return [
    ...numberWordMismatches(clauses),
    ...conflictingNoticePeriods(clauses),
    ...conflictingAmounts(clauses),
    ...multipleJurisdictions(clauses),
    ...missingReferences(clauses, document),
  ];
}
