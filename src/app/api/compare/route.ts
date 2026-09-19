/**
 * POST /api/compare — analyse two documents and diff them.
 *
 * Stateless: both documents are processed in memory and never stored.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  analyzeDocument,
  compare,
  DocumentTooLargeError,
  DocumentTooSmallError,
  MAX_DOCUMENT_CHARS,
} from "@/lib/engine";
import { errorResponse, parseBody, rateLimitOr429 } from "@/lib/server/http";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 10;

const documentField = z
  .string()
  .min(1, "Provide the document text.")
  .max(MAX_DOCUMENT_CHARS, "Document is too large.");

const schema = z.object({
  textA: documentField,
  textB: documentField,
});

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, "compare", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const a = analyzeDocument(body.data.textA);
    const b = analyzeDocument(body.data.textB);
    return NextResponse.json({ a, b, comparison: compare(a, b) });
  } catch (err) {
    if (err instanceof DocumentTooSmallError || err instanceof DocumentTooLargeError) {
      return errorResponse(422, "invalid_document", err.message);
    }
    return errorResponse(500, "comparison_failed", "Could not compare the documents.");
  }
}
