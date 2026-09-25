import { describe, expect, it } from "vitest";

import {
  analyzeClause,
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
  PG_LICENCE,
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

describe("obligations on both sides", () => {
  it("lists what the other side must do, separately from the reader's duties", () => {
    const a = analyzeDocument(FREELANCE_AGREEMENT);
    expect(a.theirObligations.some((o) => /Client shall pay the Contractor/.test(o.text))).toBe(true);
    expect(a.yourObligations.some((o) => /Client shall pay/.test(o.text))).toBe(false);
    expect(a.yourObligations.length).toBeGreaterThan(0);
  });

  it("puts both sides' duties and the key facts in the text export", () => {
    const text = toPlainText(analyzeDocument(FREELANCE_AGREEMENT));
    expect(text).toContain("WHAT THE DOCUMENT REQUIRES OF YOU");
    expect(text).toContain("WHAT THE OTHER SIDE MUST DO");
    expect(text).toContain("KEY AMOUNTS, DATES AND PERIODS");
    expect(text).toContain("USD 4,000");
  });
});

describe("analyzeClause", () => {
  it("reads every clause of every sample exactly as the full analysis does", () => {
    for (const sample of SAMPLES) {
      const full = analyzeDocument(sample.text);
      for (const clause of full.clauses) {
        expect(analyzeClause(sample.text, clause.id)).toEqual({
          documentTypeLabel: full.documentTypeLabel,
          clause,
        });
      }
    }
  });

  it("returns null for a clause the document doesn't have", () => {
    const count = analyzeDocument(RENTAL_AGREEMENT).clauses.length;
    for (const id of ["clause-0", `clause-${count + 1}`, "clause-999", "clause-", "nope"]) {
      expect(analyzeClause(RENTAL_AGREEMENT, id)).toBeNull();
    }
  });

  it("enforces the same bounds as a full analysis", () => {
    expect(() => analyzeClause("hello", "clause-1")).toThrow(DocumentTooSmallError);
    expect(() => analyzeClause("a ".repeat(MAX_DOCUMENT_CHARS), "clause-1")).toThrow(DocumentTooLargeError);
  });
});

describe("performance", () => {
  /** Real clauses, renumbered and repeated to the size cap. */
  function maximumSizeDocument(): string {
    let big = "";
    let n = 0;
    const all = [RENTAL_AGREEMENT, FREELANCE_AGREEMENT].join("\n\n");
    while (big.length < MAX_DOCUMENT_CHARS - 5000) big += `${all.replace(/^(\d+)\./gm, () => `${++n}.`)}\n\n`;
    return big.slice(0, MAX_DOCUMENT_CHARS);
  }

  it("analyses a maximum-size document well inside an interactive budget", () => {
    const big = maximumSizeDocument();
    const started = performance.now();
    const a = analyzeDocument(big);
    const elapsed = performance.now() - started;
    expect(a.clauses.length).toBeGreaterThan(300);
    // ~150 ms on a laptop; the budget leaves room for slow CI machines.
    expect(elapsed).toBeLessThan(2500);
  });

  it("reads one clause of a maximum-size document without analysing the rest", () => {
    const big = maximumSizeDocument();
    const started = performance.now();
    const one = analyzeClause(big, "clause-200");
    const elapsed = performance.now() - started;
    expect(one?.clause.id).toBe("clause-200");
    // ~15 ms on a laptop — segmenting the document is most of it.
    expect(elapsed).toBeLessThan(500);
  });
});

describe("paying-guest and leave-and-licence documents", () => {
  it("are read as rentals, so the guest's duties are the reader's", () => {
    const a = analyzeDocument(PG_LICENCE);
    expect(a.documentType).toBe("rental-agreement");
    expect(a.yourObligations.some((o) => /Guest shall pay a monthly fee/.test(o.text))).toBe(true);
  });

  it("do not pull software licences in with them", () => {
    const eula = `SOFTWARE LICENCE AGREEMENT

1. GRANT
The Licensor grants the Licensee a non-exclusive licence to use the software on one device.

2. FEES
The Licensee shall pay the licence fee of USD 99 per year to the Licensor.

3. TERMINATION
The Licensor may terminate this licence if the Licensee breaches it.`;
    expect(analyzeDocument(eula).documentType).not.toBe("rental-agreement");
  });
});
