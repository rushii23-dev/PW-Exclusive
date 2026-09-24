// @vitest-environment jsdom

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AskPanel } from "@/components/analyze/AskPanel";
import { ClauseExplainer } from "@/components/analyze/ClauseExplainer";
import { OptionsPanel } from "@/components/analyze/OptionsPanel";
import type { ClauseExplanation } from "@/lib/ai/explain";
import type { SituationGuide } from "@/lib/ai/options";
import type { Answer } from "@/lib/engine";
import { RENTAL_AGREEMENT } from "@/lib/samples";

import { expectNoA11yViolations } from "./a11y";
import { json, mockApi, renderWithAi } from "./helpers";

const QUOTE = "shall be deemed renewed automatically";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AskPanel", () => {
  const answer: Answer = {
    found: true,
    source: "ai",
    response: "हाँ, यह अपने आप नवीनीकृत होता है।",
    citations: [{ clauseId: "clause-2", heading: "Term", quote: QUOTE, score: 1 }],
    followUps: ["मैं नोटिस कैसे दूँ?"],
  };

  it("sends the question with the document and language, and keeps the conversation keyboard-friendly", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({ "/api/ask": () => json({ answer }) });
    renderWithAi(<AskPanel />, { language: "hi", documentText: RENTAL_AGREEMENT });
    await expectNoA11yViolations();

    const input = screen.getByRole("textbox", { name: "Ask a question about the document" });
    await user.type(input, "Does it renew by itself?{Enter}");

    const log = screen.getByRole("log", { name: "Questions and answers" });
    const response = await within(log).findByText(answer.response);
    expect(response).toHaveAttribute("lang", "hi");
    // The quote is the document's own words, shown as a quotation.
    expect(within(log).getByText(QUOTE).tagName).toBe("Q");
    expect(within(log).getByText(QUOTE)).not.toHaveAttribute("lang");
    // Focus stays in the input, ready for the next question.
    expect(input).toHaveFocus();
    expect(calls[0].body).toMatchObject({ text: RENTAL_AGREEMENT, question: "Does it renew by itself?", language: "hi" });

    const followUps = screen.getByRole("list", { name: "Suggested follow-up questions" });
    expect(followUps).toHaveAttribute("lang", "hi");
    await expectNoA11yViolations();
  });

  it("returns focus to the input when a suggested question is clicked", async () => {
    const user = userEvent.setup();
    mockApi({ "/api/ask": () => json({ answer: { ...answer, source: "engine", followUps: [] } }) });
    renderWithAi(<AskPanel />, { documentText: RENTAL_AGREEMENT });
    await user.click(screen.getByRole("button", { name: "When do I get my deposit back?" }));
    expect(screen.getByRole("textbox")).toHaveFocus();
    // Engine answers are English, so they carry no language marking.
    expect(await screen.findByText(answer.response)).not.toHaveAttribute("lang");
  });

  it("shows a server error inside the conversation", async () => {
    const user = userEvent.setup();
    mockApi({
      "/api/ask": () => json({ error: { code: "rate_limited", message: "Too many requests — please wait." } }, 429),
    });
    renderWithAi(<AskPanel />, { documentText: RENTAL_AGREEMENT });
    await user.type(screen.getByRole("textbox"), "Can I leave?{Enter}");
    expect(await within(screen.getByRole("log")).findByText("Too many requests — please wait.")).toBeInTheDocument();
  });
});

describe("ClauseExplainer", () => {
  const explanation: ClauseExplanation = {
    clauseId: "clause-2",
    plainMeaning: "Il contratto si rinnova da solo.",
    whatItMeansForYou: "Devi dare preavviso.",
    watchOutFor: ["Il termine di 60 giorni."],
    questionsToAsk: ["Posso ridurre il preavviso?"],
    fairerWording: "The lease renews only if both parties agree in writing.",
  };

  it("hands focus to the explanation once it arrives, marked with its language", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({ "/api/explain": () => json({ explanation }) });
    renderWithAi(<ClauseExplainer clauseId="clause-2" />, { language: "es", documentText: RENTAL_AGREEMENT });

    await user.click(screen.getByRole("button", { name: "Explain this clause simply" }));
    const region = await screen.findByRole("region", { name: "Plain-words explanation" });
    await waitFor(() => expect(region).toHaveFocus());
    expect(calls[0].body).toMatchObject({ clauseId: "clause-2", language: "es" });

    expect(screen.getByText(explanation.plainMeaning)).toHaveAttribute("lang", "es");
    // The proposed wording is written to drop into the document, in its language.
    expect(screen.getByText(explanation.fairerWording!)).not.toHaveAttribute("lang");
    await expectNoA11yViolations();
  });

  it("reports a failure next to the button and keeps the button usable", async () => {
    const user = userEvent.setup();
    mockApi({ "/api/explain": () => json({ error: { code: "ai_failed", message: "Try again." } }, 502) });
    renderWithAi(<ClauseExplainer clauseId="clause-2" />, { documentText: RENTAL_AGREEMENT });
    const button = screen.getByRole("button", { name: "Explain this clause simply" });
    await user.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again.");
    expect(button).toHaveAccessibleDescription("Try again.");
    expect(button).toBeEnabled();
  });

  it("renders nothing when Gemini is not configured", () => {
    const { container } = renderWithAi(<ClauseExplainer clauseId="clause-2" />, { configured: false });
    expect(container).toBeEmptyDOMElement();
  });
});

describe("OptionsPanel", () => {
  const guide: SituationGuide = {
    source: "ai",
    covered: true,
    summary: "You can leave with notice.",
    options: [
      {
        title: "Give notice",
        whatHappens: "Send written notice.",
        costsAndRisks: "Rent for the notice period.",
        support: [{ clauseId: "clause-2", heading: "Term", quote: QUOTE }],
      },
      {
        title: "Negotiate",
        whatHappens: "Ask the landlord to waive the lock-in.",
        costsAndRisks: "",
        support: [{ clauseId: "clause-5", heading: "Lock-in", quote: "lock-in period of six (6) months" }],
      },
    ],
    nextSteps: ["Write to the landlord."],
    questionsForProfessional: ["Is the lock-in enforceable?"],
    urgency: "soon",
  };

  it("works out options for a suggested situation and announces how many it found", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({ "/api/options": () => json({ guide }) });
    renderWithAi(<OptionsPanel documentType="rental-agreement" />, { documentText: RENTAL_AGREEMENT });
    await expectNoA11yViolations();

    const example = screen.getByRole("button", { name: /move out in two months/ });
    await user.click(example);

    expect(await screen.findByText("2 options found for your situation.")).toBeInTheDocument();
    const list = screen.getByRole("region", { name: "Your options under this document" });
    // Two options, each standing on a quote from the document.
    expect(list.querySelectorAll("ol > li")).toHaveLength(2);
    expect(list.querySelectorAll("q")).toHaveLength(2);
    expect(screen.getByText("Act soon")).toBeInTheDocument();
    expect(calls[0].body).toMatchObject({ situation: expect.stringMatching(/move out/) });
    await expectNoA11yViolations();
  });
});
