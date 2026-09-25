/**
 * Ask the document — answered by Gemini, held to the text.
 *
 * Retrieval narrows the field, Gemini reads the relevant clauses and writes
 * the answer in the reader's language, and the grounding check keeps only
 * citations whose quotes really are in the document. An answer that cannot
 * point to its source is not shown: the engine's own answer (or its honest
 * "the document doesn't say") is used instead.
 */

import { z } from "zod";

import { answerQuestion, type Answer, ClauseIndex, type ClauseReading } from "@/lib/engine";

import { baseRules, generateJson } from "./gemini";
import { fenceUntrusted, formatClauses, selectContext, verifyCitations } from "./grounding";
import type { LanguageCode } from "./languages";

const reply = z.object({
  answerable: z.boolean(),
  answer: z.string(),
  citations: z.array(z.object({ clauseId: z.string(), quote: z.string() })).max(6),
  followUps: z.array(z.string()).max(4).optional().default([]),
});

const schema = {
  type: "object",
  properties: {
    answerable: {
      type: "boolean",
      description: "True only if the provided clauses actually answer the question.",
    },
    answer: {
      type: "string",
      description:
        "The answer in plain language, 2-6 sentences. Start with the direct answer. If not answerable, explain briefly that the document does not address it and why that matters.",
    },
    citations: {
      type: "array",
      description: "The clauses the answer relies on, most important first.",
      items: {
        type: "object",
        properties: {
          clauseId: { type: "string" },
          quote: {
            type: "string",
            description: "A short exact quote (one sentence or less) copied verbatim from that clause.",
          },
        },
        required: ["clauseId", "quote"],
      },
    },
    followUps: {
      type: "array",
      description: "Up to 3 short follow-up questions the reader might want to ask next.",
      items: { type: "string" },
    },
  },
  required: ["answerable", "answer", "citations"],
};

export async function aiAnswer(
  doc: ClauseReading,
  question: string,
  language: LanguageCode,
  index: ClauseIndex = new ClauseIndex(doc.clauses),
  signal?: AbortSignal,
): Promise<Answer | null> {
  const { clauses } = selectContext(doc.clauses, index, question);

  const ai = await generateJson({
    feature: "ask",
    system: `${baseRules(language)}

Your task: answer the reader's question about their ${doc.documentTypeLabel.toLowerCase()} using only the clauses provided. If the clauses do not answer it, set answerable to false — do not guess, and do not fill the gap with general law presented as if it were in the document.`,
    prompt: `<document>\n${formatClauses(clauses)}\n</document>\n\n<question>\n${fenceUntrusted(question)}\n</question>`,
    schema,
    validate: reply,
    signal,
  });
  if (!ai) return null;
  const result = ai.data;

  if (!result.answerable) {
    return {
      found: false,
      response: result.answer.trim(),
      citations: [],
      source: "ai",
      followUps: result.followUps,
    };
  }

  const verified = verifyCitations(result.citations, doc.clauses);
  // No verified source, no answer: an unsupported claim about a contract is
  // worse than no claim.
  if (verified.length === 0 || !result.answer.trim()) return null;

  return {
    found: true,
    response: result.answer.trim(),
    citations: verified.map((c, i) => ({ ...c, score: Math.max(1, verified.length - i) })),
    source: "ai",
    followUps: result.followUps,
  };
}

/** Engine answer, marked as such — the fallback when Gemini is unavailable. */
export function engineAnswer(
  doc: ClauseReading,
  question: string,
  index: ClauseIndex = new ClauseIndex(doc.clauses),
): Answer {
  return { ...answerQuestion(index, question), source: "engine" };
}
