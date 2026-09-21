import { describe, expect, it } from "vitest";

import {
  analyzeDocument,
  DocumentTooLargeError,
  DocumentTooSmallError,
  MAX_DOCUMENT_CHARS,
} from "@/lib/engine/analyze";
import { toPlainText } from "@/lib/engine/checklist";
import {
  EMPLOYMENT_CONTRACT,
  FREELANCE_AGREEMENT,
  NDA,
  RENTAL_AGREEMENT,
  SAMPLES,
  SUBSCRIPTION_TOS,
} from "@/lib/samples";

describe("analyzeDocument — input bounds", () => {
  it("rejects text that is too short to be a document", () => {
    expect(() => analyzeDocument("hello")).toThrow(DocumentTooSmallError);
  });

  it("rejects text over the size cap", () => {
    expect(() => analyzeDocument("a ".repeat(MAX_DOCUMENT_CHARS))).toThrow(
      DocumentTooLargeError,
    );
  });
});

describe("analyzeDocument — determinism", () => {
  it("same input, same output", () => {
    const a = analyzeDocument(RENTAL_AGREEMENT);
    const b = analyzeDocument(RENTAL_AGREEMENT);
    expect(a).toEqual(b);
  });
});

describe("analyzeDocument — rental agreement", () => {
  const analysis = analyzeDocument(RENTAL_AGREEMENT);

  it("detects the document type", () => {
    expect(analysis.documentType).toBe("rental-agreement");
  });

  it("flags the planted traps", () => {
    const rules = analysis.findings.map((f) => f.ruleId);
    expect(rules).toContain("auto-renewal");
    expect(rules).toContain("lock-in");
    expect(rules).toContain("entry-without-notice");
    expect(rules).toContain("tenant-repairs");
    expect(rules).toContain("unilateral-termination");
  });

  it("counts high-risk clauses in the risk profile", () => {
    expect(analysis.riskProfile.high).toBeGreaterThanOrEqual(3);
    expect(analysis.riskProfile.overall).toBe("high");
  });

  it("extracts the key amounts", () => {
    const money = analysis.keyFacts.filter((f) => f.kind === "money").map((f) => f.text);
    expect(money).toContain("Rs. 32,000");
    expect(money).toContain("Rs. 3,20,000");
  });

  it("finds obligations on the tenant's side", () => {
    expect(analysis.yourObligations.length).toBeGreaterThan(0);
    expect(
      analysis.yourObligations.some((o) => /rent/i.test(o.text)),
    ).toBe(true);
  });

  it("derives a checklist that references its findings", () => {
    expect(analysis.checklist.length).toBeGreaterThan(3);
    for (const item of analysis.checklist) {
      expect(item.because.length).toBeGreaterThan(0);
    }
  });

  it("produces lawyer questions", () => {
    expect(analysis.lawyerQuestions.length).toBeGreaterThan(2);
  });

  it("summary mentions the type and the high-risk count", () => {
    const text = analysis.summary.join(" ");
    expect(text).toMatch(/rental agreement/i);
    expect(text).toMatch(/attention before signing/);
  });
});

describe("analyzeDocument — employment contract", () => {
  const analysis = analyzeDocument(EMPLOYMENT_CONTRACT);

  it("detects the type and the planted traps", () => {
    expect(analysis.documentType).toBe("employment-contract");
    const rules = analysis.findings.map((f) => f.ruleId);
    expect(rules).toContain("non-compete");
    expect(rules).toContain("salary-deduction");
    expect(rules).toContain("binding-arbitration");
    expect(rules).toContain("ip-assignment");
    expect(rules).toContain("class-action-waiver");
  });
});

describe("analyzeDocument — the fair NDA stays calm", () => {
  const analysis = analyzeDocument(NDA);

  it("detects the type", () => {
    expect(analysis.documentType).toBe("nda");
  });

  it("does not cry wolf: no high-risk findings on a reasonable document", () => {
    expect(analysis.findings.filter((f) => f.level === "high")).toHaveLength(0);
  });
});

describe("analyzeDocument — subscription terms", () => {
  const analysis = analyzeDocument(SUBSCRIPTION_TOS);

  it("detects the type and consumer traps", () => {
    expect(analysis.documentType).toBe("terms-of-service");
    const rules = analysis.findings.map((f) => f.ruleId);
    expect(rules).toContain("auto-renewal");
    expect(rules).toContain("non-refundable");
    expect(rules).toContain("unilateral-modification");
    expect(rules).toContain("license-to-content");
    expect(rules).toContain("data-sharing");
  });
});

describe("analyzeDocument — freelance agreement", () => {
  const analysis = analyzeDocument(FREELANCE_AGREEMENT);

  it("detects the type and payment-condition trap", () => {
    expect(analysis.documentType).toBe("service-agreement");
    const rules = analysis.findings.map((f) => f.ruleId);
    expect(rules).toContain("unpaid-work");
    expect(rules).toContain("one-way-indemnity");
    expect(rules).toContain("jury-waiver");
  });
});

describe("analyzeDocument — every sample end to end", () => {
  it.each(SAMPLES.map((s) => [s.id, s.text] as const))(
    "sample %s produces a complete analysis",
    (_id, text) => {
      const analysis = analyzeDocument(text);
      expect(analysis.clauses.length).toBeGreaterThan(3);
      expect(analysis.summary.length).toBeGreaterThan(1);
      expect(analysis.readability.fleschScore).toBeGreaterThanOrEqual(0);
      expect(analysis.readability.fleschScore).toBeLessThanOrEqual(100);
      expect(analysis.glossary.length).toBeGreaterThan(0);
      // Every finding must carry evidence that really is in the document.
      for (const clause of analysis.clauses) {
        for (const finding of clause.findings) {
          expect(finding.evidence.length).toBeGreaterThan(0);
        }
      }
    },
  );
});

describe("toPlainText export", () => {
  it("includes contradictions with both quoted sides", () => {
    const analysis = analyzeDocument(
      "LEASE\n\n1. DEPOSIT\nThe Tenant shall pay a security deposit of Rs. 50,000.\n\n2. REFUND\nThe security deposit of Rs. 60,000 shall be refunded within thirty days.",
    );
    const text = toPlainText(analysis);
    expect(text).toContain("WHERE THE DOCUMENT CONTRADICTS ITSELF");
    expect(text).toContain("Rs. 50,000");
    expect(text).toContain("Rs. 60,000");
  });

  it("leaves the section out when there is nothing to report", () => {
    expect(toPlainText(analyzeDocument(RENTAL_AGREEMENT))).not.toContain("CONTRADICTS ITSELF");
  });
});
