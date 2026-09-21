/**
 * POST /api/explain — Gemini explains one clause in depth: plain meaning,
 * what it means for the reader, what to watch for, what to ask, and a fairer
 * wording to propose when the clause is one-sided.
 *
 * Needs Gemini; without it the client already shows the engine's own
 * explanation for every flagged clause, so this route reports 503.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { explainClause } from "@/lib/ai/explain";
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
  clauseId: z.string().regex(/^clause-\d{1,4}$/, "Unknown clause."),
  language: languageField,
});

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, "explain", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  if (!isAiConfigured()) {
    return errorResponse(503, "ai_unavailable", "AI explanations are not configured on this server.");
  }

  let analysis: Analysis;
  try {
    analysis = analyzeDocument(body.data.text);
  } catch (err) {
    if (err instanceof DocumentTooSmallError || err instanceof DocumentTooLargeError) {
      return errorResponse(422, "invalid_document", err.message);
    }
    return errorResponse(500, "explain_failed", "Could not explain that clause.");
  }

  const clause = analysis.clauses.find((c) => c.id === body.data.clauseId);
  if (!clause) return errorResponse(404, "clause_not_found", "That clause is not in this document.");

  const explanation = await explainClause(analysis, clause, body.data.language);
  if (!explanation) {
    return errorResponse(502, "ai_failed", "The AI could not explain this clause right now. Please try again.");
  }
  return NextResponse.json({ explanation });
}
