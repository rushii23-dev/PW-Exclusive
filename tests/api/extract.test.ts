import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generateContent } from "../ai/mock-gemini";

import { POST as extractPost } from "@/app/api/extract/route";
import { resetGeminiClient } from "@/lib/ai/gemini";
import { analyzeDocument } from "@/lib/engine";
import { detectKind, tidy } from "@/lib/server/extract";
import { resetRateLimits } from "@/lib/server/rate-limit";

const LINES = [
  "RESIDENTIAL LEASE AGREEMENT",
  "1. TERM",
  "The lease shall commence on 1st April 2025 for a period of eleven (11) months.",
  "2. RENT",
  "The Tenant shall pay a monthly rent of Rs. 32,000 on or before the 5th of each month.",
];

/** A real, minimal PDF with one line of text per entry, offsets computed exactly. */
function makePdf(lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = ["BT", "/F1 11 Tf", "14 TL", "50 780 Td", ...lines.map((l) => `(${esc(l)}) Tj T*`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(out);
}

async function makeDocx(paragraphs: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  const body = paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`).join("");
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

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
    const res = await extractPost(upload(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "scan.jpg", "image/jpeg"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("ai_unavailable");
  });

  it("reads a photo with Gemini when configured", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    resetGeminiClient();
    generateContent.mockImplementation(async () => ({ text: LINES.join("\n\n"), candidates: [] }));
    const res = await extractPost(upload(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "scan.jpg", "image/jpeg"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.method).toBe("gemini-vision");
    expect(json.text).toContain("RESIDENTIAL LEASE AGREEMENT");
  });

  it("reports an unreadable photo clearly", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    resetGeminiClient();
    generateContent.mockImplementation(async () => ({ text: "NO_TEXT_FOUND", candidates: [] }));
    const res = await extractPost(upload(new Uint8Array([1, 2, 3]), "blurry.png", "image/png"));
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
