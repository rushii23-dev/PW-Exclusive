/**
 * A stand-in for the Gemini SDK. Tests queue the replies the "model" will
 * give, and can inspect every request it received.
 */

import { vi } from "vitest";

export interface CapturedRequest {
  model: string;
  contents: string;
  config: {
    systemInstruction?: string;
    responseJsonSchema?: unknown;
    responseMimeType?: string;
    safetySettings?: Array<{ category?: string; threshold?: string }>;
  };
}

export const gemini = {
  requests: [] as CapturedRequest[],
  replies: [] as Array<unknown | Error>,
  /** Queue a JSON reply (object) or a failure (Error). */
  reply(value: unknown | Error) {
    this.replies.push(value);
  },
  reset() {
    this.requests = [];
    this.replies = [];
  },
};

export const generateContent = vi.fn(async (req: CapturedRequest) => {
  gemini.requests.push(req);
  const next = gemini.replies.shift();
  if (next instanceof Error) throw next;
  if (next === undefined) throw new Error("mock-gemini: no reply queued");
  return { text: typeof next === "string" ? next : JSON.stringify(next), candidates: [] };
});

// Only the client is replaced; the SDK's enums and types stay real.
vi.mock("@google/genai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@google/genai")>()),
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
