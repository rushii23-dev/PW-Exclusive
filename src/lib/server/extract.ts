/**
 * Turn an uploaded file into document text.
 *
 * Deterministic first: a PDF with a text layer is read directly, a Word file
 * is unzipped and read directly — no model involved, nothing leaves the
 * server. Only when there is no text to read (a scanned PDF, a photo taken
 * on a phone) does Gemini act as the eyes. Either way the result is plain
 * text that goes through the same analysis as anything pasted in.
 */

import { transcribeDocument, isAiConfigured } from "@/lib/ai/gemini";
import { MAX_DOCUMENT_CHARS, MIN_DOCUMENT_CHARS } from "@/lib/engine";

/** Fits comfortably under common serverless request limits. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type ExtractionMethod = "text" | "pdf-text" | "docx" | "gemini-vision";

export interface Extraction {
  text: string;
  method: ExtractionMethod;
  /** True when the file held more text than one analysis accepts. */
  truncated: boolean;
  pages?: number;
}

export class ExtractError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Browsers are inconsistent about MIME types; the extension settles it. */
export function detectKind(name: string, type: string): "pdf" | "docx" | "image" | "text" | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (type === DOCX_TYPE || ext === "docx") return "docx";
  if (IMAGE_TYPES.has(type) || ["png", "jpg", "jpeg", "webp", "heic", "heif"].includes(ext)) return "image";
  if (type.startsWith("text/") || ["txt", "md", "text"].includes(ext)) return "text";
  return null;
}

function imageMime(name: string, type: string): string {
  if (IMAGE_TYPES.has(type)) return type;
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return `image/${ext}`;
  return "image/jpeg";
}

/** Tidy extracted text: normalise line endings, collapse runs of blank lines. */
export function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+\n/g, "\n")
    .replace(/ /g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finish(text: string, method: ExtractionMethod, pages?: number): Extraction {
  const clean = tidy(text);
  const truncated = clean.length > MAX_DOCUMENT_CHARS;
  return { text: truncated ? clean.slice(0, MAX_DOCUMENT_CHARS) : clean, method, truncated, pages };
}

async function readPdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  return { text: text.join("\n\n"), pages: totalPages };
}

async function readDocxText(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return value;
}

async function viaGemini(bytes: Uint8Array, mimeType: string, what: string): Promise<string> {
  if (!isAiConfigured()) {
    throw new ExtractError(
      503,
      "ai_unavailable",
      `Reading ${what} needs Gemini, which isn't configured here. Paste the text instead, or upload a PDF with selectable text.`,
    );
  }
  const text = await transcribeDocument({ mimeType, data: bytes });
  if (!text) {
    throw new ExtractError(
      422,
      "no_text_found",
      `Couldn't read any text from that ${what}. Try a clearer, well-lit photo, or paste the text instead.`,
    );
  }
  return text;
}

export async function extractDocumentText(file: {
  name: string;
  type: string;
  bytes: Uint8Array;
}): Promise<Extraction> {
  const kind = detectKind(file.name, file.type);
  if (!kind) {
    throw new ExtractError(
      415,
      "unsupported_type",
      "That file type isn't supported. Upload a PDF, Word (.docx), image or text file.",
    );
  }

  if (kind === "text") {
    return finish(new TextDecoder().decode(file.bytes), "text");
  }

  if (kind === "docx") {
    let text: string;
    try {
      text = await readDocxText(file.bytes);
    } catch {
      throw new ExtractError(422, "unreadable_file", "That Word file couldn't be opened. Is it a .docx (not an older .doc)?");
    }
    if (tidy(text).length < MIN_DOCUMENT_CHARS) {
      throw new ExtractError(422, "no_text_found", "That Word file doesn't contain enough text to analyse.");
    }
    return finish(text, "docx");
  }

  if (kind === "image") {
    return finish(await viaGemini(file.bytes, imageMime(file.name, file.type), "a photo"), "gemini-vision");
  }

  // PDF: use the text layer when there is one; a scan has none.
  let pdf: { text: string; pages: number } | null = null;
  try {
    pdf = await readPdfText(file.bytes);
  } catch {
    // Damaged or encrypted — Gemini may still be able to read it.
  }
  if (pdf && tidy(pdf.text).length >= MIN_DOCUMENT_CHARS) {
    return finish(pdf.text, "pdf-text", pdf.pages);
  }
  return finish(await viaGemini(file.bytes, "application/pdf", "a scanned PDF"), "gemini-vision", pdf?.pages);
}
