/**
 * POST /api/analyze — analyse one document.
 *
 * The rule engine produces the analysis; when Gemini is configured it adds a
 * plain-language brief and reads the document for contradictions, both in
 * parallel. Stateless by design: the document is processed in memory and
 * never stored or logged.
 */

import { z } from "zod";

import { generateAiBrief } from "@/lib/ai/brief";
import { aiContradictions } from "@/lib/ai/contradictions";
import { isAiConfigured } from "@/lib/ai/gemini";
import { analyzeOrError } from "@/lib/server/analysis";
import { documentField, languageField } from "@/lib/server/fields";
import { guardRequest, jsonResponse, parseBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_PER_MINUTE = 20;

const schema = z.object({
  text: documentField,
  /** Set false to skip Gemini even when it is configured. */
  ai: z.boolean().optional().default(true),
  language: languageField,
});

export async function POST(request: Request) {
  const blocked = guardRequest(request, "analyze", RATE_LIMIT_PER_MINUTE);
  if (blocked) return blocked;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  const result = analyzeOrError(body.data.text, {
    code: "analysis_failed",
    message: "Could not analyse the document.",
  });
  if (!result.ok) return result.response;
  const { analysis } = result;

  const useAi = body.data.ai && isAiConfigured();
  const [brief, contradictions] = useAi
    ? await Promise.all([
        generateAiBrief(analysis, body.data.language, request.signal),
        aiContradictions(analysis, body.data.language, request.signal),
      ])
    : [null, null];

  return jsonResponse(request, {
    analysis: {
      ...analysis,
      inconsistencies: [...analysis.inconsistencies, ...(contradictions ?? [])],
    },
    ai: {
      available: isAiConfigured(),
      used: useAi,
      /** Language the AI text is written in, so the page can mark it up. */
      language: body.data.language,
      brief,
      /** True only if Gemini actually completed its read for contradictions. */
      contradictionsChecked: contradictions !== null,
    },
  });
}
