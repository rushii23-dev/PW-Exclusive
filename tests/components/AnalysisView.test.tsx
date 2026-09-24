// @vitest-environment jsdom

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalysisView } from "@/components/analyze/AnalysisView";
import type { AiBrief } from "@/lib/ai/brief";
import { analyzeDocument, type Analysis } from "@/lib/engine";
import { FREELANCE_AGREEMENT, PG_LICENCE } from "@/lib/samples";

import { expectNoA11yViolations } from "./a11y";
import { renderWithAi } from "./helpers";

const BRIEF: AiBrief = {
  headline: "یہ معاہدہ خود بخود تجدید ہوتا ہے۔",
  paragraphs: ["پہلا پیراگراف۔", "یہ معلومات ہے، قانونی مشورہ نہیں۔"],
  topConcerns: [{ title: "دو مختلف رقمیں", detail: "ڈپازٹ کی رقم واضح کریں۔" }],
  beforeYouSign: ["نوٹس کی تاریخ لکھ لیں۔"],
  model: "gemini-test",
};

/** The PG licence, plus one contradiction "found by Gemini". */
function pgWithAiFinding(): Analysis {
  const analysis = analyzeDocument(PG_LICENCE);
  const [first, second] = analysis.clauses;
  return {
    ...analysis,
    inconsistencies: [
      ...analysis.inconsistencies,
      {
        id: "ai-contradiction-1",
        kind: "contradiction",
        title: "ایک شق دوسری سے متصادم ہے",
        explanation: "وضاحت۔",
        evidence: [
          { clauseId: first.id, heading: first.heading, quote: first.text.slice(0, 40) },
          { clauseId: second.id, heading: second.heading, quote: second.text.slice(0, 40) },
        ],
        source: "ai",
      },
    ],
  };
}

function renderView(analysis: Analysis, brief: AiBrief | null = null) {
  return renderWithAi(
    <AnalysisView analysis={analysis} aiBrief={brief} aiLanguage="ur" aiCheckedContradictions />,
    { documentText: PG_LICENCE },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AnalysisView", () => {
  it("renders a full analysis with no accessibility violations", async () => {
    renderView(pgWithAiFinding(), BRIEF);
    expect(screen.getByRole("heading", { level: 2, name: /licence|agreement|contract/i })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Analysis details" })).toBeInTheDocument();
    await expectNoA11yViolations();
  });

  it("marks Gemini's text with its language and direction, and only Gemini's", () => {
    renderView(pgWithAiFinding(), BRIEF);
    const headline = screen.getByRole("heading", { name: BRIEF.headline });
    expect(headline).toHaveAttribute("lang", "ur");
    expect(headline).toHaveAttribute("dir", "rtl");
    // The page's own labels stay in the page language.
    expect(screen.getByText("Your brief")).not.toHaveAttribute("lang");

    const aiTitle = screen.getByText("ایک شق دوسری سے متصادم ہے");
    expect(aiTitle).toHaveAttribute("lang", "ur");
    const engineTitle = screen.getByText("Words and figures disagree");
    expect(engineTitle).not.toHaveAttribute("lang");
  });

  it("keeps each statistic's term before its value, as a description list requires", () => {
    renderView(analyzeDocument(PG_LICENCE));
    const stats = screen.getByText("clauses").closest("dl")!;
    for (const group of Array.from(stats.children)) {
      expect(group.children[0].tagName).toBe("DT");
      expect(group.children[1].tagName).toBe("DD");
    }
  });

  it("offers the whole analysis as copied text and as a download", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderView(analyzeDocument(PG_LICENCE), BRIEF);
    await user.click(screen.getByRole("tab", { name: /Action plan/ }));

    await user.click(screen.getByRole("button", { name: "Copy as text" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("YOUR BRIEF"));
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByText("Analysis copied to the clipboard.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Download .txt" }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toMatch(/^text\/plain/);
    expect(await blob.text()).toContain("WHERE THE DOCUMENT CONTRADICTS ITSELF");
    expect(click).toHaveBeenCalled();
  });

  it("filters clauses by risk and says how many are shown", async () => {
    const user = userEvent.setup();
    const analysis = analyzeDocument(PG_LICENCE);
    renderView(analysis);
    const filter = screen.getByRole("group", { name: "Filter clauses by risk" });
    await user.click(within(filter).getByRole("button", { name: /Needs attention/ }));
    expect(within(filter).getByRole("button", { name: /Needs attention/ })).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText(`Showing ${analysis.riskProfile.high} of ${analysis.clauses.length} clauses.`),
    ).toBeInTheDocument();
  });

  it("shows what the other side must do alongside the reader's own duties", async () => {
    const user = userEvent.setup();
    renderWithAi(
      <AnalysisView analysis={analyzeDocument(FREELANCE_AGREEMENT)} aiBrief={null} aiCheckedContradictions={false} />,
    );
    await user.click(screen.getByRole("tab", { name: /Key facts/ }));
    const theirs = screen.getByRole("region", { name: "What the other side must do" });
    expect(within(theirs).getByText(/Client shall pay the Contractor/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "What this document requires of you" })).toBeInTheDocument();
  });
});
