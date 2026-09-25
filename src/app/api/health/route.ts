/**
 * GET /api/health — liveness and capability report.
 *
 * Says only whether Gemini is configured — the one thing the page needs to
 * know. Nothing about the deployment (the key, the model, the fallback
 * chain) is reported to an anonymous caller.
 */

import { NextResponse } from "next/server";

import { isAiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    engine: "deterministic",
    ai: {
      provider: "gemini",
      configured: isAiConfigured(),
    },
  });
}
