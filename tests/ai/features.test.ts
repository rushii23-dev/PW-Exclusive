import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { gemini } from "./mock-gemini";

import { aiAnswer, engineAnswer } from "@/lib/ai/answer";
import { generateAiBrief } from "@/lib/ai/brief";
import { generateCompareVerdict } from "@/lib/ai/compare";
import { aiContradictions } from "@/lib/ai/contradictions";
import { explainClause } from "@/lib/ai/explain";
import { resetGeminiClient } from "@/lib/ai/gemini";
import { aiSituationGuide, engineSituationGuide } from "@/lib/ai/options";
import { analyzeDocument, compare } from "@/lib/engine";
import { EMPLOYMENT_CONTRACT, RENTAL_AGREEMENT } from "@/lib/samples";

const rental = analyzeDocument(RENTAL_AGREEMENT);
const term = rental.clauses.find((c) => /renewed automatically/i.test(c.text))!;
const deposit = rental.clauses.find((c) => /security deposit/i.test(c.text))!;
const QUOTE = "shall be deemed renewed automatically";

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  resetGeminiClient();
  gemini.reset();
});

afterAll(() => {
  delete process.env.GEMINI_API_KEY;
  resetGeminiClient();
});

describe("every prompt", () => {
  it("treats the document as untrusted data and asks for the reader's language", async () => {
    gemini.reply({ answerable: true, answer: "Yes.", citations: [{ clauseId: term.id, quote: QUOTE }] });
    await aiAnswer(rental, "Does it renew?", "hi");
    const req = gemini.requests[0];
    expect(req.config.systemInstruction).toMatch(/untrusted data/i);
    expect(req.config.systemInstruction).toMatch(/Hindi/);
    expect(req.config.systemInstruction).toMatch(/not legal advice/i);
    expect(req.config.responseMimeType).toBe("application/json");
    expect(req.contents).toContain(`<clause id="${term.id}"`);
  });
});

describe("aiAnswer", () => {
  it("returns a grounded answer with verified citations", async () => {
    gemini.reply({
      answerable: true,
      answer: "Yes — it renews by itself unless you give notice 60 days before the end.",
      citations: [{ clauseId: term.id, quote: QUOTE }],
      followUps: ["How do I give notice?"],
    });
    const answer = await aiAnswer(rental, "Does the lease renew by itself?", "en");
    expect(answer?.source).toBe("ai");
    expect(answer?.found).toBe(true);
    expect(answer?.citations[0].clauseId).toBe(term.id);
    expect(answer?.followUps).toEqual(["How do I give notice?"]);
  });

  it("refuses an answer whose only citation is invented", async () => {
    gemini.reply({
      answerable: true,
      answer: "You can leave any time for free.",
      citations: [{ clauseId: term.id, quote: "the tenant may leave at any time without penalty" }],
    });
    expect(await aiAnswer(rental, "Can I leave?", "en")).toBeNull();
  });

  it("passes on an honest 'the document doesn't say'", async () => {
    gemini.reply({ answerable: false, answer: "The document does not mention pets.", citations: [] });
    const answer = await aiAnswer(rental, "Can I keep a cat?", "en");
    expect(answer?.found).toBe(false);
    expect(answer?.citations).toEqual([]);
  });

  it("returns null when the API fails, so the engine can answer", async () => {
    gemini.reply(new Error("503 overloaded"));
    expect(await aiAnswer(rental, "Does it renew?", "en")).toBeNull();
    expect(engineAnswer(rental, "Does the lease renew automatically?").source).toBe("engine");
  });

  it("returns null on malformed JSON", async () => {
    gemini.reply("{not json");
    expect(await aiAnswer(rental, "Does it renew?", "en")).toBeNull();
  });

  it("returns null without calling the model when no key is set", async () => {
    delete process.env.GEMINI_API_KEY;
    expect(await aiAnswer(rental, "Does it renew?", "en")).toBeNull();
    expect(gemini.requests).toHaveLength(0);
  });
});

describe("explainClause", () => {
  it("explains a clause and keeps an empty fairer wording as null", async () => {
    gemini.reply({
      plainMeaning: "The lease renews by itself.",
      whatItMeansForYou: "If you forget to give notice, you are locked in for another 11 months.",
      watchOutFor: ["60-day notice window"],
      questionsToAsk: ["Can renewal need both sides to agree?"],
      fairerWording: "",
    });
    const e = await explainClause(rental, term, "en");
    expect(e?.clauseId).toBe(term.id);
    expect(e?.fairerWording).toBeNull();
    // Only the one clause goes to the model.
    expect(gemini.requests[0].contents).toContain(term.id);
    expect(gemini.requests[0].contents).not.toContain(`<clause id="${deposit.id}"`);
  });
});

