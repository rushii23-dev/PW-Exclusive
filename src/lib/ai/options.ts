/**
 * "What are my options?" — the reader describes their situation in their own
 * words ("I got a job in another city and need to move out in two months")
 * and gets the routes the document allows, what each one costs them, the
 * clauses behind each, and concrete next steps.
 *
 * Every option must stand on verified quotes from the document. An option
 * the model cannot support with the text is dropped before the reader sees it.
 */

import { z } from "zod";

import { ClauseIndex, type Analysis } from "@/lib/engine";

import { baseRules, generateJson } from "./gemini";
import { formatClauses, selectContext, verifyCitations, type VerifiedCitation } from "./grounding";
import type { LanguageCode } from "./languages";

export interface SituationOption {
  title: string;
  whatHappens: string;
  costsAndRisks: string;
  support: VerifiedCitation[];
}

export interface SituationGuide {
  source: "ai" | "engine";
  /** Whether the document speaks to this situation at all. */
  covered: boolean;
  summary: string;
  options: SituationOption[];
  nextSteps: string[];
  questionsForProfessional: string[];
  /** How soon the reader should act, when the document sets a clock. */
  urgency: "act-now" | "soon" | "no-rush" | null;
}

const reply = z.object({
  covered: z.boolean(),
  summary: z.string().min(1),
  options: z
    .array(
      z.object({
        title: z.string().min(1),
        whatHappens: z.string().min(1),
        costsAndRisks: z.string(),
        citations: z.array(z.object({ clauseId: z.string(), quote: z.string() })),
      }),
    )
    .max(5),
  nextSteps: z.array(z.string()).max(6),
  questionsForProfessional: z.array(z.string()).max(5),
  urgency: z.enum(["act-now", "soon", "no-rush", "unknown"]),
});

const schema = {
  type: "object",
  properties: {
    covered: {
      type: "boolean",
      description: "True if the document's clauses say anything that bears on this situation.",
    },
    summary: {
      type: "string",
      description: "2-3 sentences: where the reader stands under this document, in plain language.",
    },
    options: {
      type: "array",
      description:
        "1-4 realistic routes open to the reader under the document (including negotiating or doing nothing where relevant). Each must be supported by the clauses.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short name for the option, e.g. 'Give notice and leave'." },
          whatHappens: { type: "string", description: "What this route involves, step by step, in 1-3 sentences." },
          costsAndRisks: {
            type: "string",
            description: "What it costs or risks for the reader, using the document's own amounts and deadlines.",
          },
          citations: {
            type: "array",
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
        required: ["title", "whatHappens", "costsAndRisks", "citations"],
      },
    },
    nextSteps: {
      type: "array",
      description: "2-5 concrete, practical next steps, in order (e.g. what to put in writing, what to keep records of).",
      items: { type: "string" },
    },
    questionsForProfessional: {
      type: "array",
      description: "1-4 questions worth asking a lawyer or legal aid service about this situation.",
      items: { type: "string" },
    },
    urgency: {
      type: "string",
      enum: ["act-now", "soon", "no-rush", "unknown"],
      description: "How time-sensitive this is based on deadlines in the document.",
    },
  },
  required: ["covered", "summary", "options", "nextSteps", "questionsForProfessional", "urgency"],
};

export async function aiSituationGuide(
  analysis: Analysis,
  situation: string,
  language: LanguageCode,
): Promise<SituationGuide | null> {
  const index = new ClauseIndex(analysis.clauses);
  const { clauses } = selectContext(analysis.clauses, index, situation);

  const result = await generateJson({
    feature: "options",
    system: `${baseRules(language)}

Your task: the reader has described their situation. Using only the clauses provided from their ${analysis.documentTypeLabel.toLowerCase()}, lay out the options the document gives them, what each costs, and sensible next steps. Be practical and even-handed; include the option of negotiating with the other party where it is realistic. If the document does not address the situation, say so and set covered to false.`,
    prompt: `<document>\n${formatClauses(clauses)}\n</document>\n\n<situation>\n${situation}\n</situation>`,
    schema,
    validate: reply,
    temperature: 0.3,
  });
  if (!result) return null;

  const options = result.options
    .map((o) => ({
      title: o.title.trim(),
      whatHappens: o.whatHappens.trim(),
      costsAndRisks: o.costsAndRisks.trim(),
      support: verifyCitations(o.citations, analysis.clauses),
    }))
    // An option with no verified support in the document is the model talking,
    // not the document — it does not reach the reader.
    .filter((o) => o.support.length > 0);

  if (result.covered && options.length === 0) return null;

  return {
    source: "ai",
    covered: result.covered && options.length > 0,
    summary: result.summary.trim(),
    options,
    nextSteps: result.nextSteps.map((s) => s.trim()).filter(Boolean),
    questionsForProfessional: result.questionsForProfessional.map((s) => s.trim()).filter(Boolean),
    urgency: result.urgency === "unknown" ? null : result.urgency,
  };
}

/**
 * Without the model: the clauses that best match the situation, and the
 * checklist steps and lawyer questions the engine derived from their flags.
 */
export function engineSituationGuide(analysis: Analysis, situation: string): SituationGuide {
  const hits = new ClauseIndex(analysis.clauses).search(situation, 3).filter((h) => h.score >= 1);
  if (hits.length === 0) {
    return {
      source: "engine",
      covered: false,
      summary:
        "This document does not seem to address that situation directly. When an agreement is silent, the general law of your jurisdiction usually decides — a legal aid service or lawyer can tell you where you stand.",
      options: [],
      nextSteps: [
        "Put your situation and any request to the other party in writing, and keep a copy.",
        "Ask a legal professional or legal aid service how the law treats this where you live.",
      ],
      questionsForProfessional: [`My agreement doesn't cover this: "${situation.slice(0, 160)}". What are my rights?`],
      urgency: null,
    };
  }

  const labels = new Set(hits.flatMap((h) => h.clause.findings.map((f) => f.label)));
  return {
    source: "engine",
    covered: true,
    summary: `These are the parts of your ${analysis.documentTypeLabel.toLowerCase()} that deal with this. Read them closely — they set out what you can do and what it costs.`,
    options: hits.map((h) => ({
      title: h.clause.heading ?? `Clause ${h.clause.index + 1}`,
      whatHappens: h.clause.findings[0]?.explanation ?? "This clause is relevant to your situation.",
      costsAndRisks: h.clause.findings[0]?.advice ?? "",
      support: [{ clauseId: h.clause.id, heading: h.clause.heading, quote: h.clause.text.slice(0, 280) }],
    })),
    nextSteps: analysis.checklist.filter((c) => labels.has(c.because)).map((c) => c.text).slice(0, 5),
    questionsForProfessional: analysis.lawyerQuestions.slice(0, 3),
    urgency: null,
  };
}
