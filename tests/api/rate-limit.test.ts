import { beforeEach, describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimits } from "@/lib/server/rate-limit";

beforeEach(() => resetRateLimits());

describe("checkRateLimit", () => {
  it("allows up to the limit and then blocks", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k", 5, now + i).allowed).toBe(true);
    }
    const blocked = checkRateLimit("k", 5, now + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("slides: old requests fall out of the window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) checkRateLimit("k", 5, now);
    expect(checkRateLimit("k", 5, now + 1).allowed).toBe(false);
    // 61 seconds later the window has slid past all five.
    expect(checkRateLimit("k", 5, now + 61_000).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) checkRateLimit("a", 5, now);
    expect(checkRateLimit("a", 5, now).allowed).toBe(false);
    expect(checkRateLimit("b", 5, now).allowed).toBe(true);
  });

  it("reports remaining capacity", () => {
    const now = 1_000_000;
    expect(checkRateLimit("k", 3, now).remaining).toBe(2);
    expect(checkRateLimit("k", 3, now).remaining).toBe(1);
    expect(checkRateLimit("k", 3, now).remaining).toBe(0);
  });
});
