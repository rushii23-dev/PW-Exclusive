/**
 * Contradictions the rules can't see.
 *
 * The engine catches the mechanical ones — mismatched figures, dangling
 * cross-references. Gemini reads for meaning: "the tenant may sublet with
 * consent" against "subletting is prohibited", a promised refund that another
 * clause quietly cancels. Every item it reports must quote both sides
 * verbatim from two different clauses, or it is discarded.
 */

import { z } from "zod";

import type { Analysis, Inconsistency } from "@/lib/engine";

import { baseRules, generateJson } from "./gemini";
import { fenceUntrusted, formatClauses, verifyCitations } from "./grounding";
import type { LanguageCode } from "./languages";

/** Past this size a full cross-read is too slow for an interactive request. */
const MAX_DOCUMENT_CHARS = 80_000;

const reply = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        explanation: z.string().min(1),
        evidence: z.array(z.object({ clauseId: z.string(), quote: z.string() })).min(2).max(3),
      }),
    )
    .max(6),
});

const schema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      description:
        "Genuine contradictions or clear ambiguities between clauses. Return an empty array if there are none — do not invent problems.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short headline, e.g. 'Subletting both allowed and banned'." },
          explanation: {
            type: "string",
            description: "2-3 plain sentences: what conflicts, why it matters to the reader, and what to ask to fix it.",
          },
          evidence: {
            type: "array",
            description: "Exactly the conflicting passages: 2 or 3 quotes from different clauses.",
            items: {
              type: "object",
              properties: {
                clauseId: { type: "string" },
                quote: { type: "string", description: "Exact quote copied verbatim from that clause." },
              },
              required: ["clauseId", "quote"],
            },
          },
        },
        required: ["title", "explanation", "evidence"],
      },
    },
  },
  required: ["items"],
};

/**
 * Returns the verified contradictions, or null if the check did not run
 * (document too large, model unavailable or failed) — so the UI never claims
 * a check happened when it didn't.
 */
export async function aiContradictions(
  analysis: Analysis,
  language: LanguageCode,
  signal?: AbortSignal,
): Promise<Inconsistency[] | null> {
  const size = analysis.clauses.reduce((n, c) => n + c.text.length, 0);
  if (analysis.clauses.length < 2) return [];
  if (size > MAX_DOCUMENT_CHARS) return null;

  const alreadyFound = analysis.inconsistencies.map((i) => i.title);

  const ai = await generateJson({
    feature: "contradictions",
    system: `${baseRules(language)}

Your task: read the whole ${analysis.documentTypeLabel.toLowerCase()} and find places where two clauses contradict each other, or where one clause makes another ambiguous — something a reasonable reader could not reconcile. Different rules for different parties are not a contradiction unless they conflict. Standard boilerplate is not a contradiction. Report only real problems; an empty list is a perfectly good answer.`,
    prompt: `<document>\n${formatClauses(analysis.clauses)}\n</document>\n\n<already_reported>\n${fenceUntrusted(JSON.stringify(alreadyFound))}\n</already_reported>`,
    schema,
    validate: reply,
    temperature: 0.1,
    signal,
  });
  if (!ai) return null;
  const result = ai.data;

  const engineClauseSets = analysis.inconsistencies.map(
    (i) => new Set(i.evidence.map((e) => e.clauseId)),
  );

  const out: Inconsistency[] = [];
  result.items.forEach((item, n) => {
    const evidence = verifyCitations(item.evidence, analysis.clauses);
    // A contradiction needs two sides, each really in the document.
    if (new Set(evidence.map((e) => e.clauseId)).size < 2) return;
    // Skip what the rule engine already reported for the same clauses.
    const ids = new Set(evidence.map((e) => e.clauseId));
    if (engineClauseSets.some((set) => [...ids].every((id) => set.has(id)))) return;
    out.push({
      id: `ai-contradiction-${n + 1}`,
      kind: "contradiction",
      title: item.title.trim(),
      explanation: item.explanation.trim(),
      evidence,
      source: "ai",
    });
  });
  return out;
}
