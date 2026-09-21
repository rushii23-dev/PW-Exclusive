import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { gemini } from "../ai/mock-gemini";

import { POST as analyzePost } from "@/app/api/analyze/route";
import { POST as askPost } from "@/app/api/ask/route";
import { POST as comparePost } from "@/app/api/compare/route";
import { POST as explainPost } from "@/app/api/explain/route";
import { GET as healthGet } from "@/app/api/health/route";
import { POST as optionsPost } from "@/app/api/options/route";
import { resetGeminiClient } from "@/lib/ai/gemini";
import { analyzeDocument } from "@/lib/engine";
import { EMPLOYMENT_CONTRACT, RENTAL_AGREEMENT } from "@/lib/samples";
import { resetRateLimits } from "@/lib/server/rate-limit";

const rental = analyzeDocument(RENTAL_AGREEMENT);
const term = rental.clauses.find((c) => /renewed automatically/i.test(c.text))!;
const QUOTE = "shall be deemed renewed automatically";

function post(url: string, body: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.4" },
    body: JSON.stringify(body),
  });
}

function withKey() {
  process.env.GEMINI_API_KEY = "test-key";
  resetGeminiClient();
}

beforeEach(() => {
  resetRateLimits();
  gemini.reset();
  delete process.env.GEMINI_API_KEY;
  resetGeminiClient();
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  resetGeminiClient();
});

describe("GET /api/health", () => {
  it("reports Gemini as not configured without a key", async () => {
    const json = await (await healthGet()).json();
    expect(json.ai).toEqual({ provider: "gemini", configured: false, model: null });
  });

  it("reports the model, never the key, when configured", async () => {
    withKey();
    const json = await (await healthGet()).json();
    expect(json.ai.configured).toBe(true);
    expect(json.ai.model).toBeTruthy();
    expect(JSON.stringify(json)).not.toContain("test-key");
  });
});

