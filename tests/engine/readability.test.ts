import { describe, expect, it } from "vitest";

import { computeReadability } from "@/lib/engine/readability";
import { findJargon } from "@/lib/engine/glossary";

const SIMPLE = "The cat sat on the mat. The dog ran to the park. We like short words.";
const LEGALESE =
  "Notwithstanding anything hereinbefore contained, the party of the first part shall indemnify, defend and hold harmless the party of the second part from and against any and all claims, demands, liabilities, obligations, damages and expenses whatsoever arising out of or in connection with the performance or non-performance of the obligations contemplated hereunder.";

describe("computeReadability", () => {
  it("scores simple prose as easier than legalese", () => {
    const simple = computeReadability(SIMPLE);
    const legal = computeReadability(LEGALESE);
    expect(simple.fleschScore).toBeGreaterThan(legal.fleschScore);
    expect(legal.band).toBe("very hard");
  });

  it("keeps the score within 0–100", () => {
    for (const text of [SIMPLE, LEGALESE, "word"]) {
      const r = computeReadability(text);
      expect(r.fleschScore).toBeGreaterThanOrEqual(0);
      expect(r.fleschScore).toBeLessThanOrEqual(100);
    }
  });

  it("counts words and sentences", () => {
    const r = computeReadability(SIMPLE);
    expect(r.sentenceCount).toBe(3);
    expect(r.wordCount).toBe(16);
  });

  it("reports at least one minute of reading time", () => {
    expect(computeReadability("short text here").readingTimeMinutes).toBe(1);
  });
});

describe("findJargon", () => {
  it("matches terms by alias", () => {
    const hits = findJargon("The Contractor shall hold harmless the Client.");
    expect(hits.map((h) => h.term)).toContain("indemnify");
  });

  it("reports each term once", () => {
    const hits = findJargon("indemnify indemnify indemnification indemnity");
    expect(hits.filter((h) => h.term === "indemnify")).toHaveLength(1);
  });

  it("matches whole words only", () => {
    // "lien" must not fire inside "client".
    const hits = findJargon("The client was satisfied.");
    expect(hits.map((h) => h.term)).not.toContain("lien");
  });
});

describe("jargon density", () => {
  it("counts glossary terms as whole words only", () => {
    // Substring matching would count "lien" (client) and "term" (determine).
    const plain = "The client and the staff determine the date together. We like short words.";
    expect(computeReadability(plain).jargonDensity).toBe(0);
    expect(computeReadability(`${plain} A lien applies.`).jargonDensity).toBeGreaterThan(0);
  });
});
