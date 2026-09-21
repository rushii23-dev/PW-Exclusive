/**
 * POST /api/extract — read the text out of an uploaded file.
 *
 * Accepts multipart form data with a single `file`: PDF, Word (.docx), an
 * image of a document, or plain text. Returns the text for the reader to
 * review before analysing. The file is held in memory for the length of the
 * request and never written anywhere.
 */

import { NextResponse } from "next/server";

import { rateLimitOr429, errorResponse } from "@/lib/server/http";
import { ExtractError, extractDocumentText, MAX_UPLOAD_BYTES } from "@/lib/server/extract";

export const runtime = "nodejs";
export const maxDuration = 120;

const RATE_LIMIT_PER_MINUTE = 10;

export async function POST(request: Request) {
  const limited = rateLimitOr429(request, "extract", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const declared = parseInt(request.headers.get("content-length") ?? "0", 10);
  // Multipart adds a little envelope around the file itself.
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return errorResponse(413, "payload_too_large", "That file is too large — the limit is 4 MB.");
  }

  let form: FormData;
  try {
    form = await request.formData();
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
    return errorResponse(413, "payload_too_large", "That file is too large — the limit is 4 MB.");
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extraction = await extractDocumentText({ name: file.name, type: file.type, bytes });
    return NextResponse.json(extraction);
  } catch (err) {
    if (err instanceof ExtractError) return errorResponse(err.status, err.code, err.message);
    // Generic on purpose: parser errors can quote file content.
    return errorResponse(500, "extract_failed", "Could not read that file.");
  }
}
