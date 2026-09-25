/**
 * POST /api/ask — answer a question from the document alone.
 *
 * Gemini writes the answer, in the reader's language, from the clauses the
 * question touches; every citation it gives is checked against the document.
 * If Gemini is unavailable or cannot support its answer with a verified
 * quote, the rule engine answers instead. Stateless: nothing is stored.
 *
 * A question is answered from the clauses alone, so only the clauses are
 * read — none of the document-wide passes a full analysis runs.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { aiAnswer, engineAnswer } from "@/lib/ai/answer";
import { isAiConfigured } from "@/lib/ai/gemini";
import { ClauseIndex, readClauses } from "@/lib/engine";
import { QUESTION_MAX_CHARS, QUESTION_MIN_CHARS } from "@/lib/limits";
import { runEngine } from "@/lib/server/analysis";
import { documentField, languageField } from "@/lib/server/fields";
import { guardRequest, parseBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_PER_MINUTE = 30;

const schema = z.object({
  text: documentField,
  question: z
    .string()
    .trim()
    .min(QUESTION_MIN_CHARS, "Ask a question about the document.")
    .max(QUESTION_MAX_CHARS, `Keep the question under ${QUESTION_MAX_CHARS} characters.`),
  language: languageField,
});

export async function POST(request: Request) {
  const blocked = guardRequest(request, "ask", RATE_LIMIT_PER_MINUTE);
  if (blocked) return blocked;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  const result = runEngine(() => readClauses(body.data.text), {
    code: "ask_failed",
    message: "Could not answer the question.",
  });
  if (!result.ok) return result.response;

  const { question, language } = body.data;
  // One index serves both Gemini's retrieval and the engine's fallback.
  const doc = result.value;
  const index = new ClauseIndex(doc.clauses);
  const answer =
    (isAiConfigured() ? await aiAnswer(doc, question, language, index, request.signal) : null) ??
    engineAnswer(doc, question, index);

  return NextResponse.json({ answer });
}
