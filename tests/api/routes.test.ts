import { beforeEach, describe, expect, it } from "vitest";

import { POST as analyzePost } from "@/app/api/analyze/route";
import { POST as askPost } from "@/app/api/ask/route";
import { POST as comparePost } from "@/app/api/compare/route";
import { GET as healthGet } from "@/app/api/health/route";
import { resetRateLimits } from "@/lib/server/rate-limit";
import { NDA, RENTAL_AGREEMENT } from "@/lib/samples";

function post(url: string, body: unknown, ip = "203.0.113.7"): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => resetRateLimits());

describe("GET /api/health", () => {
  it("reports ok and never leaks key material", async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(JSON.stringify(json)).not.toMatch(/sk-/);
  });
});

describe("POST /api/analyze", () => {
  it("analyses a document", async () => {
    const res = await analyzePost(post("/api/analyze", { text: RENTAL_AGREEMENT }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.analysis.documentType).toBe("rental-agreement");
    expect(json.analysis.clauses.length).toBeGreaterThan(5);
    expect(json.ai.available).toBe(false); // no key in the test environment
    expect(json.ai.brief).toBeNull();
  });

  it("rejects a missing text field with 422", async () => {
    const res = await analyzePost(post("/api/analyze", { nope: true }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("validation_failed");
  });

  it("rejects non-JSON bodies with 400", async () => {
    const res = await analyzePost(post("/api/analyze", "not json {"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_json");
  });

  it("rejects too-short documents with 422 and a helpful message", async () => {
    const res = await analyzePost(post("/api/analyze", { text: "too short" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("invalid_document");
    expect(json.error.message).toMatch(/too short/i);
  });

  it("rejects oversized bodies with 413", async () => {
    const res = await analyzePost(
      post("/api/analyze", { text: "a".repeat(700_000) }),
    );
    expect(res.status).toBe(413);
  });

  it("rate limits after 20 requests per minute per client", async () => {
    let lastStatus = 200;
    for (let i = 0; i < 21; i++) {
      const res = await analyzePost(
        post("/api/analyze", { text: NDA }, "198.51.100.9"),
      );
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("keeps rate limits per client — another IP is unaffected", async () => {
    for (let i = 0; i < 21; i++) {
      await analyzePost(post("/api/analyze", { text: NDA }, "198.51.100.9"));
    }
    const other = await analyzePost(post("/api/analyze", { text: NDA }, "198.51.100.10"));
    expect(other.status).toBe(200);
  });
});

describe("POST /api/compare", () => {
  it("compares two documents", async () => {
    const res = await comparePost(
      post("/api/compare", { textA: RENTAL_AGREEMENT, textB: NDA }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.a.documentType).toBe("rental-agreement");
    expect(json.b.documentType).toBe("nda");
    expect(json.comparison.verdicts.length).toBeGreaterThan(0);
  });

  it("validates both documents", async () => {
    const res = await comparePost(post("/api/compare", { textA: RENTAL_AGREEMENT }));
    expect(res.status).toBe(422);
  });
});

describe("POST /api/ask", () => {
  it("answers a question with citations", async () => {
    const res = await askPost(
      post("/api/ask", { text: RENTAL_AGREEMENT, question: "How much is the deposit?" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.answer.found).toBe(true);
    expect(json.answer.citations.length).toBeGreaterThan(0);
  });

  it("rejects an overlong question", async () => {
    const res = await askPost(
      post("/api/ask", { text: RENTAL_AGREEMENT, question: "why? ".repeat(200) }),
    );
    expect(res.status).toBe(422);
  });
});