describe("POST /api/analyze with Gemini", () => {
  it("adds a brief and verified contradictions alongside the engine analysis", async () => {
    withKey();
    // Brief and contradictions run in parallel; route each reply by its prompt.
    const brief = {
      headline: "A lease that renews itself.",
      paragraphs: ["Summary.", "Information, not legal advice."],
      topConcerns: [],
      beforeYouSign: ["Diarise the notice date."],
    };
    const { generateContent } = await import("../ai/mock-gemini");
    generateContent.mockImplementation(async (req) => {
      gemini.requests.push(req);
      const isBrief = String(req.config.systemInstruction).includes("brief");
      return { text: JSON.stringify(isBrief ? brief : { items: [] }), candidates: [] };
    });

    const res = await analyzePost(post("/api/analyze", { text: RENTAL_AGREEMENT, language: "hi" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ai.used).toBe(true);
    expect(json.ai.brief.headline).toBe("A lease that renews itself.");
    expect(json.ai.contradictionsChecked).toBe(true);
    expect(json.analysis.clauses.length).toBeGreaterThan(5);
    expect(gemini.requests).toHaveLength(2);
    generateContent.mockReset();
  });

  it("still returns the engine analysis when Gemini fails", async () => {
    withKey();
    const { generateContent } = await import("../ai/mock-gemini");
    generateContent.mockImplementation(async () => {
      throw new Error("quota exceeded");
    });
    const res = await analyzePost(post("/api/analyze", { text: RENTAL_AGREEMENT }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ai.brief).toBeNull();
    expect(json.ai.contradictionsChecked).toBe(false);
    expect(json.analysis.findings.length).toBeGreaterThan(0);
    generateContent.mockReset();
  });

  it("rejects an unsupported language with 422", async () => {
    const res = await analyzePost(post("/api/analyze", { text: RENTAL_AGREEMENT, language: "xx" }));
    expect(res.status).toBe(422);
  });
});

describe("POST /api/ask", () => {
  it("uses Gemini's grounded answer when it verifies", async () => {
    withKey();
    const { generateContent } = await import("../ai/mock-gemini");
    generateContent.mockImplementation(async () => ({
      text: JSON.stringify({
        answerable: true,
        answer: "Yes, it renews automatically.",
        citations: [{ clauseId: term.id, quote: QUOTE }],
      }),
      candidates: [],
    }));
    const json = await (await askPost(post("/api/ask", { text: RENTAL_AGREEMENT, question: "Does it renew?" }))).json();
    expect(json.answer.source).toBe("ai");
    expect(json.answer.citations[0].clauseId).toBe(term.id);
    generateContent.mockReset();
  });

  it("falls back to the engine when Gemini's citation is invented", async () => {
    withKey();
    const { generateContent } = await import("../ai/mock-gemini");
    generateContent.mockImplementation(async () => ({
      text: JSON.stringify({
        answerable: true,
        answer: "You can leave for free.",
        citations: [{ clauseId: term.id, quote: "leave for free whenever you like" }],
      }),
      candidates: [],
    }));
    const json = await (
      await askPost(post("/api/ask", { text: RENTAL_AGREEMENT, question: "Does the lease renew automatically?" }))
    ).json();
    expect(json.answer.source).toBe("engine");
    expect(json.answer.response).not.toMatch(/for free/);
    generateContent.mockReset();
  });

  it("answers from the engine with no key configured", async () => {
    const json = await (
      await askPost(post("/api/ask", { text: RENTAL_AGREEMENT, question: "How much is the security deposit?" }))
    ).json();
    expect(json.answer.source).toBe("engine");
  });
});

describe("POST /api/explain", () => {
  it("reports 503 when Gemini is not configured", async () => {
    const res = await explainPost(post("/api/explain", { text: RENTAL_AGREEMENT, clauseId: term.id }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("ai_unavailable");
  });

  it("returns 404 for a clause that is not in the document", async () => {
    withKey();
    const res = await explainPost(post("/api/explain", { text: RENTAL_AGREEMENT, clauseId: "clause-999" }));
    expect(res.status).toBe(404);
  });

  it("rejects a malformed clause id with 422", async () => {
    const res = await explainPost(post("/api/explain", { text: RENTAL_AGREEMENT, clauseId: "../etc" }));
    expect(res.status).toBe(422);
  });

  it("returns the explanation from Gemini", async () => {
    withKey();
    const { generateContent } = await import("../ai/mock-gemini");
    generateContent.mockImplementation(async () => ({
      text: JSON.stringify({
        plainMeaning: "It renews itself.",
        whatItMeansForYou: "You could be locked in.",
        watchOutFor: [],
        questionsToAsk: ["Can we remove auto-renewal?"],
        fairerWording: "The lease may be renewed by mutual written agreement.",
      }),
      candidates: [],
    }));
    const res = await explainPost(post("/api/explain", { text: RENTAL_AGREEMENT, clauseId: term.id }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.explanation.fairerWording).toMatch(/mutual/);
    generateContent.mockReset();
  });

  it("reports 502 when Gemini fails, instead of an empty explanation", async () => {
    withKey();
    const { generateContent } = await import("../ai/mock-gemini");
    generateContent.mockImplementation(async () => {
      throw new Error("down");
    });
    const res = await explainPost(post("/api/explain", { text: RENTAL_AGREEMENT, clauseId: term.id }));
    expect(res.status).toBe(502);
    generateContent.mockReset();
  });
});

describe("POST /api/options", () => {
  it("falls back to the engine guide with no key", async () => {
    const res = await optionsPost(
      post("/api/options", { text: RENTAL_AGREEMENT, situation: "I want to terminate and leave early" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.guide.source).toBe("engine");
    expect(json.guide.options.length).toBeGreaterThan(0);
  });

  it("rejects a situation that is too short", async () => {
    const res = await optionsPost(post("/api/options", { text: RENTAL_AGREEMENT, situation: "hi" }));
    expect(res.status).toBe(422);
  });
});

describe("POST /api/compare with Gemini", () => {
  it("adds a plain-language verdict", async () => {
    withKey();
    const { generateContent } = await import("../ai/mock-gemini");
    generateContent.mockImplementation(async () => ({
      text: JSON.stringify({
        overview: "A trade-off.",
        betterInA: ["x"],
        betterInB: ["y"],
        watchOut: [],
        questionsToAsk: [],
      }),
      candidates: [],
    }));
    const res = await comparePost(post("/api/compare", { textA: RENTAL_AGREEMENT, textB: EMPLOYMENT_CONTRACT }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ai.verdict.overview).toBe("A trade-off.");
    expect(json.comparison.categories.length).toBeGreaterThan(0);
    generateContent.mockReset();
  });
});
