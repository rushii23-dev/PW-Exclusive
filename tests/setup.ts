/**
 * Shared test setup. DOM matchers are registered everywhere (they are inert
 * in node tests); the DOM is cleaned between component tests.
 */

import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";

afterEach(async () => {
  if (typeof document === "undefined") return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
