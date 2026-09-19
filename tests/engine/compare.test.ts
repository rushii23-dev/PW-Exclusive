import { describe, expect, it } from "vitest";

import { analyzeDocument } from "@/lib/engine/analyze";
import { compare } from "@/lib/engine/compare";
import { NDA, RENTAL_AGREEMENT, SUBSCRIPTION_TOS } from "@/lib/samples";

describe("compare", () => {
  const rental = analyzeDocument(RENTAL_AGREEMENT);
  const nda = analyzeDocument(NDA);
  const comparison = compare(rental, nda);

  it("says which document carries more high-risk clauses", () => {
    expect(comparison.verdicts.length).toBeGreaterThan(0);
    expect(comparison.verdicts[0]).toContain("Document A");
    expect(comparison.verdicts[0]).toContain("high-risk");
  });

  it("puts one-sided coverage rows first", () => {
    const rows = comparison.categories;
    const firstBothIndex = rows.findIndex((r) => r.inA === r.inB);
    const lastOneSidedIndex = rows
      .map((r, i) => (r.inA !== r.inB ? i : -1))
      .reduce((a, b) => Math.max(a, b), -1);
    if (firstBothIndex !== -1 && lastOneSidedIndex !== -1) {
      expect(lastOneSidedIndex).toBeLessThan(firstBothIndex);
    }
  });

  it("marks findings by which document has them", () => {
    const autoRenewal = comparison.findings.find((f) => f.label === "Automatic renewal");
    expect(autoRenewal).toBeDefined();
    expect(autoRenewal!.presence).toBe("a"); // planted in the rental, not the NDA
  });

  it("lists number diffs for durations and money", () => {
    const kinds = comparison.numbers.map((n) => n.kind);
    expect(kinds).toContain("duration");
    expect(kinds).toContain("money");
  });

  it("is symmetric in coverage: swapping A and B swaps the rows", () => {
    const swapped = compare(nda, rental);
    const row = comparison.categories.find((r) => r.category === "auto-renewal");
    const swappedRow = swapped.categories.find((r) => r.category === "auto-renewal");
    expect(row!.inA).toBe(swappedRow!.inB);
    expect(row!.inB).toBe(swappedRow!.inA);
  });

  it("finds shared findings when both documents have the same trap", () => {
    const tos = analyzeDocument(SUBSCRIPTION_TOS);
    const rentalVsTos = compare(rental, tos);
    const shared = rentalVsTos.findings.find((f) => f.label === "Automatic renewal");
    expect(shared).toBeDefined();
    expect(shared!.presence).toBe("both");
  });
});
