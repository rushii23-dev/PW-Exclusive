import { describe, expect, it } from "vitest";

import { analyzeDocument } from "@/lib/engine";
import { SAMPLES } from "@/lib/samples";

const PREAMBLE =
  "This Agreement is made between the Company and the Consultant for the provision of services described below.\n\n";

function inconsistencies(body: string) {
  return analyzeDocument(PREAMBLE + body).inconsistencies;
}

describe("findInconsistencies", () => {
  it("flags words and figures that disagree", () => {
    const found = inconsistencies(
      "1. TERM\nThe Consultant shall give thirty (45) days notice before leaving the engagement.\n\n2. PAYMENT\nFees are payable monthly.\n\n3. LAW\nThis agreement is governed by the laws of India.",
    );
    const hit = found.find((i) => i.kind === "number-mismatch");
    expect(hit).toBeDefined();
    expect(hit!.explanation).toMatch(/30/);
    expect(hit!.explanation).toMatch(/45/);
    expect(hit!.evidence[0].quote).toContain("thirty (45)");
  });

  it("does not flag words and figures that agree", () => {
    const found = inconsistencies(
      "1. TERM\nEither party may terminate with sixty (60) days written notice.\n\n2. FEES\nThe Company shall pay twenty-one (21) days after invoice.",
    );
    expect(found.filter((i) => i.kind === "number-mismatch")).toHaveLength(0);
  });

  it("flags different notice periods for ending the agreement across clauses", () => {
    const found = inconsistencies(
      "1. TERMINATION\nEither party may terminate this Agreement by giving thirty (30) days written notice.\n\n2. EXIT\nThe Consultant may terminate the engagement by giving ninety (90) days notice to the Company.",
    );
    const hit = found.find((i) => i.id === "conflicting-notice");
    expect(hit).toBeDefined();
    expect(hit!.evidence).toHaveLength(2);
  });

  it("ignores durations that only share a sentence with the word notice", () => {
    const found = inconsistencies(
      "1. PROBATION\nThe probation lasts six (6) months, during which the Company may terminate without notice.\n\n2. TERMINATION\nEither party may terminate by giving thirty (30) days written notice.",
    );
    expect(found.find((i) => i.id === "conflicting-notice")).toBeUndefined();
  });

  it("flags one amount stated as two different figures", () => {
    const found = inconsistencies(
      "1. DEPOSIT\nThe Tenant shall pay a security deposit of Rs. 50,000 on signing.\n\n2. REFUND\nThe security deposit of Rs. 60,000 shall be refunded within thirty days of vacating.",
    );
    const hit = found.find((i) => i.id === "conflicting-deposit");
    expect(hit).toBeDefined();
    expect(hit!.explanation).toMatch(/50,000/);
    expect(hit!.explanation).toMatch(/60,000/);
  });

  it("still flags the conflict when the sentence also mentions deductions", () => {
    const found = inconsistencies(
      "1. DEPOSIT\nThe Tenant shall pay a security deposit of Rs. 50,000.\n\n2. REFUND\nThe security deposit of Rs. 60,000 shall be refunded after deductions.",
    );
    expect(found.find((i) => i.id === "conflicting-deposit")).toBeDefined();
  });

  it("does not treat a deduction from the deposit as a second deposit figure", () => {
    const found = inconsistencies(
      "1. DEPOSIT\nThe Tenant shall pay a security deposit of Rs. 50,000.\n\n2. DAMAGE\nRs. 5,000 shall be deducted from the deposit for each broken fixture.",
    );
    expect(found.find((i) => i.id === "conflicting-deposit")).toBeUndefined();
  });

  it("does not treat an escalation as a conflicting amount", () => {
    const found = inconsistencies(
      "1. RENT\nThe monthly rent is Rs. 20,000.\n\n2. ESCALATION\nThe rent shall increase to Rs. 21,000 after eleven months.",
    );
    expect(found.find((i) => i.id === "conflicting-rent")).toBeUndefined();
  });

  it("flags two different places named for disputes", () => {
    const found = inconsistencies(
      "1. JURISDICTION\nThe courts at Mumbai shall have exclusive jurisdiction.\n\n2. DISPUTES\nAny claim shall be heard only by the courts of Delhi.",
    );
    const hit = found.find((i) => i.id === "multiple-jurisdictions");
    expect(hit).toBeDefined();
    expect(hit!.explanation).toMatch(/Mumbai/);
    expect(hit!.explanation).toMatch(/Delhi/);
  });

  it("flags a cross-reference to a clause that does not exist", () => {
    const found = inconsistencies(
      "1. TERM\nThis agreement runs for one year.\n\n2. FEES\nFees are payable as set out in Clause 9.\n\n3. LAW\nIndian law applies.",
    );
    const hit = found.find((i) => i.kind === "missing-reference");
    expect(hit).toBeDefined();
    expect(hit!.title).toMatch(/Clause 9/);
  });

  it("does not flag a cross-reference that resolves", () => {
    const found = inconsistencies(
      "1. TERM\nThis agreement runs for one year.\n\n2. FEES\nFees are payable as set out in Clause 3.\n\n3. SCHEDULE\nFees are Rs. 10,000 per month.",
    );
    expect(found.filter((i) => i.kind === "missing-reference")).toHaveLength(0);
  });

  it("quotes only text that is really in the cited clause", () => {
    const analysis = analyzeDocument(
      PREAMBLE +
        "1. TERMINATION\nEither party may terminate by giving thirty (30) days written notice.\n\n2. EXIT\nThe Consultant may terminate by giving ninety (90) days notice.",
    );
    for (const inc of analysis.inconsistencies) {
      for (const ev of inc.evidence) {
        const clause = analysis.clauses.find((c) => c.id === ev.clauseId);
        expect(clause).toBeDefined();
        expect(clause!.text).toContain(ev.quote.replace(/…$/, ""));
      }
    }
  });

  it("raises no false alarms on any of the bundled sample documents", () => {
    for (const sample of SAMPLES) {
      expect(analyzeDocument(sample.text).inconsistencies, sample.id).toEqual([]);
    }
  });
});
