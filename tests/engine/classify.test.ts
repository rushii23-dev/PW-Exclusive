import { describe, expect, it } from "vitest";

import { classifyClause } from "@/lib/engine/classify";
import { LEXICON } from "@/lib/engine/lexicon";

describe("classifyClause", () => {
  it("returns no findings and null risk for neutral text", () => {
    const out = classifyClause(
      "The parties met on Tuesday to discuss the colour of the office walls.",
    );
    expect(out.findings).toHaveLength(0);
    expect(out.risk).toBeNull();
    expect(out.categories).toHaveLength(0);
  });

  it.each([
    ["The lease shall be deemed renewed automatically for successive terms.", "auto-renewal"],
    ["Any dispute shall be resolved exclusively by binding arbitration.", "binding-arbitration"],
    ["The Contractor shall indemnify and hold harmless the Client.", "one-way-indemnity"],
    ["All fees are non-refundable.", "non-refundable"],
    ["We may modify these Terms at any time without prior notice.", "unilateral-modification"],
    ["The Employee shall not engage in any business that competes with the Company.", "non-compete"],
    ["The Landlord may enter the premises at any time.", "entry-without-notice"],
    ["You waive your right to a jury trial.", "jury-waiver"],
    ["claims may not be brought as a plaintiff or class member in any class proceeding", "class-action-waiver"],
    ["The Company may deduct from the salary any amounts owed, including training costs.", "salary-deduction"],
    ["a perpetual, irrevocable, worldwide, royalty-free license to use your content", "license-to-content"],
    ["The undersigned agrees to be jointly and severally liable for all obligations.", "personal-guarantee"],
  ])("flags %s as %s", (text, ruleId) => {
    const out = classifyClause(text);
    expect(out.findings.map((f) => f.ruleId)).toContain(ruleId);
  });

  it("attaches the triggering sentence as evidence", () => {
    const text =
      "This clause covers many things. The deposit shall be forfeited if the Tenant vacates early. Other provisions apply.";
    const out = classifyClause(text);
    const finding = out.findings.find((f) => f.ruleId === "deposit-conditions");
    expect(finding).toBeDefined();
    expect(finding!.evidence).toContain("deposit shall be forfeited");
    expect(finding!.evidence).not.toContain("many things");
  });

  it("sets clause risk to the worst finding present", () => {
    const out = classifyClause(
      "This agreement is subject to force majeure. All payments are non-refundable.",
    );
    // force-majeure is low, non-refundable is high → clause is high.
    expect(out.risk).toBe("high");
  });

  it("orders findings worst-first", () => {
    const out = classifyClause(
      "Notices shall be in writing. All fees are non-refundable. A late fee of 2% per month applies.",
    );
    const levels = out.findings.map((f) => f.level);
    const rank = { high: 3, medium: 2, low: 1 } as const;
    for (let i = 1; i < levels.length; i++) {
      expect(rank[levels[i - 1]]).toBeGreaterThanOrEqual(rank[levels[i]]);
    }
  });
});

describe("LEXICON hygiene", () => {
  it("has unique rule ids", () => {
    const ids = LEXICON.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rule has explanation and advice prose", () => {
    for (const rule of LEXICON) {
      expect(rule.explanation.length, rule.id).toBeGreaterThan(30);
      expect(rule.advice.length, rule.id).toBeGreaterThan(15);
      expect(rule.label.length, rule.id).toBeGreaterThan(2);
    }
  });

  it("no rule pattern uses the global flag (stateful lastIndex breaks exec)", () => {
    for (const rule of LEXICON) {
      expect(rule.pattern.global, rule.id).toBe(false);
    }
  });
});
