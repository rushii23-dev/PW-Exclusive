// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Comparer } from "@/components/compare/Comparer";
import type { CompareVerdict } from "@/lib/ai/compare";
import { analyzeDocument, compare } from "@/lib/engine";
import { EMPLOYMENT_CONTRACT, FREELANCE_AGREEMENT } from "@/lib/samples";

import { expectNoA11yViolations } from "./a11y";
import { json, mockApi } from "./helpers";

const verdict: CompareVerdict = {
  overview: "A pays per project; B pays a salary.",
  betterInA: ["You keep your other clients."],
  betterInB: ["A steady monthly salary."],
  watchOut: ["Both assign your work to them."],
  questionsToAsk: ["Can the non-compete be shortened?"],
  model: "gemini-test",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Comparer", () => {
  it("compares two samples, moves focus to the result, and passes axe", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({
      "/api/health": () => json({ ai: { configured: true, model: "gemini-test" } }),
      "/api/compare": (body) => {
        const { textA, textB } = body as { textA: string; textB: string };
        const a = analyzeDocument(textA);
        const b = analyzeDocument(textB);
        return json({ a, b, comparison: compare(a, b), ai: { available: true, used: true, verdict } });
      },
    });
    render(<Comparer />);
    await expectNoA11yViolations();

    await user.selectOptions(screen.getByRole("combobox", { name: "Load a sample into document A" }), "freelance");
    await user.selectOptions(screen.getByRole("combobox", { name: "Load a sample into document B" }), "employment");
    expect(screen.getByRole("textbox", { name: "Document A" })).toHaveValue(FREELANCE_AGREEMENT);
    expect(screen.getByRole("textbox", { name: "Document B" })).toHaveValue(EMPLOYMENT_CONTRACT);

    await user.click(screen.getByRole("button", { name: "Compare documents" }));

    const heading = await screen.findByRole("heading", { name: "The comparison in short" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText(verdict.overview)).toHaveAttribute("lang", "en");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("rowheader").length).toBeGreaterThan(0);
    expect(calls.find((c) => c.url === "/api/compare")?.body).toMatchObject({ language: "en" });
    await expectNoA11yViolations();
  });
});
