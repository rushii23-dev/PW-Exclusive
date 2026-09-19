/**
 * GET /api/health — liveness and capability report.
 *
 * Reports whether optional AI enhancement is configured without revealing
 * anything about the key itself.
 */

import { NextResponse } from "next/server";

import { isAiConfigured } from "@/lib/ai/enhance";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    engine: "deterministic",
    aiEnhancement: isAiConfigured() ? "configured" : "not configured",
  });
}
