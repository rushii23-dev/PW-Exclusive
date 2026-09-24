/**
 * POST /api/extract — read the text out of an uploaded file.
 *
 * Accepts multipart form data with a single `file`: PDF, Word (.docx), an
 * image of a document, or plain text. Returns the text for the reader to
 * review before analysing. The file is held in memory for the length of the
 * request and never written anywhere.
 */

import { NextResponse } from "next/server";

import { ExtractError, extractDocumentText, MAX_UPLOAD_BYTES } from "@/lib/server/extract";
import { errorResponse, guardRequest, readBodyCapped } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 120;

const RATE_LIMIT_PER_MINUTE = 10;

/** Multipart adds a little envelope around the file itself. */
const MULTIPART_ENVELOPE_BYTES = 64 * 1024;

const TOO_LARGE = "That file is too large — the limit is 4 MB.";

export async function POST(request: Request) {
  const blocked = guardRequest(request, "extract", RATE_LIMIT_PER_MINUTE);
  if (blocked) return blocked;

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\b/i.test(contentType)) {
    return errorResponse(415, "unsupported_media_type", "Send the file as multipart form data.");
  }

  // Read with a hard cap before parsing: `formData()` on its own would buffer
  // a body of any size that arrives without a Content-Length.
  const body = await readBodyCapped(request, MAX_UPLOAD_BYTES + MULTIPART_ENVELOPE_BYTES);
  if (!body.ok) {
    return body.reason === "too_large"
      ? errorResponse(413, "payload_too_large", TOO_LARGE)
      : errorResponse(400, "unreadable_body", "Could not read the upload.");
  }

  let form: FormData;
  try {
    form = await new Response(body.bytes as BodyInit, {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    return errorResponse(400, "invalid_form", "Send the file as multipart form data.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorResponse(422, "validation_failed", "Attach a file in the `file` field.");
  }
  if (file.size === 0) {
    return errorResponse(422, "empty_file", "That file is empty.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return errorResponse(413, "payload_too_large", TOO_LARGE);
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extraction = await extractDocumentText({
      name: file.name,
      type: file.type,
      bytes,
      signal: request.signal,
    });
    return NextResponse.json(extraction);
  } catch (err) {
    if (err instanceof ExtractError) return errorResponse(err.status, err.code, err.message);
    // Generic on purpose: parser errors can quote file content.
    return errorResponse(500, "extract_failed", "Could not read that file.");
  }
}
