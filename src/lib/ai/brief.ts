/**
 * The AI brief: the whole analysis turned into a short, warm explanation a
 * non-lawyer can act on, in their own language.
 *
 * Gemini receives the engine's findings — each with the sentence that
 * triggered it — plus the key facts and duties. It organises and explains
 * them; it is told not to add risks of its own, and every top concern it
 * names must match a finding the engine actually made.
 */

import { z } from "zod";

import type { Analysis } from "@/lib/engine";

import { baseRules, geminiModel, generateJson } from "./gemini";
import type { LanguageCode } from "./languages";

export interface AiBrief {
  headline: string;
  paragraphs: string[];
  topConcerns: Array<{ title: string; detail: string }>;
  beforeYouSign: string[];
  model: string;
}

const reply = z.object({
  headline: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1).max(4),
  topConcerns: z
    .array(z.object({ findingIndex: z.number().int(), title: z.string(), detail: z.string() }))
    .max(4),
  beforeYouSign: z.array(z.string()).max(5),
});

const schema = {
  type: "object",
  properties: {
    headline: {
      type: "string",
      description: "One plain sentence (max 20 words) that sums up this document for the reader.",
    },
    paragraphs: {
      type: "array",
      description:
        "2-3 short paragraphs: what the document is and does, the most important things to know, and a closing reminder that this is information, not legal advice.",
      items: { type: "string" },
    },
    topConcerns: {
      type: "array",
      description: "Up to 3 of the most consequential findings, most serious first.",
      items: {
        type: "object",
        properties: {
          findingIndex: { type: "integer", description: "Index of the finding in the findings list." },
          title: { type: "string", description: "Short plain headline." },
          detail: { type: "string", description: "1-2 sentences on what it means for the reader in practice." },
        },
        required: ["findingIndex", "title", "detail"],
      },
    },
    beforeYouSign: {
      type: "array",
      description: "3-5 concrete things to do before signing, drawn from the findings and checklist.",
      items: { type: "string" },
    },
  },
  required: ["headline", "paragraphs", "topConcerns", "beforeYouSign"],
};

/** What the model sees: findings and facts, never the raw document. */
function briefInput(analysis: Analysis): string {
  return JSON.stringify({
    documentType: analysis.documentTypeLabel,
    riskProfile: analysis.riskProfile,
    readability: { band: analysis.readability.band, words: analysis.readability.wordCount },
    findings: analysis.findings.map((f, i) => ({
      index: i,
      level: f.level,
      label: f.label,
      explanation: f.explanation,
      advice: f.advice,
      evidence: f.evidence,
    })),
    inconsistencies: analysis.inconsistencies.map((i) => ({ title: i.title, explanation: i.explanation })),
    keyFacts: analysis.keyFacts.slice(0, 12).map((e) => `${e.kind}: ${e.text}`),
    yourObligations: analysis.yourObligations.slice(0, 8).map((o) => o.text),
    checklist: analysis.checklist.map((c) => c.text),
  });
}

export async function generateAiBrief(
  analysis: Analysis,
  language: LanguageCode,
): Promise<AiBrief | null> {
  const result = await generateJson({
    feature: "brief",
    system: `${baseRules(language)}

Your task: turn the rule engine's findings about a ${analysis.documentTypeLabel.toLowerCase()} into a short brief for the person about to sign it. Use only the findings, facts and duties you are given — do not add risks, amounts or clauses of your own. Lead with what matters most. Be warm, direct and specific.`,
    prompt: `<analysis>\n${briefInput(analysis)}\n</analysis>`,
    schema,
    validate: reply,
    temperature: 0.4,
  });
  if (!result) return null;

  return {
    headline: result.headline.trim(),
    paragraphs: result.paragraphs.map((p) => p.trim()).filter(Boolean),
    // A concern must point at a real finding; anything else is dropped.
    topConcerns: result.topConcerns
      .filter((c) => c.findingIndex >= 0 && c.findingIndex < analysis.findings.length)
      .slice(0, 3)
      .map((c) => ({ title: c.title.trim(), detail: c.detail.trim() })),
    beforeYouSign: result.beforeYouSign.map((s) => s.trim()).filter(Boolean),
    model: geminiModel(),
  };
}
