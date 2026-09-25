import { beforeEach, describe, expect, it, vi } from "vitest";

import { pdfWithPages } from "./files";

import { MAX_DOCUMENT_CHARS } from "@/lib/engine";
import { extractDocumentText } from "@/lib/server/extract";

/** Pages the extractor asked pdf.js for. */
const reads = vi.hoisted(() => ({ pages: 0 }));

// The real parser, with every page request counted.
vi.mock("unpdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("unpdf")>();
  return {
    ...actual,
    getDocumentProxy: async (...args: Parameters<typeof actual.getDocumentProxy>) => {
      const pdf = await actual.getDocumentProxy(...args);
      const getPage = pdf.getPage.bind(pdf);
      pdf.getPage = (n: number) => {
        reads.pages++;
        return getPage(n);
      };
      return pdf;
    },
  };
});

beforeEach(() => {
  reads.pages = 0;
});

describe("reading a PDF's text layer", () => {
  const line = "The Tenant shall pay the monthly rent on or before the fifth day of each month.";
  /** A full page of text, about 4,000 characters: fifty or so fill one analysis. */
  const fullPage = Array.from({ length: 50 }, () => line);
  const pagesNeeded = Math.ceil(MAX_DOCUMENT_CHARS / (fullPage.length * (line.length + 1)));

  it("stops at the page that brings in enough text, leaving the rest unread", async () => {
    const pdf = pdfWithPages(Array.from({ length: 2 * pagesNeeded }, () => fullPage));
    const result = await extractDocumentText({ name: "long.pdf", type: "application/pdf", bytes: pdf });
    expect(result.method).toBe("pdf-text");
    expect(result.pages).toBe(2 * pagesNeeded);
    expect(result.truncated).toBe(true);
    expect(result.text).toHaveLength(MAX_DOCUMENT_CHARS);
    // Half the file is never parsed.
    expect(reads.pages).toBeGreaterThanOrEqual(pagesNeeded);
    expect(reads.pages).toBeLessThanOrEqual(pagesNeeded + 1);
  }, 30_000);

  it("reads every page of a document that fits, and does not call it truncated", async () => {
    const pdf = pdfWithPages(Array.from({ length: 3 }, (_, i) => [`${i + 1}. CLAUSE`, line]));
    const result = await extractDocumentText({ name: "short.pdf", type: "application/pdf", bytes: pdf });
    expect(reads.pages).toBe(3);
    expect(result.truncated).toBe(false);
    expect(result.text).toContain("3. CLAUSE");
  });
});
