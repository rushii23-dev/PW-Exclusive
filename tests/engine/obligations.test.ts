import { describe, expect, it } from "vitest";

import { extractObligations } from "@/lib/engine/obligations";

describe("extractObligations", () => {
  it("attributes tenant duties to 'you'", () => {
    const out = extractObligations("The Tenant shall pay rent of Rs. 32,000 per month.");
    expect(out).toHaveLength(1);
    expect(out[0].party).toBe("you");
  });

  it("attributes landlord duties to the counterparty", () => {
    const out = extractObligations("The Landlord shall maintain the structure of the building.");
    expect(out).toHaveLength(1);
    expect(out[0].party).toBe("counterparty");
  });

  it("attributes joint duties to both", () => {
    const out = extractObligations("The Landlord and the Tenant shall jointly inspect the premises.");
    expect(out).toHaveLength(1);
    expect(out[0].party).toBe("both");
  });

  it("does not treat disclaimers as duties", () => {
    const out = extractObligations(
      "The Company shall not be liable for indirect damages. This clause shall survive termination. The term shall mean the period stated above.",
    );
    expect(out).toHaveLength(0);
  });

  it("recognises 'agrees to' and 'is responsible for' as duty verbs", () => {
    const out = extractObligations(
      "The Contractor agrees to deliver the work by the deadline. The Employee is responsible for maintaining confidentiality.",
    );
    expect(out).toHaveLength(2);
    expect(out.every((o) => o.party === "you")).toBe(true);
  });

  it("marks duties with no identifiable subject as unclear", () => {
    const out = extractObligations("All dues shall be settled before possession is handed over.");
    expect(out).toHaveLength(1);
    expect(out[0].party).toBe("unclear");
  });
});
