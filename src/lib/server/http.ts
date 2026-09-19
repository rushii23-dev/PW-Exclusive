/**
 * Shared plumbing for the API routes: error shape, body parsing with a hard
 * size cap, client identification for rate limiting.
 *
 * Privacy rule for every route that imports this: document text lives for
 * the duration of the request and is never logged, stored, or echoed into
 * error messages.
 */

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { checkRateLimit } from "./rate-limit";

/** Largest request body any route accepts (two documents plus envelope). */
export const MAX_BODY_BYTES = 600_000;

export interface ApiError {
  error: { code: string; message: string };
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

/** First hop of x-forwarded-for, or a stable fallback for local dev. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export function rateLimitOr429(
  request: Request,
  route: string,
  limitPerMinute: number,
): NextResponse<ApiError> | null {
  const result = checkRateLimit(`${route}:${clientKey(request)}`, limitPerMinute);
  if (result.allowed) return null;
  return errorResponse(
    429,
    "rate_limited",
    "Too many requests — please wait a moment and try again.",
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}

/**
 * Parse and validate a JSON body. Returns either the parsed value or a
 * ready-to-return error response — never throws.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse<ApiError> }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: errorResponse(413, "payload_too_large", "Request body is too large."),
    };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "unreadable_body", "Could not read the request body."),
    };
  }

  if (raw.length > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: errorResponse(413, "payload_too_large", "Request body is too large."),
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "invalid_json", "Request body must be valid JSON."),
    };
  }

  try {
    return { ok: true, data: schema.parse(json) };
  } catch (err) {
    const message =
      err instanceof ZodError
        ? err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ")
        : "Invalid request.";
    return { ok: false, response: errorResponse(422, "validation_failed", message) };
  }
}
