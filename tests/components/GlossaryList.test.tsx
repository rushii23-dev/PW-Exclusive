// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GlossaryList } from "@/components/glossary/GlossaryList";
import { GLOSSARY } from "@/lib/engine";

import { expectNoA11yViolations } from "./a11y";

describe("GlossaryList", () => {
  it("lists every term, labelled and searchable, and passes axe", async () => {
    render(<GlossaryList entries={GLOSSARY} />);
    expect(screen.getByRole("searchbox", { name: "Search the glossary" })).toBeInTheDocument();
    expect(screen.getAllByRole("term")).toHaveLength(GLOSSARY.length);
    expect(screen.getByText(`${GLOSSARY.length} of ${GLOSSARY.length} terms`)).toBeInTheDocument();
    await expectNoA11yViolations();
  });

  it("filters by term, alias or definition and announces the count", async () => {
    const user = userEvent.setup();
    render(<GlossaryList entries={GLOSSARY} />);
    await user.type(screen.getByRole("searchbox"), "hold harmless");
    expect(screen.getAllByRole("term")).toHaveLength(1);
    expect(screen.getByRole("term")).toHaveTextContent(/indemnify/i);
    const count = screen.getByText(`1 of ${GLOSSARY.length} terms`);
    expect(count).toHaveAttribute("aria-live", "polite");
  });

  it("says plainly when nothing matches", async () => {
    const user = userEvent.setup();
    render(<GlossaryList entries={GLOSSARY} />);
    await user.type(screen.getByRole("searchbox"), "zzzz");
    expect(screen.queryAllByRole("term")).toHaveLength(0);
    expect(screen.getByText(/No terms match/)).toBeInTheDocument();
    await expectNoA11yViolations();
  });
});