describe("aiSituationGuide", () => {
  it("keeps only options backed by a verified quote", async () => {
    gemini.reply({
      covered: true,
      summary: "You can leave, but it costs you.",
      options: [
        {
          title: "Give notice",
          whatHappens: "Tell the landlord in writing.",
          costsAndRisks: "You must give notice in time.",
          citations: [{ clauseId: term.id, quote: QUOTE }],
        },
        {
          title: "Walk away",
          whatHappens: "Just leave.",
          costsAndRisks: "None.",
          citations: [{ clauseId: term.id, quote: "you may walk away freely" }],
        },
      ],
      nextSteps: ["Write to the landlord."],
      questionsForProfessional: ["Is the lock-in enforceable?"],
      urgency: "soon",
    });
    const guide = await aiSituationGuide(rental, "I need to move out in two months", "en");
    expect(guide?.options.map((o) => o.title)).toEqual(["Give notice"]);
    expect(guide?.urgency).toBe("soon");
  });

  it("gives up (for the engine fallback) if no option survives verification", async () => {
    gemini.reply({
      covered: true,
      summary: "x",
      options: [
        { title: "Invented", whatHappens: "x", costsAndRisks: "x", citations: [{ clauseId: term.id, quote: "made up text here" }] },
      ],
      nextSteps: [],
      questionsForProfessional: [],
      urgency: "unknown",
    });
    expect(await aiSituationGuide(rental, "I need to move out early", "en")).toBeNull();
  });

  it("engine fallback points at the relevant clauses", () => {
    const guide = engineSituationGuide(rental, "I want to terminate the lease and leave early");
    expect(guide.source).toBe("engine");
    expect(guide.covered).toBe(true);
    expect(guide.options.length).toBeGreaterThan(0);
  });

  it("engine fallback is honest when nothing matches", () => {
    const guide = engineSituationGuide(rental, "zzqx blorf wibble");
    expect(guide.covered).toBe(false);
    expect(guide.nextSteps.length).toBeGreaterThan(0);
  });
});

describe("aiContradictions", () => {
  it("keeps a contradiction only if both sides are verified quotes from different clauses", async () => {
    gemini.reply({
      items: [
        {
          title: "Real",
          explanation: "These conflict.",
          evidence: [
            { clauseId: term.id, quote: QUOTE },
            { clauseId: deposit.id, quote: deposit.text.slice(0, 40) },
          ],
        },
        {
          title: "One-sided",
          explanation: "Same clause twice.",
          evidence: [
            { clauseId: term.id, quote: QUOTE },
            { clauseId: term.id, quote: QUOTE },
          ],
        },
        {
          title: "Invented",
          explanation: "Made up.",
          evidence: [
            { clauseId: term.id, quote: "no such words anywhere" },
            { clauseId: deposit.id, quote: "nor these ones either" },
          ],
        },
      ],
    });
    const found = await aiContradictions(rental, "en");
    expect(found.map((f) => f.title)).toEqual(["Real"]);
    expect(found[0].source).toBe("ai");
    expect(found[0].kind).toBe("contradiction");
  });

  it("returns an empty list when the model fails", async () => {
    gemini.reply(new Error("timeout"));
    expect(await aiContradictions(rental, "en")).toEqual([]);
  });
});

describe("generateAiBrief", () => {
  it("drops concerns that do not point at a real finding", async () => {
    gemini.reply({
      headline: "An 11-month lease that renews itself.",
      paragraphs: ["This lease…", "Remember: information, not legal advice."],
      topConcerns: [
        { findingIndex: 0, title: "Real", detail: "x" },
        { findingIndex: 999, title: "Invented", detail: "x" },
      ],
      beforeYouSign: ["Diarise the notice date."],
    });
    const brief = await generateAiBrief(rental, "en");
    expect(brief?.topConcerns.map((c) => c.title)).toEqual(["Real"]);
    expect(brief?.model).toBeTruthy();
    // The model sees findings, not the raw document.
    expect(gemini.requests[0].contents).not.toContain(RENTAL_AGREEMENT.slice(0, 200));
  });
});

describe("generateCompareVerdict", () => {
  it("returns a verdict built from the structured comparison", async () => {
    const employment = analyzeDocument(EMPLOYMENT_CONTRACT);
    gemini.reply({
      overview: "Different documents with different risks.",
      betterInA: ["Clearer notice terms"],
      betterInB: [],
      watchOut: ["Both lack an exit clause"],
      questionsToAsk: ["Which applies?"],
    });
    const verdict = await generateCompareVerdict(rental, employment, compare(rental, employment), "en");
    expect(verdict?.overview).toMatch(/Different/);
    expect(verdict?.betterInA).toEqual(["Clearer notice terms"]);
  });
});
