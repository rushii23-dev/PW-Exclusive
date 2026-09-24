/**
 * Turn an uploaded file into document text.
 *
 * Deterministic first: a PDF with a text layer is read directly, a Word file
 * is unzipped and read directly — no model involved, nothing leaves the
 * server. Only when there is no text to read (a scanned PDF, a photo taken
 * on a phone) does Gemini act as the eyes. Either way the result is plain
 * text that goes through the same analysis as anything pasted in.
 */

import "server-only";

import { transcribeDocument, isAiConfigured } from "@/lib/ai/gemini";
import { MAX_DOCUMENT_CHARS, MIN_DOCUMENT_CHARS } from "@/lib/engine";

export { MAX_UPLOAD_BYTES } from "@/lib/limits";

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

const startsWith = (bytes: Uint8Array, signature: number[], at = 0) =>
  signature.every((b, i) => bytes[at + i] === b);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** HEIF-family brands a phone camera writes after the `ftyp` box marker. */
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/**
 * The real image format, read from the file's first bytes — never from its
 * name or the browser's claim — or null if the bytes are not an image we read.
 */
export function sniffImage(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "image/webp";
  if (startsWith(bytes, ascii("ftyp"), 4)) {
    const brand = String.fromCharCode(...bytes.subarray(8, 12));
    if (HEIF_BRANDS.has(brand)) return brand.startsWith("hei") ? "image/heic" : "image/heif";
  }
  return null;
}

/** PDFs may carry a little junk before the header; readers allow 1 KB of it. */
function looksLikePdf(bytes: Uint8Array): boolean {
  const head = String.fromCharCode(...bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

/** A .docx is a ZIP container. */
function looksLikeZip(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
}

function mismatch(): ExtractError {
  return new ExtractError(
    415,
    "file_type_mismatch",
    "That file's contents don't match its type. Upload a real PDF, Word (.docx), image or text file.",
  );
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

async function viaGemini(
  bytes: Uint8Array,
  mimeType: string,
  what: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!isAiConfigured()) {
    throw new ExtractError(
      503,
      "ai_unavailable",
      `Reading ${what} needs Gemini, which isn't configured here. Paste the text instead, or upload a PDF with selectable text.`,
    );
  }
  const text = await transcribeDocument({ mimeType, data: bytes, signal });
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
  /** The upload request; reading stops if the uploader goes away. */
  signal?: AbortSignal;
}): Promise<Extraction> {
  const kind = detectKind(file.name, file.type);
  if (!kind) {
    throw new ExtractError(
      415,
      "unsupported_type",
      "That file type isn't supported. Upload a PDF, Word (.docx), image or text file.",
    );
  }

  // The name and MIME type are the uploader's claims; the bytes are the
  // truth. Check them before any parser or model sees the file.
  if (kind === "text") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(file.bytes);
    } catch {
      throw new ExtractError(422, "unreadable_file", "That text file isn't valid UTF-8 text. Save it as UTF-8, or paste the text instead.");
    }
    // A NUL byte never appears in real text; it marks a binary file renamed .txt.
    if (text.includes("\u0000")) throw mismatch();
    return finish(text, "text");
  }

  if (kind === "docx") {
    if (!looksLikeZip(file.bytes)) throw mismatch();
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
    const mimeType = sniffImage(file.bytes);
    if (!mimeType) throw mismatch();
    return finish(await viaGemini(file.bytes, mimeType, "a photo", file.signal), "gemini-vision");
  }

  if (!looksLikePdf(file.bytes)) throw mismatch();
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
  return finish(
    await viaGemini(file.bytes, "application/pdf", "a scanned PDF", file.signal),
    "gemini-vision",
    pdf?.pages,
  );
}
