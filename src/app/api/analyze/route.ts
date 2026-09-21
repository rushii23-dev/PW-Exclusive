/**
 * POST /api/analyze — analyse one document.
 *
 * The rule engine produces the analysis; when Gemini is configured it adds a
 * plain-language brief and reads the document for contradictions, both in
 * parallel. Stateless by design: the document is processed in memory and
 * never stored or logged.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAiBrief } from "@/lib/ai/brief";
import { aiContradictions } from "@/lib/ai/contradictions";
import { isAiConfigured } from "@/lib/ai/gemini";
import {
  analyzeDocument,
  DocumentTooLargeError,
  DocumentTooSmallError,
  type Analysis,
} from "@/lib/engine";
import { documentField, languageField } from "@/lib/server/fields";
import { errorResponse, parseBody, rateLimitOr429 } from "@/lib/server/http";

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
  const limited = rateLimitOr429(request, "analyze", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  let analysis: Analysis;
  try {
    analysis = analyzeDocument(body.data.text);
  } catch (err) {
    if (err instanceof DocumentTooSmallError || err instanceof DocumentTooLargeError) {
      return errorResponse(422, "invalid_document", err.message);
    }
    // Deliberately generic: error details could echo document content.
    return errorResponse(500, "analysis_failed", "Could not analyse the document.");
  }

  const useAi = body.data.ai && isAiConfigured();
  const [brief, contradictions] = useAi
    ? await Promise.all([
        generateAiBrief(analysis, body.data.language),
        aiContradictions(analysis, body.data.language),
      ])
    : [null, []];

  return NextResponse.json({
    analysis: { ...analysis, inconsistencies: [...analysis.inconsistencies, ...contradictions] },
    ai: {
      available: isAiConfigured(),
      used: useAi,
      brief,
    },
  });
}
