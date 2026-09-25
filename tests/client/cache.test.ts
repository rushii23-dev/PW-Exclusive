import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiResult } from "@/lib/client/api";
import { ResponseCache } from "@/lib/client/cache";
import { DocumentSession } from "@/lib/client/session";
import type { Answer } from "@/lib/engine";
import { RENTAL_AGREEMENT } from "@/lib/samples";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });

describe("ResponseCache", () => {
  it("answers a repeat from memory without asking again", async () => {
    const cache = new ResponseCache<number>(4);
    const request = vi.fn(async () => ok(42));
    expect(await cache.load("q", request)).toEqual(ok(42));
    expect(await cache.load("q", request)).toEqual(ok(42));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("never keeps a failure or a cancellation, so trying again really tries", async () => {
    const cache = new ResponseCache<number>(4);
    const failed = vi.fn(async (): Promise<ApiResult<number>> => ({ ok: false, error: "down" }));
    await cache.load("q", failed);
    await cache.load("q", failed);
    expect(failed).toHaveBeenCalledTimes(2);

    const cancelled = vi.fn(async (): Promise<ApiResult<number>> => ({ ok: false, error: "", aborted: true }));
    await cache.load("r", cancelled);
    await cache.load("r", cancelled);
    expect(cancelled).toHaveBeenCalledTimes(2);
  });

  it("keeps only what `keep` accepts as final", async () => {
    const cache = new ResponseCache<{ partial: boolean }>(4);
    const request = vi.fn(async () => ok({ partial: true }));
    await cache.load("q", request, (d) => !d.partial);
    await cache.load("q", request, (d) => !d.partial);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("stays within its capacity, forgetting the least recently used first", async () => {
    const cache = new ResponseCache<string>(2);
    const request = vi.fn(async () => ok("x"));
    await cache.load("a", request);
    await cache.load("b", request);
    await cache.load("a", request); // "a" is now the most recent…
    await cache.load("c", request); // …so "b" makes room for "c".
    expect(request).toHaveBeenCalledTimes(3);

    await cache.load("a", request);
    await cache.load("c", request);
    expect(request).toHaveBeenCalledTimes(3);
    await cache.load("b", request);
    expect(request).toHaveBeenCalledTimes(4);
  });
});

describe("DocumentSession", () => {
  function stubAnswers(source: Answer["source"]) {
    const answer: Answer = { found: true, source, response: "It renews.", citations: [] };
    const fetchMock = vi.fn(async () => Response.json({ answer }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  const signal = () => new AbortController().signal;

  it("asks Gemini each question once per language", async () => {
    const fetchMock = stubAnswers("ai");
    const session = new DocumentSession(RENTAL_AGREEMENT, true);
    await session.ask("Does it renew?", "en", signal());
    await session.ask("Does it renew?", "en", signal());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A different language is a different answer.
    await session.ask("Does it renew?", "hi", signal());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/ask");
    expect(JSON.parse(String(init.body))).toEqual({ text: RENTAL_AGREEMENT, question: "Does it renew?", language: "en" });
  });

  it("asks again when Gemini is on but the rule engine had to stand in", async () => {
    const fetchMock = stubAnswers("engine");
    const session = new DocumentSession(RENTAL_AGREEMENT, true);
    await session.ask("Does it renew?", "en", signal());
    await session.ask("Does it renew?", "en", signal());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the rule engine's answers when it is the only one there is", async () => {
    const fetchMock = stubAnswers("engine");
    const session = new DocumentSession(RENTAL_AGREEMENT, false);
    await session.ask("Does it renew?", "en", signal());
    await session.ask("Does it renew?", "en", signal());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("starts empty for each document, so no answer crosses documents", async () => {
    const fetchMock = stubAnswers("ai");
    await new DocumentSession(RENTAL_AGREEMENT, true).ask("Does it renew?", "en", signal());
    await new DocumentSession(`${RENTAL_AGREEMENT}\n\nAmended.`, true).ask("Does it renew?", "en", signal());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("explains each clause once per language", async () => {
    const fetchMock = vi.fn(async () => Response.json({ explanation: { clauseId: "clause-2" } }));
    vi.stubGlobal("fetch", fetchMock);
    const session = new DocumentSession(RENTAL_AGREEMENT, true);
    await session.explain("clause-2", "ta", signal());
    await session.explain("clause-2", "ta", signal());
    await session.explain("clause-3", "ta", signal());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("works out options for each situation once", async () => {
    const fetchMock = vi.fn(async () => Response.json({ guide: { source: "ai", options: [] } }));
    vi.stubGlobal("fetch", fetchMock);
    const session = new DocumentSession(RENTAL_AGREEMENT, true);
    await session.options("I need to move out early.", "en", signal());
    await session.options("I need to move out early.", "en", signal());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
