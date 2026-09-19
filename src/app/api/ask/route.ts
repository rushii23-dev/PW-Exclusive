/**
 * POST /api/ask — answer a question from the document alone.
 *
 * Stateless: the client sends the document with each question, the server
 * builds the index in memory, answers, and forgets. No session, no storage —
 * the privacy model is that there is nothing to leak.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  analyzeDocument,
  answerQuestion,
  ClauseIndex,
  DocumentTooLargeError,
  DocumentTooSmallError,
  MAX_DOCUMENT_CHARS,
} from "@/lib/engine";
import { errorResponse, parseBody, rateLimitOr429 } from "@/lib/server/http";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 30;

const schema = z.object({
  text: z
    .string()
    .min(1, "Provide the document text.")
    .max(MAX_DOCUMENT_CHARS, "Document is too large."),
  question: z
    .string()
    .trim()
    .min(3, "Ask a question about the document.")
    .max(500, "Keep the question under 500 characters."),
});

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, "ask", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const analysis = analyzeDocument(body.data.text);
    const index = new ClauseIndex(analysis.clauses);
    return NextResponse.json({ answer: answerQuestion(index, body.data.question) });
  } catch (err) {
    if (err instanceof DocumentTooSmallError || err instanceof DocumentTooLargeError) {
      return errorResponse(422, "invalid_document", err.message);
    }
    return errorResponse(500, "ask_failed", "Could not answer the question.");
  }
}
