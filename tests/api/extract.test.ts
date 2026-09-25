import { deflateRawSync } from "node:zlib";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateContent } from "../ai/mock-gemini";

import { makeDocx, makePdf, pdfWithPages, zipOf } from "./files";

import { POST as extractPost } from "@/app/api/extract/route";
import { resetGeminiClient } from "@/lib/ai/gemini";
import { analyzeDocument } from "@/lib/engine";
import { detectKind, DOCX_LIMITS, MAX_PDF_PAGES, MAX_UPLOAD_BYTES, sniffImage, tidy } from "@/lib/server/extract";
import { resetRateLimits } from "@/lib/server/rate-limit";

const LINES = [
  "RESIDENTIAL LEASE AGREEMENT",
  "1. TERM",
  "The lease shall commence on 1st April 2025 for a period of eleven (11) months.",
  "2. RENT",
  "The Tenant shall pay a monthly rent of Rs. 32,000 on or before the 5th of each month.",
];

/** The first bytes of real image files — enough for the signature check. */
const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

function upload(bytes: Uint8Array, name: string, type: string): Request {
  const form = new FormData();
  form.append("file", new File([bytes as BlobPart], name, { type }));
  return new Request("http://localhost/api/extract", {
    method: "POST",
    headers: { "x-forwarded-for": "192.0.2.10" },
    body: form,
  });
}

beforeEach(() => {
  resetRateLimits();
  delete process.env.GEMINI_API_KEY;
  resetGeminiClient();
});

afterEach(() => {
  generateContent.mockReset();
  delete process.env.GEMINI_API_KEY;
  resetGeminiClient();
});

describe("detectKind", () => {
  it("trusts the extension when the browser sends a vague MIME type", () => {
    expect(detectKind("lease.PDF", "application/octet-stream")).toBe("pdf");
    expect(detectKind("offer.docx", "")).toBe("docx");
    expect(detectKind("photo.jpeg", "")).toBe("image");
    expect(detectKind("notes.md", "")).toBe("text");
    expect(detectKind("archive.zip", "application/zip")).toBeNull();
  });
});

describe("tidy", () => {
  it("normalises line endings and collapses blank runs", () => {
    expect(tidy("a\r\n\r\n\r\n\r\nb  \nc")).toBe("a\n\nb\nc");
  });
});

