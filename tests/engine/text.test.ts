import { describe, expect, it } from "vitest";

import {
  countSyllables,
  normalizeWhitespace,
  parseNumberWord,
  splitSentences,
  stem,
  tokenize,
  truncateAtWord,
} from "@/lib/engine/text";

describe("stem", () => {
  it("brings inflections of one word together", () => {
    const forms = ["renew", "renews", "renewed", "renewal", "renewing"].map(stem);
    expect(new Set(forms).size).toBe(1);
    expect(stem("terminate")).toBe(stem("terminated"));
    expect(stem("termination")).toBe(stem("terminate"));
    expect(stem("penalties")).toBe(stem("penalty"));
  });

  it("leaves short words and numbers alone", () => {
    expect(stem("pay")).toBe("pay");
    expect(stem("60")).toBe("60");
    expect(stem("2025s")).toBe("2025s");
  });

  it("keeps the double s of words like 'business'", () => {
    expect(stem("business")).toBe("business");
  });
});

describe("tokenize", () => {
  it("lowercases and strips punctuation", () => {
    expect(tokenize("The Tenant SHALL pay Rs. 32,000!")).toEqual([
      "the", "tenant", "shall", "pay", "rs", "32", "000",
    ]);
  });

  it("keeps contractions together", () => {
    expect(tokenize("attorney's fees")).toEqual(["attorney's", "fees"]);
  });

  it("returns empty array for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("splitSentences", () => {
  it("splits on terminal punctuation", () => {
    expect(splitSentences("First rule. Second rule? Third rule!")).toHaveLength(3);
  });

  it("does not split on legal abbreviations", () => {
    const out = splitSentences("As per Sec. 42 of the Act, rent of Rs. 5,000 is due.");
    expect(out).toHaveLength(1);
  });

  it("does not split inside decimal numbers", () => {
    const out = splitSentences("Interest accrues at 1.5% per month. It compounds.");
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("1.5%");
  });

  it("treats semicolons as boundaries — legal prose uses them as full stops", () => {
    const out = splitSentences("The Tenant shall pay rent; the Landlord shall provide water.");
    expect(out).toHaveLength(2);
  });
});

describe("parseNumberWord", () => {
  it.each([
    ["thirty", 30],
    ["twenty-one", 21],
    ["ninety nine", 99],
    ["eleven", 11],
    ["one hundred", 100],
    ["7", 7],
  ])("parses %s as %d", (word, expected) => {
    expect(parseNumberWord(word)).toBe(expected);
  });

  it("returns null for non-numbers", () => {
    expect(parseNumberWord("the")).toBeNull();
    expect(parseNumberWord("business")).toBeNull();
  });
});

describe("countSyllables", () => {
  it("gives at least one syllable to any word", () => {
    expect(countSyllables("a")).toBeGreaterThanOrEqual(1);
  });

  it("counts polysyllabic legal words higher than simple ones", () => {
    expect(countSyllables("indemnification")).toBeGreaterThan(countSyllables("rent"));
  });
});

describe("normalizeWhitespace", () => {
  it("collapses runs of spaces but keeps paragraph breaks", () => {
    const out = normalizeWhitespace("a   b\r\n\r\n\r\n\r\nc");
    expect(out).toBe("a b\n\nc");
  });
});

describe("truncateAtWord", () => {
  it("returns short strings untouched", () => {
    expect(truncateAtWord("short", 100)).toBe("short");
  });

  it("cuts at a word boundary with an ellipsis", () => {
    const out = truncateAtWord("the quick brown fox jumps over the lazy dog", 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(21);
  });
});
