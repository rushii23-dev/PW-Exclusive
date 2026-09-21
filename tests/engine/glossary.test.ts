import { describe, expect, it } from "vitest";

import { findJargon, GLOSSARY } from "@/lib/engine/glossary";
import { EMPLOYMENT_CONTRACT, PG_LICENCE, RENTAL_AGREEMENT } from "@/lib/samples";

const terms = (text: string) => findJargon(text).map((j) => j.term);

describe("glossary", () => {
  it("has no duplicate terms", () => {
    const all = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(new Set(all).size).toBe(all.length);
  });

  it("gives every term a plain definition", () => {
    for (const g of GLOSSARY) expect(g.definition.length, g.term).toBeGreaterThan(30);
  });

  it("explains the lock-in period in the rental sample", () => {
    expect(terms(RENTAL_AGREEMENT)).toContain("lock-in period");
  });

  it("explains probation in the employment sample", () => {
    expect(terms(EMPLOYMENT_CONTRACT)).toContain("probation");
  });

  it("recognises paying-guest wording through its alias", () => {
    expect(terms("This is a Paying Guest arrangement.")).toContain("paying guest");
    expect(terms("Leave and License agreement dated 1 June")).toContain("leave and licence");
  });

  it("matches whole words only", () => {
    expect(terms("improbationary")).not.toContain("probation");
  });

  it("explains the deposit wording in the PG sample", () => {
    expect(terms(PG_LICENCE)).toContain("security deposit");
  });
});