describe("POST /api/extract", () => {
  it("reads the text layer of a PDF without calling Gemini", async () => {
    const res = await extractPost(upload(makePdf(LINES), "lease.pdf", "application/pdf"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.method).toBe("pdf-text");
    expect(json.pages).toBe(1);
    expect(json.text).toContain("monthly rent of Rs. 32,000");
    expect(generateContent).not.toHaveBeenCalled();
    // Line structure survives, so the segmenter still finds separate clauses.
    const clauses = analyzeDocument(json.text).clauses.map((c) => c.heading);
    expect(clauses).toEqual(expect.arrayContaining(["Term", "Rent"]));
  });

  it("reads a Word document", async () => {
    const res = await extractPost(
      upload(
        await makeDocx(LINES),
        "lease.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.method).toBe("docx");
    expect(json.text).toContain("1. TERM");
    expect(json.text).toContain("eleven (11) months");
    // The first import of the .docx parser is slow on a cold test worker.
  }, 30_000);

  it("reads plain text files", async () => {
    const res = await extractPost(upload(new TextEncoder().encode(LINES.join("\n")), "lease.txt", "text/plain"));
    expect((await res.json()).method).toBe("text");
  });

  it("explains that photos need Gemini when no key is configured", async () => {
    const res = await extractPost(upload(JPEG_HEADER, "scan.jpg", "image/jpeg"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("ai_unavailable");
  });

  it("reads a photo with Gemini when configured", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    resetGeminiClient();
    generateContent.mockImplementation(async () => ({ text: LINES.join("\n\n"), candidates: [] }));
    const res = await extractPost(upload(JPEG_HEADER, "scan.jpg", "image/jpeg"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.method).toBe("gemini-vision");
    expect(json.text).toContain("RESIDENTIAL LEASE AGREEMENT");
  });

  it("reports an unreadable photo clearly", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    resetGeminiClient();
    generateContent.mockImplementation(async () => ({ text: "NO_TEXT_FOUND", candidates: [] }));
    const res = await extractPost(upload(PNG_HEADER, "blurry.png", "image/png"));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_text_found");
  });

  it("rejects unsupported file types with 415", async () => {
    const res = await extractPost(upload(new Uint8Array([1, 2, 3]), "data.zip", "application/zip"));
    expect(res.status).toBe(415);
  });

  it("rejects empty files", async () => {
    const res = await extractPost(upload(new Uint8Array(), "empty.pdf", "application/pdf"));
    expect(res.status).toBe(422);
  });

  it("rejects files over 4 MB with 413", async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 10);
    const res = await extractPost(upload(big, "huge.pdf", "application/pdf"));
    expect(res.status).toBe(413);
  });

  it("rejects a request without a file", async () => {
    const form = new FormData();
    form.append("nope", "x");
    const res = await extractPost(
      new Request("http://localhost/api/extract", { method: "POST", body: form }),
    );
    expect(res.status).toBe(422);
  });
});

describe("sniffImage", () => {
  it("names the real format from the first bytes, whatever the file is called", () => {
    const riff = (tag: string) => new TextEncoder().encode(`RIFF\0\0\0\0${tag}VP8 `);
    const ftyp = (brand: string) => new TextEncoder().encode(`\0\0\0\u0018ftyp${brand}`);
    expect(sniffImage(PNG_HEADER)).toBe("image/png");
    expect(sniffImage(JPEG_HEADER)).toBe("image/jpeg");
    expect(sniffImage(riff("WEBP"))).toBe("image/webp");
    expect(sniffImage(ftyp("heic"))).toBe("image/heic");
    expect(sniffImage(ftyp("mif1"))).toBe("image/heif");
    expect(sniffImage(riff("WAVE"))).toBeNull();
    expect(sniffImage(ftyp("isom"))).toBeNull(); // an MP4 video, not a photo
    expect(sniffImage(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
  });
});

describe("POST /api/extract — the bytes must match the claimed type", () => {
  const text = new TextEncoder().encode(LINES.join("\n"));

  it.each([
    ["a text file renamed .pdf", text, "lease.pdf", "application/pdf"],
    ["a text file renamed .docx", text, "lease.docx", ""],
    ["a PDF renamed .jpg", makePdf(LINES), "scan.jpg", "image/jpeg"],
    ["a binary file renamed .txt", new Uint8Array([0x4d, 0x5a, 0x00, 0x01, 0x02]), "notes.txt", "text/plain"],
  ])("refuses %s with 415 before any parser or model sees it", async (_label, bytes, name, type) => {
    process.env.GEMINI_API_KEY = "test-key";
    resetGeminiClient();
    const res = await extractPost(upload(bytes, name, type));
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe("file_type_mismatch");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("explains a text file that is not UTF-8", async () => {
    const res = await extractPost(upload(new Uint8Array([0x4c, 0x65, 0xe9, 0x61, 0x73, 0x65]), "lease.txt", "text/plain"));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("unreadable_file");
  });

  it("finds a PDF header behind a little leading junk, as PDF readers do", async () => {
    const pdf = makePdf(LINES);
    const padded = new Uint8Array(pdf.length + 3);
    padded.set([0x0a, 0x0a, 0x0a]);
    padded.set(pdf, 3);
    const res = await extractPost(upload(padded, "lease.pdf", "application/pdf"));
    expect(res.status).not.toBe(415);
  });
});

describe("POST /api/extract — request guards", () => {
  it("refuses a body that is not multipart form data", async () => {
    const res = await extractPost(
      new Request("http://localhost/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: "x" }),
      }),
    );
    expect(res.status).toBe(415);
  });

  it("stops reading a streamed upload that runs past the cap, even without a Content-Length", async () => {
    let pulled = 0;
    const chunk = new Uint8Array(256 * 1024);
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const res = await extractPost(
      new Request("http://localhost/api/extract", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=x" },
        body: endless,
        duplex: "half",
      } as RequestInit),
    );
    expect(res.status).toBe(413);
    // It gave up just past 4 MB instead of buffering forever.
    expect(pulled).toBeLessThan(6 * 1024 * 1024);
  });

  it("refuses uploads another website's page tries to make", async () => {
    const req = upload(PNG_HEADER, "scan.png", "image/png");
    req.headers.set("sec-fetch-site", "cross-site");
    const res = await extractPost(req);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("cross_site_request");
  });
});

describe("POST /api/extract — files built to exhaust the server", () => {
  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  it("refuses a Word file whose XML inflates past the budget, before the parser opens it", async () => {
    // ~50 KB on the wire, 64 MB unpacked, and headers that claim 100 bytes.
    const bomb = zipOf([
      { name: "[Content_Types].xml", data: new TextEncoder().encode("<Types/>"), method: 0, declaredSize: 8 },
      {
        name: "word/document.xml",
        data: new Uint8Array(deflateRawSync(Buffer.alloc(DOCX_LIMITS.maxInflatedBytes + 16 * 1024 * 1024, 0x20))),
        method: 8,
        declaredSize: 100,
      },
    ]);
    expect(bomb.byteLength).toBeLessThan(MAX_UPLOAD_BYTES);
    const res = await extractPost(upload(bomb, "offer.docx", DOCX));
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("archive_too_large");
  }, 30_000);

  it("refuses a Word file that is not a well-formed archive", async () => {
    const zipHeaderOnly = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    const res = await extractPost(upload(zipHeaderOnly, "offer.docx", DOCX));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("unreadable_file");
  });

  it("reads no more than MAX_PDF_PAGES pages of a PDF, and says the text was cut short", async () => {
    const pages = Array.from({ length: MAX_PDF_PAGES + 20 }, (_, i) => [`Clause ${i + 1}. The tenant pays rent.`]);
    const res = await extractPost(upload(pdfWithPages(pages), "long.pdf", "application/pdf"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pages).toBe(MAX_PDF_PAGES + 20);
    expect(json.truncated).toBe(true);
    expect(json.text).toContain(`Clause ${MAX_PDF_PAGES}.`);
    expect(json.text).not.toContain(`Clause ${MAX_PDF_PAGES + 1}.`);
  }, 30_000);
});
