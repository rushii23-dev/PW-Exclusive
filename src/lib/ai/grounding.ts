/**
 * Grounding checks: the part that makes a model safe to put in front of
 * someone deciding whether to sign.
 *
 * The model is asked to cite clauses by id and to quote them exactly. Nothing
 * it cites is taken on trust — every clause id must exist, and every quote
 * must actually appear in that clause. A quote that fails the check is
 * dropped; an answer left with no verified support is not shown at all.
 */

import type { Clause, ClauseIndex, RetrievalHit } from "@/lib/engine";

/** Documents up to this size go to the model whole; beyond it, retrieved clauses only. */
const WHOLE_DOCUMENT_CHARS = 60_000;
const RETRIEVED_CLAUSES = 12;

/** Tags the prompts use to fence untrusted text off from instructions. */
const FENCE_TAGS = [
  "document",
  "clause",
  "clause_to_explain",
  "question",
  "situation",
  "analysis",
  "comparison",
  "rule_engine_flags",
  "already_reported",
];
const FENCE_TAG_RE = new RegExp(`<(\\s*/?\\s*(?:${FENCE_TAGS.join("|")})\\b)`, "gi");
/** Stands in for "<" inside untrusted text; reads the same, parses as nothing. */
const FENCE_LOOKALIKE = "‹";

/**
 * Make untrusted text safe to place inside a prompt fence.
 *
 * A document (or a question) containing "</document>" could otherwise close
 * the fence early and pose as instructions outside it. Swapping the "<" of
 * any fence tag for a look-alike leaves the text readable to the model but
 * unable to end or open a fence. Quotes stay verifiable: `normaliseForMatch`
 * maps the look-alike back.
 */
export function fenceUntrusted(text: string): string {
  return text.replace(FENCE_TAG_RE, `${FENCE_LOOKALIKE}$1`);
}

/** Normalise for comparison: quotes, dashes, whitespace and case. */
export function normaliseForMatch(text: string): string {
  return text
    .replaceAll(FENCE_LOOKALIKE, "<")
    .replace(/[“”«»„]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** A quote counts only if it is really in the clause and long enough to mean something. */
export function isVerbatimQuote(quote: string, clause: Clause): boolean {
  const q = normaliseForMatch(quote).replace(/^\.{3}|\.{3}$/g, "").trim();
  if (q.length < 8) return false;
  return normaliseForMatch(`${clause.heading ?? ""} ${clause.text}`).includes(q);
}

/**
 * Render clauses for a prompt: id, heading and text, clearly delimited.
 * Ids and risk levels are the engine's own; heading and text are the
 * document's, so they are fenced.
 */
export function formatClauses(clauses: Clause[]): string {
  return clauses
    .map((c) => {
      const heading = c.heading ? ` — ${fenceUntrusted(c.heading)}` : "";
      return `<clause id="${c.id}"${c.risk ? ` flagged="${c.risk}"` : ""}>\n[${c.id}${heading}]\n${fenceUntrusted(c.text)}\n</clause>`;
    })
    .join("\n\n");
}

/**
 * Which clauses the model should see for a question or situation.
 *
 * Small documents go in whole — the model can then answer questions asked in
 * any language or phrased in words the retrieval index has never seen. Large
 * ones are cut down to the best-scoring clauses, in document order.
 */
export function selectContext(
  clauses: Clause[],
  index: ClauseIndex,
  query: string,
): { clauses: Clause[]; retrieved: RetrievalHit[] } {
  const retrieved = index.search(query, RETRIEVED_CLAUSES);
  const total = clauses.reduce((n, c) => n + c.text.length, 0);
  if (total <= WHOLE_DOCUMENT_CHARS) return { clauses, retrieved };

  const ids = new Set(retrieved.map((h) => h.clause.id));
  const chosen = clauses.filter((c) => ids.has(c.id));
  return { clauses: chosen.length > 0 ? chosen : clauses.slice(0, RETRIEVED_CLAUSES), retrieved };
}

export interface VerifiedCitation {
  clauseId: string;
  heading: string | null;
  quote: string;
}

/**
 * Keep only citations whose clause exists and whose quote is verbatim.
 * Duplicates (same clause and quote) collapse to one.
 */
export function verifyCitations(
  citations: Array<{ clauseId: string; quote: string }>,
  clauses: Clause[],
): VerifiedCitation[] {
  const byId = new Map(clauses.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const out: VerifiedCitation[] = [];
  for (const cite of citations) {
    const clause = byId.get(cite.clauseId.trim());
    if (!clause || !isVerbatimQuote(cite.quote, clause)) continue;
    const key = `${clause.id}::${normaliseForMatch(cite.quote)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ clauseId: clause.id, heading: clause.heading, quote: cite.quote.trim() });
  }
  return out;
}

/** Keep only clause ids that exist in the document. */
export function knownClauseIds(ids: string[], clauses: Clause[]): string[] {
  const valid = new Set(clauses.map((c) => c.id));
  return [...new Set(ids.map((id) => id.trim()).filter((id) => valid.has(id)))];
}
