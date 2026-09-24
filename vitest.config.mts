import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // Engine and API tests run in node; component tests opt into jsdom
    // with a `@vitest-environment jsdom` docblock.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    // Component tests run axe over whole pages; with every file running in
    // parallel that can outlast the 5 s default on a busy machine.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**", "src/components/**"],
      reporter: ["text-summary", "text", "html"],
      // A floor, not a target: CI fails if coverage slips below it.
      thresholds: { statements: 85, branches: 75, functions: 85, lines: 85 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      // Next.js swaps this guard for a no-op on the server; tests are server.
      "server-only": path.resolve(root, "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
});
