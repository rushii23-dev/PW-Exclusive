import { afterEach, describe, expect, it, vi } from "vitest";

import { postForm, postJson } from "@/lib/client/api";

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Never answers; like real fetch, it rejects once the signal fires (or already has). */
const neverAnswers = (_url: string, init: RequestInit) =>
  new Promise<Response>((_, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (init.signal?.aborted) abort();
    init.signal?.addEventListener("abort", abort);
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("postJson", () => {
  it("sends JSON and returns the parsed body", async () => {
    const fetchMock = stubFetch(async () => Response.json({ answer: 42 }));
    const result = await postJson<{ answer: number }>("/api/x", { q: 1 });
    expect(result).toEqual({ ok: true, data: { answer: 42 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
    expect(init.body).toBe('{"q":1}');
  });

  it("passes the server's own error message through", async () => {
    stubFetch(async () => Response.json({ error: { code: "invalid_document", message: "Too short." } }, { status: 422 }));
    expect(await postJson("/api/x", {})).toEqual({ ok: false, error: "Too short." });
  });

  it("explains a rate limit even when the body is not ours", async () => {
    stubFetch(async () => new Response("<html>busy</html>", { status: 429 }));
    const result = await postJson("/api/x", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Too many requests/);
  });

  it("gives a generic message for a proxy error page", async () => {
    stubFetch(async () => new Response("<html>502</html>", { status: 502 }));
    const result = await postJson("/api/x", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Something went wrong/);
  });

  it("says the server is unreachable when the network fails", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    const result = await postJson("/api/x", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Could not reach the server/);
  });

  it("gives up at the deadline instead of spinning forever", async () => {
    vi.useFakeTimers();
    stubFetch(neverAnswers);
    const pending = postJson("/api/x", {}, { timeoutMs: 5_000 });
    await vi.advanceTimersByTimeAsync(5_001);
    const result = await pending;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/took too long/);
      expect(result.aborted).toBeUndefined();
    }
  });

  it("reports a caller's cancel as aborted, with nothing to show", async () => {
    stubFetch(neverAnswers);
    const controller = new AbortController();
    const pending = postJson("/api/x", {}, { signal: controller.signal });
    controller.abort();
    expect(await pending).toEqual({ ok: false, error: "", aborted: true });
  });

  it("does not even start a request that was cancelled before it began", async () => {
    const fetchMock = stubFetch(neverAnswers);
    const controller = new AbortController();
    controller.abort();
    expect(await postJson("/api/x", {}, { signal: controller.signal })).toMatchObject({ aborted: true });
    expect(fetchMock.mock.calls[0][1].signal?.aborted).toBe(true);
  });
});

describe("postForm", () => {
  it("sends the form as-is, letting the browser set the multipart boundary", async () => {
    const fetchMock = stubFetch(async () => Response.json({ text: "hello" }));
    const form = new FormData();
    form.append("file", new Blob(["x"]), "a.txt");
    expect(await postForm("/api/extract", form)).toEqual({ ok: true, data: { text: "hello" } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(form);
    expect(init.headers).toBeUndefined();
  });
});
