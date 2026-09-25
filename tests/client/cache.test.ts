import { describe, expect, it, vi } from "vitest";

import type { ApiResult } from "@/lib/client/api";
import { ResponseCache } from "@/lib/client/cache";

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
