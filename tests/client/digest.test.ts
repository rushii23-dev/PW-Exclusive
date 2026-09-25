import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { digest } from "@/lib/client/digest";
import { MAX_DOCUMENT_CHARS } from "@/lib/limits";
import { RENTAL_AGREEMENT } from "@/lib/samples";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("digest", () => {
  it("is the SHA-256 of the text's UTF-8 bytes, in hex", async () => {
    const text = `${RENTAL_AGREEMENT}\nकिराया ₹32,000`;
    expect(await digest(text)).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
  });

  it("keys a maximum-size document with 64 characters", async () => {
    const key = await digest("a".repeat(MAX_DOCUMENT_CHARS));
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("tells documents apart that differ by one character", async () => {
    expect(await digest(RENTAL_AGREEMENT)).not.toBe(await digest(`${RENTAL_AGREEMENT}.`));
  });

  it("uses the text itself where Web Crypto is unavailable, so a key is never wrong", async () => {
    vi.stubGlobal("crypto", {});
    expect(await digest(RENTAL_AGREEMENT)).toBe(RENTAL_AGREEMENT);
  });
});
