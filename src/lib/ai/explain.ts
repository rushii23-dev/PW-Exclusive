/**
 * Explain one clause in depth: what it says, what it means for the reader,
 * what to watch for, what to ask, and — when the clause is one-sided — a
 * fairer wording the reader could propose.
 *
 * Only the clause itself and the engine's findings for it go to the model,
 * so the explanation cannot drift onto other parts of the document.
 */

import { z } from "zod";

import type { Analysis, Clause } from "@/lib/engine";

import { baseRules, generateJson } from "./gemini";
import { formatClauses } from "./grounding";
import type { LanguageCode } from "./languages";

export interface ClauseExplanation {
  clauseId: string;
  plainMeaning: string;
  whatItMeansForYou: string;
  watchOutFor: string[];
  questionsToAsk: string[];
  /** Suggested replacement wording, or null when the clause is already fair. */
  fairerWording: string | null;
}

const reply = z.object({
  plainMeaning: z.string().min(1),
  whatItMeansForYou: z.string().min(1),
  watchOutFor: z.array(z.string()).max(5),
  questionsToAsk: z.array(z.string()).max(5),
  fairerWording: z.string().nullable().optional(),
});

const schema = {
  type: "object",
  properties: {
    plainMeaning: {
      type: "string",
      description: "What the clause says, rewritten in 1-3 plain sentences a teenager could follow.",
    },
    whatItMeansForYou: {
      type: "string",
      description:
        "What this means in practice for the reader (the side signing the document, not the side that wrote it), in 1-3 sentences. Use a concrete example with the document's own numbers where possible.",
    },
    watchOutFor: {
      type: "array",
      description: "0-4 specific things in this clause that could cost the reader money, freedom or rights. Empty if none.",
      items: { type: "string" },
    },
    questionsToAsk: {
      type: "array",
      description: "1-3 questions the reader could put to the other party or to a legal professional about this clause.",
      items: { type: "string" },
    },
    fairerWording: {
      type: "string",
      description:
        "If the clause is one-sided against the reader, a short balanced replacement wording they could propose, written in the document's language. An empty string if the clause is already reasonable.",
    },
  },
  required: ["plainMeaning", "whatItMeansForYou", "watchOutFor", "questionsToAsk", "fairerWording"],
};

export async function explainClause(
  analysis: Analysis,
  clause: Clause,
  language: LanguageCode,
): Promise<ClauseExplanation | null> {
  const findings = clause.findings.map((f) => ({
    flag: f.label,
    level: f.level,
    why: f.explanation,
    evidence: f.evidence,
  }));

  const result = await generateJson({
    feature: "explain",
    system: `${baseRules(language)}

Your task: explain a single clause from a ${analysis.documentTypeLabel.toLowerCase()} to the person who is being asked to sign it. Talk about this clause only.`,
    prompt: `<clause_to_explain>\n${formatClauses([clause])}\n</clause_to_explain>\n\n<rule_engine_flags>\n${JSON.stringify(findings)}\n</rule_engine_flags>`,
    schema,
    validate: reply,
    temperature: 0.3,
  });
  if (!result) return null;

  const fairer = result.fairerWording?.trim();
  return {
    clauseId: clause.id,
    plainMeaning: result.plainMeaning.trim(),
    whatItMeansForYou: result.whatItMeansForYou.trim(),
    watchOutFor: result.watchOutFor.map((s) => s.trim()).filter(Boolean),
    questionsToAsk: result.questionsToAsk.map((s) => s.trim()).filter(Boolean),
    fairerWording: fairer ? fairer : null,
  };
}
