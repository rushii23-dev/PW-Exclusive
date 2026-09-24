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
import { ClauseIndex } from "@/lib/engine";
import { SITUATION_MAX_CHARS, SITUATION_MIN_CHARS } from "@/lib/limits";
import { analyzeOrError } from "@/lib/server/analysis";
import { documentField, languageField } from "@/lib/server/fields";
import { guardRequest, parseBody } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_PER_MINUTE = 15;

const schema = z.object({
  text: documentField,
  situation: z
    .string()
    .trim()
    .min(SITUATION_MIN_CHARS, "Describe your situation in a sentence or two.")
    .max(SITUATION_MAX_CHARS, "Keep the description under 1,000 characters."),
  language: languageField,
});

export async function POST(request: Request) {
  const blocked = guardRequest(request, "options", RATE_LIMIT_PER_MINUTE);
  if (blocked) return blocked;

  const body = await parseBody(request, schema);
  if (!body.ok) return body.response;

  const result = analyzeOrError(body.data.text, {
    code: "options_failed",
    message: "Could not work through that situation.",
  });
  if (!result.ok) return result.response;

  const { situation, language } = body.data;
  const index = new ClauseIndex(result.analysis.clauses);
  const guide =
    (isAiConfigured() ? await aiSituationGuide(result.analysis, situation, language, index, request.signal) : null) ??
    engineSituationGuide(result.analysis, situation, index);

  return NextResponse.json({ guide });
}
