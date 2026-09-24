/**
 * Accessibility assertions for component tests, on axe-core — the engine
 * behind most accessibility audits.
 *
 * Two rules are off here, and only here: jsdom has no layout, so colour
 * contrast cannot be measured (it is checked in a real browser instead), and
 * a component rendered on its own sits outside the page's landmarks.
 */

import axe from "axe-core";
import { expect } from "vitest";

export async function expectNoA11yViolations(container: Element = document.body): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
      region: { enabled: false },
    },
  });
  const problems = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n    at ${v.nodes.map((n) => n.target.join(" ")).join("\n    at ")}`,
  );
  expect(problems, problems.join("\n")).toEqual([]);
}
