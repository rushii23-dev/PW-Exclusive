import { describe, expect, it } from "vitest";

import {
  isVerbatimQuote,
  knownClauseIds,
  normaliseForMatch,
  selectContext,
  verifyCitations,
} from "@/lib/ai/grounding";
import { analyzeDocument, ClauseIndex } from "@/lib/engine";
import { RENTAL_AGREEMENT } from "@/lib/samples";

const analysis = analyzeDocument(RENTAL_AGREEMENT);
const termClause = analysis.clauses.find((c) => /renewed automatically/i.test(c.text))!;

describe("grounding", () => {
  it("normalises curly quotes, dashes, whitespace and case", () => {
    expect(normaliseForMatch("The  “Tenant” — shall\nPAY")).toBe('the "tenant" - shall pay');
  });

  it("accepts a quote that is really in the clause, whatever its quote marks", () => {
    expect(isVerbatimQuote("shall be deemed renewed automatically", termClause)).toBe(true);
    expect(isVerbatimQuote("SHALL BE DEEMED   renewed automatically", termClause)).toBe(true);
  });

  it("rejects a quote the clause does not contain", () => {
    expect(isVerbatimQuote("the landlord shall refund the deposit immediately", termClause)).toBe(false);
  });

  it("rejects quotes too short to mean anything", () => {
    expect(isVerbatimQuote("the", termClause)).toBe(false);
  });

  it("keeps verified citations and drops fabricated ones and unknown clauses", () => {
    const verified = verifyCitations(
      [
        { clauseId: termClause.id, quote: "shall be deemed renewed automatically" },
        { clauseId: termClause.id, quote: "tenant may leave whenever they like" },
        { clauseId: "clause-999", quote: "shall be deemed renewed automatically" },
        { clauseId: termClause.id, quote: "shall be deemed renewed automatically" },
      ],
      analysis.clauses,
    );
    expect(verified).toHaveLength(1);
    expect(verified[0].clauseId).toBe(termClause.id);
  });

  it("filters clause ids to ones the document has", () => {
    expect(knownClauseIds(["clause-1", "clause-999", " clause-1 "], analysis.clauses)).toEqual(["clause-1"]);
  });

  it("sends small documents whole so questions in any wording can be answered", () => {
    const index = new ClauseIndex(analysis.clauses);
    const { clauses } = selectContext(analysis.clauses, index, "मैं जल्दी घर छोड़ना चाहता हूँ");
    expect(clauses).toHaveLength(analysis.clauses.length);
  });
});
