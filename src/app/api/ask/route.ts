/**
 * POST /api/ask — answer a question from the document alone.
 *
 * Gemini writes the answer, in the reader's language, from the clauses the
 * question touches; every citation it gives is checked against the document.
 * If Gemini is unavailable or cannot support its answer with a verified
 * quote, the rule engine answers instead. Stateless: nothing is stored.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { aiAnswer, engineAnswer } from "@/lib/ai/answer";
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

const RATE_LIMIT_PER_MINUTE = 30;

const schema = z.object({
  text: documentField,
  question: z
    .string()
    .trim()
    .min(3, "Ask a question about the document.")
    .max(500, "Keep the question under 500 characters."),
  language: languageField,
});

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, "ask", RATE_LIMIT_PER_MINUTE);
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
    return errorResponse(500, "ask_failed", "Could not answer the question.");
  }

  const { question, language } = body.data;
  const answer =
    (isAiConfigured() ? await aiAnswer(analysis, question, language) : null) ??
    engineAnswer(analysis, question);

  return NextResponse.json({ answer });
}
