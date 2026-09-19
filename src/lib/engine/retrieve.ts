/**
 * Document-grounded Q&A.
 *
 * BM25 over the document's own clauses, with a synonym layer that maps the
 * words people actually use ("quit", "get my money back") onto the words
 * contracts use ("terminate", "refund"). The answer is always built from
 * retrieved text and always cites it. Below the confidence gate the honest
 * answer is "this document doesn't say" — a legal tool that guesses is worse
 * than no tool.
 */

import { splitSentences, tokenize, truncateAtWord } from "./text";
import type { Answer, Clause } from "./types";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "of", "to", "in", "on",
  "at", "by", "for", "with", "about", "is", "are", "was", "were", "be", "been",
  "do", "does", "did", "can", "could", "will", "would", "shall", "should",
  "may", "might", "have", "has", "had", "i", "me", "my", "we", "our", "you",
  "your", "they", "their", "it", "its", "this", "that", "these", "those",
  "what", "when", "where", "who", "how", "which", "why", "am", "not", "no",
]);

/** Colloquial → contractual vocabulary. Expansion is one-directional. */
const SYNONYMS: Record<string, string[]> = {
  quit: ["terminate", "termination", "resign", "resignation", "notice"],
  leave: ["terminate", "termination", "vacate", "notice"],
  cancel: ["terminate", "termination", "cancellation", "rescind"],
  end: ["terminate", "termination", "expiry", "expiration"],
  exit: ["terminate", "termination"],
  fired: ["terminate", "termination", "dismissal", "cause"],
  money: ["payment", "fee", "fees", "amount", "compensation", "rent"],
  pay: ["payment", "fees", "rent", "compensation", "salary", "remuneration"],
  paid: ["payment", "compensation", "salary"],
  salary: ["compensation", "remuneration", "wages", "pay"],
  refund: ["refundable", "refunded", "reimburse", "returned"],
  back: ["refund", "refundable", "returned"],
  deposit: ["security"],
  raise: ["increase", "escalation", "revision", "increment"],
  increase: ["escalation", "revision", "increment"],
  sue: ["arbitration", "dispute", "jurisdiction", "court", "claim"],
  court: ["jurisdiction", "arbitration", "dispute", "venue"],
  fight: ["dispute", "arbitration", "claim"],
  disagreement: ["dispute", "arbitration"],
  late: ["default", "overdue", "delay", "penalty", "interest"],
  fine: ["penalty", "damages", "fee", "charges"],
  secret: ["confidential", "confidentiality", "disclosure"],
  share: ["disclose", "disclosure", "third", "assign"],
  fix: ["repair", "repairs", "maintenance", "maintain"],
  repair: ["maintenance", "maintain"],
  broken: ["repair", "damage", "maintenance"],
  pet: ["pets", "animals"],
  guest: ["guests", "visitor", "occupant"],
  renew: ["renewal", "extend", "extension"],
  visit: ["entry", "enter", "inspect", "inspection", "access"],
  landlord: ["lessor", "owner"],
  tenant: ["lessee", "renter"],
  work: ["services", "duties", "employment", "engagement"],
  own: ["property", "ownership", "intellectual", "assign"],
  insurance: ["insured", "policy"],
  liable: ["liability", "responsible", "indemnify"],
  responsible: ["liability", "liable", "responsibility"],
};

export interface RetrievalHit {
  clause: Clause;
  score: number;
}

interface IndexedClause {
  clause: Clause;
  tf: Map<string, number>;
  length: number;
}

/** BM25 free parameters, at their conventional values. */
const K1 = 1.4;
const B = 0.75;

export class ClauseIndex {
  private docs: IndexedClause[] = [];
  private df = new Map<string, number>();
  private avgLength = 0;

  constructor(clauses: Clause[]) {
    for (const clause of clauses) {
      const terms = tokenize(`${clause.heading ?? ""} ${clause.text}`).filter(
        (t) => !STOPWORDS.has(t),
      );
      const tf = new Map<string, number>();
      for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      this.docs.push({ clause, tf, length: terms.length });
    }
    this.avgLength =
      this.docs.length > 0
        ? this.docs.reduce((s, d) => s + d.length, 0) / this.docs.length
        : 0;
  }

  search(query: string, topK = 3): RetrievalHit[] {
    const raw = tokenize(query).filter((t) => !STOPWORDS.has(t));
    // Expanded terms score at reduced weight: matching the user's own word
    // should always beat matching a synonym of it.
    const weighted = new Map<string, number>();
    for (const t of raw) {
      weighted.set(t, 1);
      for (const syn of SYNONYMS[t] ?? []) {
        if (!weighted.has(syn)) weighted.set(syn, 0.6);
      }
    }
    if (weighted.size === 0) return [];

    const n = this.docs.length;
    const hits: RetrievalHit[] = [];
    for (const doc of this.docs) {
      let score = 0;
      for (const [term, weight] of weighted) {
        const tf = doc.tf.get(term);
        if (!tf) continue;
        const df = this.df.get(term) ?? 1;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score +=
          weight *
          idf *
          ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / this.avgLength)));
      }
      if (score > 0) hits.push({ clause: doc.clause, score });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, topK);
  }
}

/** The best supporting sentence from a clause, for the quoted citation. */
function bestQuote(clause: Clause, query: string): string {
  const queryTerms = new Set(tokenize(query).filter((t) => !STOPWORDS.has(t)));
  for (const t of [...queryTerms]) for (const s of SYNONYMS[t] ?? []) queryTerms.add(s);

  let best = "";
  let bestOverlap = 0;
  for (const sentence of splitSentences(clause.text)) {
    const terms = new Set(tokenize(sentence));
    let overlap = 0;
    for (const t of queryTerms) if (terms.has(t)) overlap++;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = sentence;
    }
  }
  return truncateAtWord(best || clause.text, 280);
}

/**
 * Answer a question from the document alone.
 *
 * The gate: the top hit must clear an absolute score floor. Absolute, not
 * relative — with only weak matches, "the best of a bad lot" is still bad.
 */
export function answerQuestion(index: ClauseIndex, question: string): Answer {
  const hits = index.search(question, 3);
  const CONFIDENCE_FLOOR = 1.0;

  if (hits.length === 0 || hits[0].score < CONFIDENCE_FLOOR) {
    return {
      found: false,
      response:
        "This document does not appear to address that. That absence can itself matter — an agreement silent on something important leaves it to default law or to whoever has more leverage. Consider asking the other party, or a legal professional, directly.",
      citations: [],
    };
  }

  const top = hits[0];
  const quote = bestQuote(top.clause, question);
  const heading = top.clause.heading;
  const opening = heading
    ? `The "${heading}" clause covers this.`
    : `Clause ${top.clause.index + 1} covers this.`;

  const flagNote =
    top.clause.findings.length > 0
      ? ` Note: this clause is flagged — ${top.clause.findings[0].label.toLowerCase()}: ${top.clause.findings[0].explanation}`
      : "";

  return {
    found: true,
    response: `${opening} It says: “${quote}”${flagNote}`,
    citations: hits
      .filter((h) => h.score >= CONFIDENCE_FLOOR * 0.6)
      .map((h) => ({
        clauseId: h.clause.id,
        heading: h.clause.heading,
        quote: h.clause.id === top.clause.id ? quote : bestQuote(h.clause, question),
        score: Math.round(h.score * 100) / 100,
      })),
  };
}
