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
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Documents pass through these responses; no shared cache may keep them.
  { key: "Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Self-contained server bundle for the container image (Cloud Run). Other
  // hosts such as Vercel ignore this and use their own output.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: securityHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders.filter((h) => h.key !== "Cache-Control"),
      },
    ];
  },
};

export default nextConfig;
