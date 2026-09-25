/**
 * Run the engine on a request's document and map its failures to responses,
 * the same way for every route.
 */

import "server-only";

import type { NextResponse } from "next/server";

import {
  analyzeDocument,
  DocumentTooLargeError,
  DocumentTooSmallError,
  type Analysis,
} from "@/lib/engine";

import { errorResponse, type ApiError } from "./http";

export type EngineResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: NextResponse<ApiError> };

export type AnalysisResult =
  | { ok: true; analysis: Analysis }
  | { ok: false; response: NextResponse<ApiError> };

/**
 * Run `work`, or explain why it couldn't run: a document outside the size
 * bounds is the reader's to fix (422); anything else is ours (500), reported
 * with the route's own generic message — never the error's, which could
 * quote document content.
 */
export function runEngine<T>(
  work: () => T,
  failure: { code: string; message: string },
): EngineResult<T> {
  try {
    return { ok: true, value: work() };
  } catch (err) {
    if (err instanceof DocumentTooSmallError || err instanceof DocumentTooLargeError) {
      return { ok: false, response: errorResponse(422, "invalid_document", err.message) };
    }
    return { ok: false, response: errorResponse(500, failure.code, failure.message) };
  }
}

/** Analyse `text` in full, or explain why it can't be. */
export function analyzeOrError(
  text: string,
  failure: { code: string; message: string },
): AnalysisResult {
  const result = runEngine(() => analyzeDocument(text), failure);
  return result.ok ? { ok: true, analysis: result.value } : result;
}
