/**
 * POST /api/compare — analyse two documents and diff them.
 *
 * The engine lines them up; Gemini, when configured, explains the trade-offs
 * in plain language. Stateless: both documents stay in memory only.
 */

import { z } from "zod";

import { generateCompareVerdict } from "@/lib/ai/compare";
import { isAiConfigured } from "@/lib/ai/gemini";
import { compare } from "@/lib/engine";
import { analyzeOrError } from "@/lib/server/analysis";
import { documentField, languageField } from "@/lib/server/fields";
import { bodyLimit, guardRequest, jsonResponse, parseBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_PER_MINUTE = 10;

const schema = z.object({
  textA: documentField,
  textB: documentField,
  ai: z.boolean().optional().default(true),
  language: languageField,
});

const FAILURE = { code: "comparison_failed", message: "Could not compare the documents." };

export async function POST(request: Request) {
  const blocked = guardRequest(request, "compare", RATE_LIMIT_PER_MINUTE);
  if (blocked) return blocked;

  const body = await parseBody(request, schema, { maxBytes: bodyLimit(2) });
  if (!body.ok) return body.response;

  const a = analyzeOrError(body.data.textA, FAILURE);
  if (!a.ok) return a.response;
  const b = analyzeOrError(body.data.textB, FAILURE);
  if (!b.ok) return b.response;
  const comparison = compare(a.analysis, b.analysis);

  const useAi = body.data.ai && isAiConfigured();
  const verdict = useAi
    ? await generateCompareVerdict(a.analysis, b.analysis, comparison, body.data.language, request.signal)
    : null;

  return jsonResponse(request, {
    a: a.analysis,
    b: b.analysis,
    comparison,
    ai: { available: isAiConfigured(), used: useAi, language: body.data.language, verdict },
  });
}
