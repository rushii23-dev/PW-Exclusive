// @vitest-environment jsdom

/**
 * Every static page renders with one h1, a sensible heading outline, and no
 * axe violations.
 */

import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import AboutPage from "@/app/about/page";
import GlossaryPage from "@/app/glossary/page";
import NotFound from "@/app/not-found";
import HomePage from "@/app/page";
import { SiteFooter } from "@/components/SiteFooter";

import { expectNoA11yViolations } from "./a11y";

/** Headings may go down only one level at a time. */
function expectOrderedHeadings() {
  const levels = screen.getAllByRole("heading").map((h) => Number(h.tagName.slice(1)));
  expect(levels[0]).toBe(1);
  levels.slice(1).forEach((level, i) => expect(level - levels[i]).toBeLessThanOrEqual(1));
}

describe.each<[string, () => ReactElement]>([
  ["home", () => <HomePage />],
  ["about", () => <AboutPage />],
  ["glossary", () => <GlossaryPage />],
  ["not found", () => <NotFound />],
])("the %s page", (_name, page) => {
  it("has exactly one h1, ordered headings and no axe violations", async () => {
    render(<main>{page()}</main>);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expectOrderedHeadings();
    await expectNoA11yViolations();
  });
});

describe("the footer", () => {
  it("labels its navigation and states that this is not legal advice", async () => {
    render(<SiteFooter />);
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeInTheDocument();
    expect(screen.getByText(/does not provide legal advice/)).toBeInTheDocument();
    await expectNoA11yViolations();
  });
});
