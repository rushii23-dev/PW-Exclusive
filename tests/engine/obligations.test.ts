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

describe("extractObligations — whose duty it is depends on the document", () => {
  it("reads a freelance contract from the contractor's side", () => {
    const [pay] = extractObligations("The Client shall pay the Contractor a fee of USD 4,000.", "service-agreement");
    expect(pay.party).toBe("counterparty");
    const [deliver] = extractObligations("The Contractor shall deliver the work by 1 May.", "service-agreement");
    expect(deliver.party).toBe("you");
  });

  it("reads terms of service from the user's side", () => {
    const [duty] = extractObligations("The User shall keep their password secret.", "terms-of-service");
    expect(duty.party).toBe("you");
  });

  it("keeps the generic reading for a contract of unknown kind", () => {
    const [duty] = extractObligations("The Client shall pay within 30 days.");
    expect(duty.party).toBe("you");
  });
});

describe("extractObligations — finding the subject", () => {
  it("does not mistake a party named after a preposition for the one bound", () => {
    const [duty] = extractObligations(
      "Upon full payment, the Contractor hereby assigns to the Client all rights and shall deliver the source files.",
      "service-agreement",
    );
    expect(duty.party).toBe("you");
  });

  it("finds the bound party after an opening conditional", () => {
    const [duty] = extractObligations(
      "If the Tenant defaults on rent, the Landlord shall give fifteen days written notice.",
      "rental-agreement",
    );
    expect(duty.party).toBe("counterparty");
  });

  it("only calls it joint when the parties are joined into one subject", () => {
    const [joint] = extractObligations("The Landlord and the Tenant shall sign the inventory.", "rental-agreement");
    expect(joint.party).toBe("both");
    const [single] = extractObligations(
      "If the Tenant is late or absent, the Landlord shall inspect the flat.",
      "rental-agreement",
    );
    expect(single.party).toBe("counterparty");
  });

  it("does not count the absence of a duty as a duty", () => {
    expect(extractObligations("The Client shall have no obligation to pay for rejected work.")).toHaveLength(0);
    expect(extractObligations("The Employee shall not be required to relocate.")).toHaveLength(0);
  });
});
