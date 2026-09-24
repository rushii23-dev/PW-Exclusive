// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "@/components/SiteHeader";

import { expectNoA11yViolations } from "./a11y";

const navigation = vi.hoisted(() => ({ pathname: "/analyze" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

beforeEach(() => {
  navigation.pathname = "/analyze";
});

describe("SiteHeader", () => {
  it("marks the current page and passes axe", async () => {
    render(<SiteHeader />);
    const main = screen.getByRole("navigation", { name: "Main" });
    expect(main).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Analyze" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Compare" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /ClearClause.*home/ })).toHaveAttribute("href", "/");
    await expectNoA11yViolations();
  });

  it("opens the mobile menu, and Escape closes it and returns focus to the toggle", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Close menu");
    const menu = document.getElementById("mobile-nav")!;
    expect(menu).toBeInTheDocument();
    await expectNoA11yViolations();

    await user.tab();
    await user.keyboard("{Escape}");
    expect(document.getElementById("mobile-nav")).toBeNull();
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the menu when the page changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(document.getElementById("mobile-nav")).not.toBeNull();

    navigation.pathname = "/compare";
    rerender(<SiteHeader />);
    expect(document.getElementById("mobile-nav")).toBeNull();
  });
});
