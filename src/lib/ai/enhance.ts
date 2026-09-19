/**
 * Optional AI enhancement, server-side only.
 *
 * The dependency runs one way: the deterministic engine produces the
 * analysis, and Claude may *rephrase* it into a friendlier brief. The model
 * receives the engine's findings — not the raw document as its source of
 * truth — and is instructed to add nothing. If the key is missing, the model
 * errors, or the call times out, the caller gets `null` and the UI shows the
 * engine's own summary. The product works with zero keys configured.
 */

import Anthropic from "@anthropic-ai/sdk";

import type { Analysis } from "@/lib/engine";

const MODEL = "claude-opus-5";
const TIMEOUT_MS = 25_000;

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface AiBrief {
  paragraphs: string[];
  model: string;
}

const SYSTEM_PROMPT = `You rewrite contract-analysis findings into a short plain-language brief for someone with no legal background.

Hard rules:
- Use ONLY the facts in the JSON you are given. Add no clause, risk, amount, date or legal claim of your own.
- Do not give legal advice. Describe what the document says and what the findings mean.
- Write 2–4 short paragraphs, warm but direct, no headings, no lists, no markdown.
- If the findings include high-risk items, lead with the most consequential one.
- Close by reminding the reader this is information, not legal advice.`;

/** The subset of the analysis the model needs — never the full document. */
function briefInput(analysis: Analysis): string {
  return JSON.stringify({
    documentType: analysis.documentTypeLabel,
    riskProfile: analysis.riskProfile,
    readability: {
      band: analysis.readability.band,
      wordCount: analysis.readability.wordCount,
    },
    findings: analysis.findings.map((f) => ({
      level: f.level,
      label: f.label,
      explanation: f.explanation,
      evidence: f.evidence,
    })),
    keyFacts: analysis.keyFacts.slice(0, 10),
    yourObligations: analysis.yourObligations.slice(0, 6).map((o) => o.text),
  });
}

export async function generateAiBrief(analysis: Analysis): Promise<AiBrief | null> {
  if (!isAiConfigured()) return null;

  try {
    const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here are the findings to rewrite as a brief:\n${briefInput(analysis)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!text) return null;

    const paragraphs = text
      .split(/\n{1,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    return { paragraphs, model: MODEL };
  } catch {
    // Any failure — auth, rate limit, network — falls back to the engine's
    // own summary. Enhancement must never take the product down with it.
    return null;
  }
}
