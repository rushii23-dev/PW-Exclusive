/**
 * POST /api/analyze — analyse one document.
 *
 * Stateless by design: the document is processed in memory and never stored
 * or logged. The response carries everything the client needs, so nothing
 * about the document survives the request on the server.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAiBrief, isAiConfigured } from "@/lib/ai/enhance";
import {
  analyzeDocument,
  DocumentTooLargeError,
  DocumentTooSmallError,
  MAX_DOCUMENT_CHARS,
} from "@/lib/engine";
import { errorResponse, parseBody, rateLimitOr429 } from "@/lib/server/http";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 20;

const schema = z.object({
  text: z
    .string()
    .min(1, "Provide the document text.")
    .max(MAX_DOCUMENT_CHARS, "Document is too large."),
  /** Opt-in AI rephrasing of the summary; ignored when no key is configured. */
  ai: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, "analyze", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const analysis = analyzeDocument(body.data.text);
    const aiBrief =
      body.data.ai && isAiConfigured() ? await generateAiBrief(analysis) : null;

    return NextResponse.json({
      analysis,
      ai: {
        available: isAiConfigured(),
        brief: aiBrief,
      },
    });
  } catch (err) {
    if (err instanceof DocumentTooSmallError || err instanceof DocumentTooLargeError) {
      return errorResponse(422, "invalid_document", err.message);
    }
    // Deliberately generic: error details could echo document content.
    return errorResponse(500, "analysis_failed", "Could not analyse the document.");
  }
}
