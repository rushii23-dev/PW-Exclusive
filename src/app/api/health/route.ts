/**
 * GET /api/health — liveness and capability report.
 *
 * Says whether Gemini is configured and which model is in use, without
 * revealing anything about the key itself.
 */

import { NextResponse } from "next/server";

import { geminiModel, isAiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";

export async function GET() {
  const configured = isAiConfigured();
  return NextResponse.json({
    status: "ok",
    engine: "deterministic",
    ai: {
      provider: "gemini",
      configured,
      model: configured ? geminiModel() : null,
    },
  });
}
