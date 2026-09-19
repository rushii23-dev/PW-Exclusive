import { describe, expect, it } from "vitest";

import { analyzeDocument } from "@/lib/engine/analyze";
import { answerQuestion, ClauseIndex } from "@/lib/engine/retrieve";
import { EMPLOYMENT_CONTRACT, RENTAL_AGREEMENT } from "@/lib/samples";

function makeIndex(text: string) {
  const analysis = analyzeDocument(text);
  return { analysis, index: new ClauseIndex(analysis.clauses) };
}

describe("document Q&A", () => {
  it("maps colloquial 'quit' onto the termination clause", () => {
    const { index } = makeIndex(EMPLOYMENT_CONTRACT);
    const answer = answerQuestion(index, "What happens if I want to quit my job?");
    expect(answer.found).toBe(true);
    expect(answer.response.toLowerCase()).toMatch(/notice|terminat/);
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it("answers deposit questions from the deposit clause with an exact quote", () => {
    const { analysis, index } = makeIndex(RENTAL_AGREEMENT);
    const answer = answerQuestion(index, "When do I get my security deposit back?");
    expect(answer.found).toBe(true);
    const cited = analysis.clauses.find((c) => c.id === answer.citations[0].clauseId);
    expect(cited).toBeDefined();
    // The quote must be a real excerpt of the cited clause, ellipsis aside.
    const quote = answer.citations[0].quote.replace(/…$/, "");
    expect(cited!.text).toContain(quote);
  });

  it("surfaces the risk flag when the answering clause is flagged", () => {
    const { index } = makeIndex(RENTAL_AGREEMENT);
    const answer = answerQuestion(index, "Can the landlord enter my flat?");
    expect(answer.found).toBe(true);
    expect(answer.response).toContain("flagged");
  });

  it("refuses to answer questions the document does not address", () => {
    const { index } = makeIndex(RENTAL_AGREEMENT);
    const answer = answerQuestion(index, "What is the airspeed velocity of an unladen swallow?");
    expect(answer.found).toBe(false);
    expect(answer.citations).toHaveLength(0);
    expect(answer.response).toMatch(/does not appear to address/);
  });

  it("refuses on an empty question", () => {
    const { index } = makeIndex(RENTAL_AGREEMENT);
    expect(answerQuestion(index, "").found).toBe(false);
    expect(answerQuestion(index, "the of and").found).toBe(false);
  });

  it("ranks the on-topic clause above off-topic clauses", () => {
    const { analysis, index } = makeIndex(RENTAL_AGREEMENT);
    const hits = index.search("rent increase each year", 3);
    expect(hits.length).toBeGreaterThan(0);
    const top = analysis.clauses.find((c) => c.id === hits[0].clause.id);
    expect(top!.heading).toMatch(/rent/i);
  });
});
