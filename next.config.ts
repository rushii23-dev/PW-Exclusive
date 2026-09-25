import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * `script-src` needs `'unsafe-eval'` only for React Fast Refresh in dev, and
 * `'unsafe-inline'` covers Next's bootstrap inline script; everything else is
 * same-origin. No external script, style, image or connect targets exist in
 * this app at all — documents are analysed on this origin and nowhere else,
 * and the CSP is what makes that promise enforceable.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), display-capture=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Keep other sites' windows and embeds out of this origin's process and
  // its responses out of theirs.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // Documents pass through these responses; no shared cache may keep them.
  { key: "Cache-Control", value: "no-store" },
];

/**
 * Every API route answers in JSON, and declaring that here is also what
 * lets the server's gzip reach the API. The compression step reads the
 * Content-Type to decide, and Next.js copies a route handler's own headers
 * onto the response as lists, which it skips — so without this rule an
 * analysis (tens to hundreds of kilobytes of JSON) would go out raw.
 */
const apiHeaders = [...securityHeaders, { key: "Content-Type", value: "application/json; charset=utf-8" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The server gzips pages, scripts and API JSON alike; no route compresses
  // its own output. (The default, stated because the API relies on it.)
  compress: true,
  // Self-contained server bundle for the container image (Cloud Run). Other
  // hosts such as Vercel ignore this and use their own output.
  output: "standalone",
  // Don't scaffold editor-assistant note files into the project on `next dev`.
  agentRules: false,
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: apiHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders.filter((h) => h.key !== "Cache-Control"),
      },
    ];
  },
};

export default nextConfig;
