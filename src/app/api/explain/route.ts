/**
 * POST /api/explain — Gemini explains one clause in depth: plain meaning,
 * what it means for the reader, what to watch for, what to ask, and a fairer
 * wording to propose when the clause is one-sided.
 *
 * Needs Gemini; without it the client already shows the engine's own
 * explanation for every flagged clause, so this route reports 503.
 *
 * Only the requested clause is read: the explanation never looks at the rest
 * of the analysis, so there is no reason to compute it.
 */

import { z } from "zod";

import { explainClause } from "@/lib/ai/explain";
import { isAiConfigured } from "@/lib/ai/gemini";
import { analyzeClause } from "@/lib/engine";
import { runEngine } from "@/lib/server/analysis";
import { documentField, languageField } from "@/lib/server/fields";
import { errorResponse, guardRequest, jsonResponse, parseBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_PER_MINUTE = 20;

const schema = z.object({
  text: documentField,
  clauseId: z.string().regex(/^clause-\d{1,4}$/, "Unknown clause."),
  language: languageField,
});

export async function POST(request: Request) {
  const blocked = guardRequest(request, "explain", RATE_LIMIT_PER_MINUTE);
  if (blocked) return blocked;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  if (!isAiConfigured()) {
    return errorResponse(503, "ai_unavailable", "AI explanations are not configured on this server.");
  }

  const result = runEngine(() => analyzeClause(body.data.text, body.data.clauseId), {
    code: "explain_failed",
    message: "Could not explain that clause.",
  });
  if (!result.ok) return result.response;
  if (!result.value) return errorResponse(404, "clause_not_found", "That clause is not in this document.");

  const { documentTypeLabel, clause } = result.value;
  const explanation = await explainClause({ documentTypeLabel }, clause, body.data.language, request.signal);
  if (!explanation) {
    return errorResponse(502, "ai_failed", "The AI could not explain this clause right now. Please try again.");
  }
  return jsonResponse(request, { explanation });
}
