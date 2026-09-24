/**
 * Rendering and network helpers for component tests.
 */

import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";

import { AiProvider } from "@/components/ai/AiContext";
import type { LanguageCode } from "@/lib/ai/languages";

export function renderWithAi(
  ui: ReactElement,
  {
    configured = true,
    language = "en",
    documentText = "",
  }: { configured?: boolean; language?: LanguageCode; documentText?: string } = {},
) {
  return render(
    <AiProvider
      status={{ configured, model: configured ? "gemini-test" : null }}
      language={language}
      setLanguage={() => {}}
      documentText={documentText}
    >
      {ui}
    </AiProvider>,
  );
}

export type Route = (body: unknown, init: RequestInit) => Response | Promise<Response>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * Replace `fetch` with a router over the app's own API paths. Every call is
 * recorded with its parsed JSON body, so tests can check what was sent.
 */
export function mockApi(routes: Record<string, Route>) {
  const calls: Array<{ url: string; body: unknown; init: RequestInit }> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    calls.push({ url, body, init });
    const route = routes[url];
    if (!route) throw new Error(`mockApi: no route for ${url}`);
    return route(body, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

/** A response that never arrives; like real fetch, it rejects once cancelled. */
export function hang(init: RequestInit): Promise<Response> {
  return new Promise((_, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (init.signal?.aborted) abort();
    init.signal?.addEventListener("abort", abort);
  });
}
