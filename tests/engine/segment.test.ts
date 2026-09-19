import { describe, expect, it } from "vitest";

import { segment } from "@/lib/engine/segment";
import { RENTAL_AGREEMENT } from "@/lib/samples";

describe("segment", () => {
  it("returns empty for empty input", () => {
    expect(segment("")).toEqual([]);
    expect(segment("   \n\n  ")).toEqual([]);
  });

  it("splits a numbered agreement into its clauses with headings", () => {
    const clauses = segment(RENTAL_AGREEMENT);
    // 11 numbered clauses plus title/preamble material.
    expect(clauses.length).toBeGreaterThanOrEqual(11);
    const headings = clauses.map((c) => c.heading).filter(Boolean);
    expect(headings).toContain("Term");
    expect(headings).toContain("Security Deposit");
    expect(headings).toContain("Governing Law");
  });

  it("keeps the preamble (parties) as its own clause", () => {
    const clauses = segment(RENTAL_AGREEMENT);
    const preamble = clauses.find((c) => c.text.includes("Rajesh Kumar"));
    expect(preamble).toBeDefined();
  });

  it("converts SHOUTING headings to title case", () => {
    const clauses = segment("1. PAYMENT TERMS\nRent is due monthly.\n2. NOTICES\nNotices must be written.\n3. WAIVER\nNo waiver applies.");
    expect(clauses[0].heading).toBe("Payment Terms");
  });

  it("falls back to paragraph splitting when there is no numbering", () => {
    const doc = [
      "This agreement is between two parties and sets out terms of engagement for services.",
      "Payment is due within thirty days of each invoice being submitted by the provider.",
      "Either party may terminate this arrangement with fourteen days written notice.",
    ].join("\n\n");
    const clauses = segment(doc);
    expect(clauses).toHaveLength(3);
    expect(clauses.every((c) => c.heading === null)).toBe(true);
  });

  it("merges stub fragments into the previous clause", () => {
    const doc = "First paragraph of the agreement with plenty of words to stand alone.\n\nOk.\n\nAnother full paragraph with enough text to be treated as its own clause here.";
    const clauses = segment(doc);
    expect(clauses).toHaveLength(2);
    expect(clauses[0].text).toContain("Ok.");
  });

  it("separates inline headings like 'TERMINATION. Either party…'", () => {
    const doc =
      "4. TERMINATION. Either party may terminate this agreement with sixty days notice.\n" +
      "5. NOTICES. All notices shall be in writing.\n" +
      "6. WAIVER. No failure to enforce shall be a waiver.";
    const clauses = segment(doc);
    expect(clauses[0].heading).toBe("Termination");
    expect(clauses[0].text).toContain("Either party may terminate");
  });
});
