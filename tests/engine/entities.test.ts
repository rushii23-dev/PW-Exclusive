import { describe, expect, it } from "vitest";

import { extractEntities } from "@/lib/engine/entities";

describe("extractEntities", () => {
  it("finds Indian and Western money formats", () => {
    const out = extractEntities(
      "Rent of Rs. 32,000 per month, deposit of ₹3,20,000, a fee of USD 4,000 and $29.99 monthly.",
    );
    const money = out.filter((e) => e.kind === "money").map((e) => e.text);
    expect(money).toContain("Rs. 32,000");
    expect(money).toContain("₹3,20,000");
    expect(money).toContain("USD 4,000");
    expect(money).toContain("$29.99");
  });

  it("finds dates in several formats", () => {
    const out = extractEntities(
      "Commencing on 1st April 2025, signed March 5, 2025, effective 01/04/2025.",
    );
    const dates = out.filter((e) => e.kind === "date");
    expect(dates.length).toBe(3);
  });

  it("parses 'thirty (30) days' style durations with normalised day values", () => {
    const out = extractEntities("within thirty (30) days and sixty (60) days notice");
    const durations = out.filter((e) => e.kind === "duration");
    expect(durations.map((d) => d.value)).toEqual([30, 60]);
  });

  it("parses word-only and numeral-only durations", () => {
    const out = extractEntities("a period of eleven months, then 2 weeks of handover");
    const durations = out.filter((e) => e.kind === "duration");
    expect(durations.map((d) => d.value)).toEqual([11 * 30, 14]);
  });

  it("extracts percentages with values", () => {
    const out = extractEntities("late fee of 2% per month and an increase of 10 percent");
    const pct = out.filter((e) => e.kind === "percentage");
    expect(pct.map((p) => p.value)).toEqual([2, 10]);
  });

  it("ignores duration-like phrases without a real number", () => {
    const out = extractEntities("during the days of the term the parties shall cooperate");
    expect(out.filter((e) => e.kind === "duration")).toHaveLength(0);
  });

  it("deduplicates repeated mentions", () => {
    const out = extractEntities("Rs. 5,000 now and Rs. 5,000 later");
    expect(out.filter((e) => e.kind === "money")).toHaveLength(1);
  });
});
