/**
 * POST /api/compare — analyse two documents and diff them.
 *
 * The engine lines them up; Gemini, when configured, explains the trade-offs
 * in plain language. Stateless: both documents stay in memory only.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCompareVerdict } from "@/lib/ai/compare";
import { isAiConfigured } from "@/lib/ai/gemini";
import {
  analyzeDocument,
  compare,
  DocumentTooLargeError,
  DocumentTooSmallError,
  type Analysis,
  type Comparison,
} from "@/lib/engine";
import { documentField, languageField } from "@/lib/server/fields";
import { errorResponse, parseBody, rateLimitOr429 } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_PER_MINUTE = 10;

const schema = z.object({
  textA: documentField,
  textB: documentField,
  ai: z.boolean().optional().default(true),
  language: languageField,
});

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, "compare", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  let a: Analysis;
  let b: Analysis;
  let comparison: Comparison;
  try {
    a = analyzeDocument(body.data.textA);
    b = analyzeDocument(body.data.textB);
    comparison = compare(a, b);
  } catch (err) {
    if (err instanceof DocumentTooSmallError || err instanceof DocumentTooLargeError) {
      return errorResponse(422, "invalid_document", err.message);
    }
    return errorResponse(500, "comparison_failed", "Could not compare the documents.");
  }

  const useAi = body.data.ai && isAiConfigured();
  const verdict = useAi ? await generateCompareVerdict(a, b, comparison, body.data.language) : null;

  return NextResponse.json({
    a,
    b,
    comparison,
    ai: { available: isAiConfigured(), used: useAi, verdict },
  });
}
