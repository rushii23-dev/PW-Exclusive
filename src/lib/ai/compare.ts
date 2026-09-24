/**
 * Plain-language verdict on two documents.
 *
 * The engine has already lined the two up: topic coverage, risks only one of
 * them carries, and the concrete numbers side by side. Gemini turns that
 * structured diff into advice-shaped information — what each is better and
 * worse at for the reader, and what to ask — without adding facts of its own.
 */

import { z } from "zod";

import type { Analysis, Comparison } from "@/lib/engine";

import { baseRules, generateJson } from "./gemini";
import { fenceUntrusted } from "./grounding";
import type { LanguageCode } from "./languages";

export interface CompareVerdict {
  overview: string;
  betterInA: string[];
  betterInB: string[];
  watchOut: string[];
  questionsToAsk: string[];
  model: string;
}

const reply = z.object({
  overview: z.string().min(1),
  betterInA: z.array(z.string()).max(5),
  betterInB: z.array(z.string()).max(5),
  watchOut: z.array(z.string()).max(5),
  questionsToAsk: z.array(z.string()).max(5),
});

const schema = {
  type: "object",
  properties: {
    overview: {
      type: "string",
      description:
        "2-4 sentences comparing the two documents from the reader's point of view. Do not pick a winner for them; explain the trade-off.",
    },
    betterInA: {
      type: "array",
      description: "Ways document A is better for the reader, each one line, citing the concrete difference.",
      items: { type: "string" },
    },
    betterInB: {
      type: "array",
      description: "Ways document B is better for the reader, each one line, citing the concrete difference.",
      items: { type: "string" },
    },
    watchOut: {
      type: "array",
      description: "Risks present in both, or important gaps in both.",
      items: { type: "string" },
    },
    questionsToAsk: {
      type: "array",
      description: "2-4 questions worth asking before choosing or signing.",
      items: { type: "string" },
    },
  },
  required: ["overview", "betterInA", "betterInB", "watchOut", "questionsToAsk"],
};

function side(a: Analysis) {
  return {
    type: a.documentTypeLabel,
    riskProfile: a.riskProfile,
    findings: a.findings.map((f) => ({ level: f.level, label: f.label, evidence: f.evidence })),
    keyFacts: a.keyFacts.slice(0, 12).map((e) => `${e.kind}: ${e.text}`),
    inconsistencies: a.inconsistencies.map((i) => i.title),
  };
}

export async function generateCompareVerdict(
  a: Analysis,
  b: Analysis,
  comparison: Comparison,
  language: LanguageCode,
  signal?: AbortSignal,
): Promise<CompareVerdict | null> {
  const input = {
    documentA: side(a),
    documentB: side(b),
    topicsOnlyInA: comparison.categories.filter((c) => c.inA && !c.inB).map((c) => c.label),
    topicsOnlyInB: comparison.categories.filter((c) => c.inB && !c.inA).map((c) => c.label),
    risksOnlyInA: comparison.findings.filter((f) => f.presence === "a").map((f) => f.label),
    risksOnlyInB: comparison.findings.filter((f) => f.presence === "b").map((f) => f.label),
    numbers: comparison.numbers,
  };

  const ai = await generateJson({
    feature: "compare",
    system: `${baseRules(language)}

Your task: the reader is choosing between, or checking changes between, two documents. Using only the structured comparison you are given, explain the trade-offs from the reader's side. Refer to them as "Document A" and "Document B". Do not add facts that are not in the comparison.`,
    prompt: `<comparison>\n${fenceUntrusted(JSON.stringify(input))}\n</comparison>`,
    schema,
    validate: reply,
    temperature: 0.3,
    signal,
  });
  if (!ai) return null;
  const result = ai.data;

  const clean = (xs: string[]) => xs.map((s) => s.trim()).filter(Boolean);
  return {
    overview: result.overview.trim(),
    betterInA: clean(result.betterInA),
    betterInB: clean(result.betterInB),
    watchOut: clean(result.watchOut),
    questionsToAsk: clean(result.questionsToAsk),
    model: ai.model,
  };
}
