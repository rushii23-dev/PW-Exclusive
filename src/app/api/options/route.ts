/**
 * POST /api/options — "What are my options?"
 *
 * The reader describes their situation; Gemini lays out the routes the
 * document gives them, what each costs, and next steps, with every option
 * backed by verified quotes. Without Gemini, the engine returns the clauses
 * that deal with the situation and the steps it derived from their flags.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { isAiConfigured } from "@/lib/ai/gemini";
import { aiSituationGuide, engineSituationGuide } from "@/lib/ai/options";
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

const RATE_LIMIT_PER_MINUTE = 15;

const schema = z.object({
  text: documentField,
  situation: z
    .string()
    .trim()
    .min(8, "Describe your situation in a sentence or two.")
    .max(1000, "Keep the description under 1,000 characters."),
  language: languageField,
});

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, "options", RATE_LIMIT_PER_MINUTE);
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
    return errorResponse(500, "options_failed", "Could not work through that situation.");
  }

  const { situation, language } = body.data;
  const guide =
    (isAiConfigured() ? await aiSituationGuide(analysis, situation, language) : null) ??
    engineSituationGuide(analysis, situation);

  return NextResponse.json({ guide });
}
