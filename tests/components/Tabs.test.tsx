// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tabs } from "@/components/Tabs";

import { expectNoA11yViolations } from "./a11y";

function renderTabs() {
  return render(
    <Tabs
      label="Analysis details"
      tabs={[
        { id: "one", label: "Clauses", count: 12, content: <p>First panel</p> },
        { id: "two", label: "Ask", content: <p>Second panel</p> },
        { id: "three", label: "Facts", count: 3, content: <p>Third panel</p> },
      ]}
    />,
  );
}

describe("Tabs", () => {
  it("follows the WAI-ARIA tabs pattern and passes axe", async () => {
    renderTabs();
    expect(screen.getByRole("tablist", { name: "Analysis details" })).toBeInTheDocument();
    const [first, second] = screen.getAllByRole("tab");
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("tabindex", "0");
    expect(second).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName(/Clauses/);
    await expectNoA11yViolations();
  });

  it("reads counters as part of the name, not glued to it", () => {
    renderTabs();
    expect(screen.getByRole("tab", { name: "Clauses (12)" })).toBeInTheDocument();
  });

  it("moves selection and focus with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    renderTabs();
    await user.click(screen.getByRole("tab", { name: /Clauses/ }));

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Ask" })).toHaveFocus();
    expect(screen.getByText("Second panel")).toBeVisible();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /Facts/ })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Clauses/ })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: /Facts/ })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: /Clauses/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("First panel")).toBeVisible();
    expect(screen.getByText("Third panel")).not.toBeVisible();
  });
});
