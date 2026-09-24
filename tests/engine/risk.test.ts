import { describe, expect, it } from "vitest";

import { byLevelDesc, LEVEL_ORDER, worseLevel } from "@/lib/engine/risk";
import { NUM_WORD, parseNumberWord } from "@/lib/engine/text";

describe("risk ordering", () => {
  it("ranks high above medium above low", () => {
    expect(LEVEL_ORDER.high).toBeGreaterThan(LEVEL_ORDER.medium);
    expect(LEVEL_ORDER.medium).toBeGreaterThan(LEVEL_ORDER.low);
  });

  it("sorts worst first", () => {
    const sorted = [{ level: "low" as const }, { level: "high" as const }, { level: "medium" as const }].sort(
      byLevelDesc,
    );
    expect(sorted.map((f) => f.level)).toEqual(["high", "medium", "low"]);
  });

  it("picks the worse of two levels, with null as 'not flagged'", () => {
    expect(worseLevel("low", "high")).toBe("high");
    expect(worseLevel("medium", "low")).toBe("medium");
    expect(worseLevel(null, "low")).toBe("low");
    expect(worseLevel("medium", null)).toBe("medium");
    expect(worseLevel(null, null)).toBeNull();
  });
});

describe("NUM_WORD", () => {
  it("matches exactly the words parseNumberWord understands", () => {
    const words = NUM_WORD.slice(3, -1).split("|");
    expect(words.length).toBeGreaterThan(25);
    for (const w of words) expect(parseNumberWord(w)).not.toBeNull();
    expect(new RegExp(`^${NUM_WORD}$`).test("seventeen")).toBe(true);
    expect(new RegExp(`^${NUM_WORD}$`).test("zero")).toBe(false);
  });
});
