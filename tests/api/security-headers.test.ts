import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

type Header = { key: string; value: string };

async function headersFor(source: string): Promise<Map<string, string>> {
  const rules = (await nextConfig.headers!()) as Array<{ source: string; headers: Header[] }>;
  const rule = rules.find((r) => r.source === source);
  if (!rule) throw new Error(`no header rule for ${source}`);
  return new Map(rule.headers.map((h) => [h.key.toLowerCase(), h.value]));
}

describe("security headers", () => {
  it("lock pages down: CSP, framing, sniffing, isolation, transport", async () => {
    const h = await headersFor("/:path*");
    const csp = h.get("content-security-policy") ?? "";
    for (const directive of [
      "default-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ]) {
      expect(csp).toContain(directive);
    }
    // Documents may only ever be sent to this origin.
    expect(csp).not.toMatch(/connect-src[^;]*https?:/);
    expect(h.get("x-frame-options")).toBe("DENY");
    expect(h.get("x-content-type-options")).toBe("nosniff");
    expect(h.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(h.get("strict-transport-security")).toMatch(/max-age=\d{8,}/);
    expect(h.get("permissions-policy")).toMatch(/camera=\(\)/);
  });

  it("forbid caching of API responses, which carry document text", async () => {
    expect((await headersFor("/api/:path*")).get("cache-control")).toBe("no-store");
    expect((await headersFor("/:path*")).has("cache-control")).toBe(false);
  });

  it("never advertise the framework", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

describe("response compression", () => {
  it("is left to the server, which gzips pages and API JSON alike", () => {
    expect(nextConfig.compress).toBe(true);
  });

  it("declares the API's JSON type as a plain header, which is what the server's gzip reads", async () => {
    expect((await headersFor("/api/:path*")).get("content-type")).toBe("application/json; charset=utf-8");
    expect((await headersFor("/:path*")).has("content-type")).toBe(false);
  });
});
