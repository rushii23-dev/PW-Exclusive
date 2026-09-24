import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { POST as analyzePost } from "@/app/api/analyze/route";
import { POST as comparePost } from "@/app/api/compare/route";
import { MAX_DOCUMENT_CHARS } from "@/lib/engine";
import { NDA, RENTAL_AGREEMENT } from "@/lib/samples";
import { bodyLimit, clientKey, guardRequest, parseBody } from "@/lib/server/http";
import {
  checkRateLimit,
  MAX_TRACKED_CLIENTS,
  resetRateLimits,
  trackedClientCount,
} from "@/lib/server/rate-limit";

function req(headers: Record<string, string>, body?: BodyInit): Request {
  return new Request("http://localhost/api/test", { method: "POST", headers, body });
}

beforeEach(() => resetRateLimits());
afterEach(() => {
  delete process.env.TRUSTED_PROXY_HOPS;
});

describe("clientKey", () => {
  it("uses the address the trusted proxy appended, not what the client claimed", () => {
    // A client sends a fake X-Forwarded-For; the proxy appends the real address.
    expect(clientKey(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.5" }))).toBe("203.0.113.5");
    expect(clientKey(req({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("counts back past extra trusted proxies when told how many there are", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(clientKey(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
  });

  it("ignores a nonsensical TRUSTED_PROXY_HOPS", () => {
    process.env.TRUSTED_PROXY_HOPS = "-3";
    expect(clientKey(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("falls back to X-Real-IP, then to a fixed local key", () => {
    expect(clientKey(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientKey(req({}))).toBe("local");
  });

  it("never keys on an unbounded string", () => {
    expect(clientKey(req({ "x-forwarded-for": "x".repeat(5000) })).length).toBeLessThanOrEqual(64);
  });
});

describe("rate limiting cannot be dodged by spoofing X-Forwarded-For", () => {
  it("still limits a client that invents a new first hop on every request", async () => {
    let last = 0;
    for (let i = 0; i < 21; i++) {
      const res = await analyzePost(
        new Request("http://localhost/api/analyze", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": `10.9.${i}.1, 198.51.100.77`,
          },
          body: JSON.stringify({ text: NDA }),
        }),
      );
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

describe("rate-limit table", () => {
  it("never tracks more clients than its ceiling, evicting the stalest first", () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_TRACKED_CLIENTS + 50; i++) checkRateLimit(`flood-${i}`, 5, now);
    expect(trackedClientCount()).toBeLessThanOrEqual(MAX_TRACKED_CLIENTS);
    // The newest client is still remembered and still limited.
    for (let i = 0; i < 4; i++) checkRateLimit(`flood-${MAX_TRACKED_CLIENTS + 49}`, 5, now);
    expect(checkRateLimit(`flood-${MAX_TRACKED_CLIENTS + 49}`, 5, now).allowed).toBe(false);
  });
});

describe("guardRequest", () => {
  it.each(["cross-site", "same-site"])("refuses a request another site made (%s)", async (site) => {
    const res = guardRequest(req({ "sec-fetch-site": site }), "t", 10);
    expect(res?.status).toBe(403);
    expect((await res!.json()).error.code).toBe("cross_site_request");
  });

  it.each([["same-origin"], ["none"], [undefined]])("lets through %s requests", (site) => {
    expect(guardRequest(req(site ? { "sec-fetch-site": site } : {}), "t", 10)).toBeNull();
  });

  it("sends Retry-After with a 429", () => {
    for (let i = 0; i < 2; i++) guardRequest(req({}), "t2", 2);
    const res = guardRequest(req({}), "t2", 2);
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("parseBody", () => {
  const schema = z.object({ text: z.string() });

  it("accepts JSON with a charset parameter", async () => {
    const out = await parseBody(req({ "content-type": "application/json; charset=utf-8" }, '{"text":"hi"}'), schema);
    expect(out.ok && out.data.text).toBe("hi");
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", ""])(
    "refuses a %s body with 415",
    async (type) => {
      const out = await parseBody(req(type ? { "content-type": type } : {}, '{"text":"hi"}'), schema);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.response.status).toBe(415);
    },
  );

  it("stops a streamed body at the byte cap even without a Content-Length", async () => {
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 64 * 1024;
        controller.enqueue(new TextEncoder().encode(" ".repeat(64 * 1024)));
      },
    });
    const out = await parseBody(
      new Request("http://localhost/x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: endless,
        duplex: "half",
      } as RequestInit),
      schema,
      { maxBytes: 256 * 1024 },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.response.status).toBe(413);
    expect(pulled).toBeLessThan(512 * 1024);
  });

  it("refuses a Content-Length over the cap without reading the body", async () => {
    const out = await parseBody(
      req({ "content-type": "application/json", "content-length": String(bodyLimit(1) + 1) }, "{}"),
      schema,
    );
    expect(!out.ok && out.response.status).toBe(413);
  });

  it("sizes the cap in bytes, so a full-length document in an Indic script still fits", async () => {
    // Devanagari takes three bytes per character in UTF-8.
    const text = "क".repeat(MAX_DOCUMENT_CHARS);
    const body = JSON.stringify({ text });
    expect(new TextEncoder().encode(body).length).toBeGreaterThan(MAX_DOCUMENT_CHARS * 2);
    const out = await parseBody(req({ "content-type": "application/json" }, body), schema);
    expect(out.ok).toBe(true);
  });

  it("gives two-document routes room for two documents", () => {
    expect(bodyLimit(2)).toBeGreaterThan(2 * MAX_DOCUMENT_CHARS * 3);
  });
});

describe("routes refuse bodies that are not JSON", () => {
  it("analyze returns 415 for a form post", async () => {
    const res = await analyzePost(
      req({ "content-type": "application/x-www-form-urlencoded" }, `text=${encodeURIComponent(RENTAL_AGREEMENT)}`),
    );
    expect(res.status).toBe(415);
  });

  it("compare accepts two full documents in one request", async () => {
    const res = await comparePost(
      req({ "content-type": "application/json" }, JSON.stringify({ textA: RENTAL_AGREEMENT, textB: NDA, ai: false })),
    );
    expect(res.status).toBe(200);
  });
});
