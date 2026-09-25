import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { generateContent } from "./mock-gemini";

import {
  classifyFailure,
  generateJson,
  modelChain,
  resetGeminiClient,
  SAFETY_SETTINGS,
  transcribeDocument,
} from "@/lib/ai/gemini";

const request = {
  feature: "test",
  system: "system",
  prompt: "prompt",
  schema: { type: "object" },
  validate: z.object({ ok: z.boolean() }),
};

function apiError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_FALLBACK_MODELS;
  resetGeminiClient();
});

afterEach(() => {
  generateContent.mockReset();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_FALLBACK_MODELS;
  resetGeminiClient();
});

describe("classifyFailure", () => {
  it("treats overload, rate limits and timeouts as transient", () => {
    expect(classifyFailure(apiError(503, "high demand"))).toBe("transient");
    expect(classifyFailure(apiError(429, "RESOURCE_EXHAUSTED"))).toBe("transient");
    expect(classifyFailure(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}'))).toBe("transient");
    expect(classifyFailure(new Error("The operation was aborted due to timeout"))).toBe("transient");
  });

  it("treats an unknown model as a reason to try the next one", () => {
    expect(classifyFailure(apiError(404, "models/x is not found for API version v1beta"))).toBe("model-missing");
  });

  it("treats a bad key or bad request as fatal", () => {
    expect(classifyFailure(apiError(400, "API key not valid"))).toBe("fatal");
    expect(classifyFailure(apiError(403, "PERMISSION_DENIED"))).toBe("fatal");
  });
});

describe("modelChain", () => {
  it("puts the configured model first and never repeats one", () => {
    process.env.GEMINI_MODEL = "gemini-3.6-flash";
    const chain = modelChain();
    expect(chain[0]).toBe("gemini-3.6-flash");
    expect(new Set(chain).size).toBe(chain.length);
  });

  it("honours an explicit fallback list", () => {
    process.env.GEMINI_FALLBACK_MODELS = "model-b, model-c";
    expect(modelChain().slice(1)).toEqual(["model-b", "model-c"]);
  });
});

describe("generateJson resilience", () => {
  it("moves straight to the next model when the primary is overloaded", async () => {
    process.env.GEMINI_FALLBACK_MODELS = "backup-model";
    generateContent
      .mockImplementationOnce(async () => {
        throw apiError(503, "high demand");
      })
      .mockImplementationOnce(async () => ({ text: '{"ok":true}', candidates: [] }));
    const result = await generateJson(request);
    expect(result).toEqual({ data: { ok: true }, model: "backup-model" });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("moves on after a rate limit too", async () => {
    process.env.GEMINI_FALLBACK_MODELS = "backup-model";
    generateContent
      .mockImplementationOnce(async () => {
        throw apiError(429, "RESOURCE_EXHAUSTED");
      })
      .mockImplementationOnce(async () => ({ text: '{"ok":true}', candidates: [] }));
    expect((await generateJson(request))?.model).toBe("backup-model");
  });

  it("skips straight to the next model when one doesn't exist", async () => {
    process.env.GEMINI_FALLBACK_MODELS = "backup-model";
    generateContent
      .mockImplementationOnce(async () => {
        throw apiError(404, "not found");
      })
      .mockImplementationOnce(async () => ({ text: '{"ok":true}', candidates: [] }));
    const result = await generateJson(request);
    expect(result?.model).toBe("backup-model");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("stops at once on a bad key instead of hammering every model", async () => {
    generateContent.mockImplementation(async () => {
      throw apiError(400, "API key not valid");
    });
    expect(await generateJson(request)).toBeNull();
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("returns null when every model is overloaded", async () => {
    process.env.GEMINI_FALLBACK_MODELS = "backup-a,backup-b";
    generateContent.mockImplementation(async () => {
      throw apiError(503, "high demand");
    });
    expect(await generateJson(request)).toBeNull();
    // Each model in the chain is tried exactly once.
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it("turns off the SDK's own retries and keeps timeouts within API limits", async () => {
    generateContent.mockImplementation(async () => ({ text: '{"ok":true}', candidates: [] }));
    await generateJson(request);
    const [req] = generateContent.mock.calls[0] as unknown as [
      { config: { httpOptions: { retryOptions: { attempts: number }; timeout: number } } },
    ];
    expect(req.config.httpOptions.retryOptions.attempts).toBe(1);
    // The API rejects deadlines under 10 s; long ones would blow the page budget.
    expect(req.config.httpOptions.timeout).toBeGreaterThanOrEqual(10_000);
    expect(req.config.httpOptions.timeout).toBeLessThanOrEqual(20_000);
  });

  it("defaults to a fast Flash-Lite model", () => {
    expect(modelChain()[0]).toMatch(/flash-lite/);
  });
});

describe("safety settings", () => {
  it("block the four harm categories from medium probability up on every call", async () => {
    generateContent.mockImplementation(async () => ({ text: '{"ok":true}', candidates: [] }));
    await generateJson(request);
    const [req] = generateContent.mock.calls[0] as unknown as [
      { config: { safetySettings: Array<{ category: string; threshold: string }> } },
    ];
    expect(req.config.safetySettings.map((s) => s.category).sort()).toEqual([
      "HARM_CATEGORY_DANGEROUS_CONTENT",
      "HARM_CATEGORY_HARASSMENT",
      "HARM_CATEGORY_HATE_SPEECH",
      "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    ]);
    expect(new Set(req.config.safetySettings.map((s) => s.threshold))).toEqual(new Set(["BLOCK_MEDIUM_AND_ABOVE"]));
  });

  it("apply to transcription as well", async () => {
    generateContent.mockImplementation(async () => ({ text: "1. RENT\nThe tenant pays rent.", candidates: [] }));
    await transcribeDocument({ mimeType: "image/png", data: new Uint8Array([1, 2, 3]) });
    const [req] = generateContent.mock.calls[0] as unknown as [{ config: { safetySettings: unknown[] } }];
    expect(req.config.safetySettings).toBe(SAFETY_SETTINGS);
  });

  it("turn a withheld reply into null, so the rule engine answers instead", async () => {
    // A blocked candidate comes back with no text.
    generateContent.mockImplementation(async () => ({ text: "", candidates: [] }));
    expect(await generateJson(request)).toBeNull();
    // A block is an answer, not an outage: no other model is asked.
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});

describe("when the reader's request goes away", () => {
  it("makes no call at all for a request that is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(await generateJson({ ...request, signal: controller.signal })).toBeNull();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("tries no fallback model once the reader has left", async () => {
    const controller = new AbortController();
    generateContent.mockImplementation(async () => {
      // The reader navigates away while the first model is busy.
      controller.abort();
      throw apiError(503, "high demand");
    });
    expect(await generateJson({ ...request, signal: controller.signal })).toBeNull();
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("hands the signal to the SDK so the HTTP call itself is cancelled", async () => {
    const controller = new AbortController();
    generateContent.mockImplementation(async () => ({ text: '{"ok":true}', candidates: [] }));
    await generateJson({ ...request, signal: controller.signal });
    const [call] = generateContent.mock.calls[0] as unknown as [{ config: { abortSignal?: AbortSignal } }];
    expect(call.config.abortSignal).toBe(controller.signal);
  });
});
