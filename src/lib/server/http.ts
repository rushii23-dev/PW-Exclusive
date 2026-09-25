/**
 * Shared plumbing for the API routes: error shape, request guards, body
 * reading with a hard byte cap, client identification for rate limiting.
 *
 * Privacy rule for every route that imports this: document text lives for
 * the duration of the request and is never logged, stored, or echoed into
 * error messages.
 */

import "server-only";

import { promisify } from "node:util";
import { brotliCompress, constants as zlib, gzip } from "node:zlib";

import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { MAX_DOCUMENT_CHARS } from "@/lib/engine";

import { checkRateLimit } from "./rate-limit";

const brotliAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

/** UTF-8 spends at most three bytes on any character a document can hold. */
const MAX_BYTES_PER_CHAR = 3;
/** Room for the JSON envelope and the short fields around the document. */
const ENVELOPE_BYTES = 16 * 1024;

/**
 * Largest JSON body a route accepts, in bytes, for a request carrying
 * `documents` full documents. Sized from the character cap so a document in
 * Hindi or Tamil gets the same room as one in English.
 */
export function bodyLimit(documents: 1 | 2): number {
  return documents * MAX_DOCUMENT_CHARS * MAX_BYTES_PER_CHAR + ENVELOPE_BYTES;
}

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

/** Below this size, compressing costs more time than it saves bytes. */
const COMPRESS_MIN_BYTES = 1024;

/**
 * Quality 4 of 11: within a few percent of brotli's best ratio on analysis
 * JSON, in a fraction of the time — about 11 ms for the largest analysis.
 */
const BROTLI_OPTIONS = {
  params: {
    [zlib.BROTLI_PARAM_QUALITY]: 4,
    [zlib.BROTLI_PARAM_MODE]: zlib.BROTLI_MODE_TEXT,
  },
};

/** Content codings the client accepts; one it lists with q=0 it refuses. */
function acceptedEncodings(request: Request): Set<string> {
  const accepted = new Set<string>();
  for (const part of (request.headers.get("accept-encoding") ?? "").split(",")) {
    const [coding, ...params] = part.split(";").map((s) => s.trim().toLowerCase());
    const q = params.find((p) => p.startsWith("q="));
    if (coding && (q === undefined || Number(q.slice(2)) > 0)) accepted.add(coding);
  }
  return accepted;
}

/**
 * A JSON response, compressed when the client accepts it.
 *
 * Next.js compresses pages but not route-handler responses, and an analysis
 * is large: every clause with its flags, explanations and quotes comes to
 * about ten times the size of the document itself. The sample lease's
 * analysis is 29 KB of JSON and 5 KB on the wire. Longer documents gain more,
 * since the same flag explanations repeat from clause to clause and brotli's
 * long window folds them away: the maximum-size test contract's 1.1 MB goes
 * out as 27 KB. Compression runs on the libuv thread pool, so a large body
 * never holds up other requests.
 *
 * No secret ever sits in these bodies (no token, cookie or key), so
 * compressing them next to reader-supplied text gives a BREACH-style length
 * attack nothing to recover.
 */
export async function jsonResponse(request: Request, body: unknown): Promise<Response> {
  const json = JSON.stringify(body);
  const headers = new Headers({ "content-type": "application/json", vary: "accept-encoding" });
  if (Buffer.byteLength(json) < COMPRESS_MIN_BYTES) return new Response(json, { headers });

  const accepted = acceptedEncodings(request);
  const coding = accepted.has("br") ? "br" : accepted.has("gzip") ? "gzip" : null;
  if (!coding) return new Response(json, { headers });

  const compressed = coding === "br" ? await brotliAsync(json, BROTLI_OPTIONS) : await gzipAsync(json);
  headers.set("content-encoding", coding);
  return new Response(compressed, { headers });
}

/** Longest address we key on; anything longer is not an IP address. */
const MAX_KEY_CHARS = 64;

function trustedProxyHops(): number {
  const n = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : 1;
}

/**
 * The client's address, as recorded by the proxy in front of the app.
 *
 * Proxies append to X-Forwarded-For, so its leftmost entries are whatever
 * the client chose to send — keying on them would let anyone mint a fresh
 * rate-limit bucket per request. With N trusted proxies in front of the app
 * the real client is the Nth entry from the right. Vercel and Cloud Run each
 * add one hop; set TRUSTED_PROXY_HOPS when a load balancer adds another.
 */
export function clientKey(request: Request): string {
  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const address =
    hops.length > 0
      ? hops[Math.max(0, hops.length - trustedProxyHops())]
      : (request.headers.get("x-real-ip")?.trim() ?? "local");
  return address.slice(0, MAX_KEY_CHARS) || "local";
}

/**
 * Browsers label every request with where it came from. The API only
 * serves this site's own pages, so a request another site's page made —
 * which would spend this server's Gemini quota under a visitor's IP — is
 * refused. Clients that send no label (curl, tests, server-to-server) are
 * judged by the rate limit alone.
 */
function isCrossSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site === "cross-site" || site === "same-site";
}

/**
 * Run before any work: refuse cross-site requests, then apply the per-client
 * rate limit. Returns a ready response when the request must stop here.
 */
export function guardRequest(
  request: Request,
  route: string,
  limitPerMinute: number,
): NextResponse<ApiError> | null {
  if (isCrossSite(request)) {
    return errorResponse(403, "cross_site_request", "This API only accepts requests from ClearClause itself.");
  }
  const result = checkRateLimit(`${route}:${clientKey(request)}`, limitPerMinute);
  if (result.allowed) return null;
  return errorResponse(
    429,
    "rate_limited",
    "Too many requests — please wait a moment and try again.",
    { "Retry-After": String(result.retryAfterSeconds) },
  );
}

export type BodyRead =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: "too_large" | "unreadable" };

/**
 * Read a request body, stopping the moment it passes `maxBytes`.
 *
 * Content-Length is checked first, but it is optional (chunked uploads omit
 * it) and only a claim, so the stream is counted as it arrives too. A body
 * that runs over is abandoned mid-stream instead of being buffered whole.
 */
export async function readBodyCapped(request: Request, maxBytes: number): Promise<BodyRead> {
  const declared = Number(request.headers.get("content-length") ?? NaN);
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: "too_large" };
  if (!request.body) return { ok: true, bytes: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

function isJson(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  return /^application\/json\s*(?:;|$)/i.test(type);
}

/**
 * Parse and validate a JSON body. Returns either the parsed value or a
 * ready-to-return error response — never throws.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
  { maxBytes = bodyLimit(1) }: { maxBytes?: number } = {},
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse<ApiError> }> {
  if (!isJson(request)) {
    return {
      ok: false,
      response: errorResponse(415, "unsupported_media_type", "Send the request as application/json."),
    };
  }

  const body = await readBodyCapped(request, maxBytes);
  if (!body.ok) {
    return {
      ok: false,
      response:
        body.reason === "too_large"
          ? errorResponse(413, "payload_too_large", "Request body is too large.")
          : errorResponse(400, "unreadable_body", "Could not read the request body."),
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(body.bytes));
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "invalid_json", "Request body must be valid JSON."),
    };
  }

  const parsed = schema.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };
  const message = parsed.error.issues
    .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
    .join("; ");
  return { ok: false, response: errorResponse(422, "validation_failed", message) };
}
