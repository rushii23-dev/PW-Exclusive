// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Analyzer } from "@/components/analyze/Analyzer";
import { analyzeDocument } from "@/lib/engine";
import { getSample, NDA, RENTAL_AGREEMENT } from "@/lib/samples";

import { expectNoA11yViolations } from "./a11y";
import { hang, json, mockApi } from "./helpers";

const health = () => json({ status: "ok", ai: { provider: "gemini", configured: false, model: null } });

/** What /api/analyze returns for a document, computed by the real engine. */
function analyzed(text: string) {
  return json({
    analysis: analyzeDocument(text),
    ai: { available: false, used: false, brief: null, contradictionsChecked: false },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Analyzer", () => {
  it("starts with a labelled, accessible form", async () => {
    mockApi({ "/api/health": health });
    render(<Analyzer initialSample={null} />);
    const box = screen.getByRole("textbox", { name: "Document text" });
    expect(box).toHaveAccessibleDescription(/0 \/ 200,000 characters/);
    expect(screen.getByRole("button", { name: "Analyze document" })).toBeDisabled();
    await expectNoA11yViolations();
  });

  it("analyses a sample, announces the result briefly and moves focus to it", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({ "/api/health": health, "/api/analyze": (body) => analyzed((body as { text: string }).text) });
    render(<Analyzer initialSample={null} />);

    await user.click(screen.getByRole("button", { name: "Rental agreement" }));

    const heading = await screen.findByRole("heading", { level: 2, name: "Rental agreement" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText(/^Analysis ready: Rental agreement, \d+ clauses; \d+ clauses? needs? attention/)).toBeInTheDocument();
    expect(calls.find((c) => c.url === "/api/analyze")?.body).toMatchObject({ text: RENTAL_AGREEMENT.trim(), language: "en" });
    await expectNoA11yViolations();
  });

  it("shows a server error as an alert tied to the text box", async () => {
    const user = userEvent.setup();
    mockApi({
      "/api/health": health,
      "/api/analyze": () => json({ error: { code: "invalid_document", message: "That is too short to analyse." } }, 422),
    });
    render(<Analyzer initialSample={null} />);
    const box = screen.getByRole("textbox", { name: "Document text" });
    await user.type(box, "Too short.");
    await user.click(screen.getByRole("button", { name: "Analyze document" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That is too short to analyse.");
    expect(box).toHaveAccessibleDescription(/That is too short to analyse\./);
  });

  it("reads a plain-text upload in the browser, without sending it anywhere", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({ "/api/health": health });
    const { container } = render(<Analyzer initialSample={null} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    await user.upload(input, new File([NDA], "nda.txt", { type: "text/plain" }));

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Document text" })).toHaveValue(NDA));
    expect(screen.getByText(/Loaded nda.txt/)).toHaveAttribute("role", "status");
    expect(calls.map((c) => c.url)).not.toContain("/api/extract");
  });

  it("cancels an analysis that a newer one has replaced", async () => {
    const user = userEvent.setup();
    const signals: AbortSignal[] = [];
    mockApi({
      "/api/health": health,
      "/api/analyze": (body, init) => {
        signals.push(init.signal!);
        const text = (body as { text: string }).text;
        // The first request hangs; only the second may land.
        return text.startsWith("RESIDENTIAL") ? hang(init) : analyzed(text);
      },
    });
    render(<Analyzer initialSample={null} />);

    await user.click(screen.getByRole("button", { name: "Rental agreement" }));
    await user.click(screen.getByRole("button", { name: "Mutual NDA" }));

    expect(await screen.findByRole("heading", { level: 2, name: "Non-disclosure agreement" })).toBeInTheDocument();
    expect(signals[0].aborted).toBe(true);
    expect(screen.queryByRole("heading", { level: 2, name: "Rental agreement" })).toBeNull();
  });

  it("sends other files to the server to be read, and says how they were read", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({
      "/api/health": health,
      "/api/extract": () => json({ text: RENTAL_AGREEMENT, method: "gemini-vision", truncated: false, pages: 2 }),
    });
    const { container } = render(<Analyzer initialSample={null} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    await user.upload(input, new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "lease.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Document text" })).toHaveValue(RENTAL_AGREEMENT));
    expect(screen.getByText(/Gemini read the text from lease.pdf \(2 pages\)/)).toBeInTheDocument();
    expect(calls.find((c) => c.url === "/api/extract")?.init.body).toBeInstanceOf(FormData);
  });

  it("refuses a file over the size limit before uploading it", async () => {
    const user = userEvent.setup();
    const { calls } = mockApi({ "/api/health": health });
    const { container } = render(<Analyzer initialSample={null} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "huge.pdf", { type: "application/pdf" });

    await user.upload(input, big);

    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/);
    expect(calls.map((c) => c.url)).not.toContain("/api/extract");
  });

  it("clears the document and puts the cursor back in the box", async () => {
    const user = userEvent.setup();
    mockApi({ "/api/health": health });
    render(<Analyzer initialSample={null} />);
    const box = screen.getByRole("textbox", { name: "Document text" });
    await user.type(box, "Some text");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(box).toHaveValue("");
    expect(box).toHaveFocus();
  });

  it("remembers the chosen language and offers to rewrite the brief in it", async () => {
    const user = userEvent.setup();
    // Node's own experimental localStorage can shadow jsdom's; use a real one.
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
    mockApi({
      "/api/health": () => json({ ai: { configured: true, model: "gemini-test" } }),
      "/api/analyze": (body) => {
        const { text } = body as { text: string };
        return json({
          analysis: analyzeDocument(text),
          ai: { available: true, used: true, brief: null, contradictionsChecked: true },
        });
      },
    });
    render(<Analyzer initialSample={null} />);
    await user.click(screen.getByRole("button", { name: "Rental agreement" }));
    await screen.findByRole("heading", { level: 2, name: "Rental agreement" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Explain in" }), "ta");
    expect(window.localStorage.getItem("clearclause:language")).toBe("ta");
    expect(screen.getByRole("button", { name: "Rewrite in Tamil" })).toBeInTheDocument();
  });

  it("runs a deep-linked sample even when React mounts the page twice", async () => {
    // Development mode mounts, unmounts and remounts every component. The
    // first mount's request is cancelled on the way; the second must still run.
    const { calls } = mockApi({ "/api/health": health, "/api/analyze": (body) => analyzed((body as { text: string }).text) });
    render(
      <StrictMode>
        <Analyzer initialSample={getSample("nda")!} />
      </StrictMode>,
    );
    expect(screen.getByRole("button", { name: "Analysing…" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Non-disclosure agreement" })).toBeInTheDocument();
    expect(calls.filter((c) => c.url === "/api/analyze").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Analyze document" })).toBeInTheDocument();
  });
});

