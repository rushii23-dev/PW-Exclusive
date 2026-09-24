/**
 * One way to call the API from the browser, so every panel reports failures
 * the same way and none of them can leave a spinner running forever: every
 * request has a deadline, and a panel can cancel a request it no longer
 * needs (a newer one replaced it, or the panel went away).
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  /** `aborted` is set when the caller cancelled — show nothing for it. */
  | { ok: false; error: string; aborted?: boolean };

export interface RequestOptions {
  /** Cancel the request early, e.g. when the component unmounts. */
  signal?: AbortSignal;
  /** Give up after this long. Longer than any route's own time budget. */
  timeoutMs?: number;
}

const OFFLINE = "Could not reach the server. Check your connection and try again.";
const GENERIC = "Something went wrong. Please try again.";
const TIMED_OUT = "The server took too long to answer. Please try again.";

/** Routes finish within 60 s; uploads read by Gemini within 120 s. */
export const JSON_TIMEOUT_MS = 75_000;
export const UPLOAD_TIMEOUT_MS = 135_000;

/** A signal that fires on the caller's cancel or on the deadline, whichever is first. */
function deadline(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

async function send<T>(url: string, init: RequestInit, options: RequestOptions): Promise<ApiResult<T>> {
  const limit = deadline(options.signal, options.timeoutMs ?? JSON_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: limit.signal });
    } catch {
      if (limit.timedOut()) return { ok: false, error: TIMED_OUT };
      if (options.signal?.aborted) return { ok: false, error: "", aborted: true };
      return { ok: false, error: OFFLINE };
    }

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      // A proxy error page, an empty body, or a cancel mid-body — fall
      // through to the checks below.
    }
    if (options.signal?.aborted) return { ok: false, error: "", aborted: true };

    if (!res.ok) {
      const message = (json as { error?: { message?: string } } | null)?.error?.message;
      if (res.status === 429) return { ok: false, error: message ?? "Too many requests — please wait a moment." };
      return { ok: false, error: message ?? GENERIC };
    }
    if (json === null) return { ok: false, error: limit.timedOut() ? TIMED_OUT : GENERIC };
    return { ok: true, data: json as T };
  } finally {
    limit.dispose();
  }
}

export function postJson<T>(url: string, body: unknown, options: RequestOptions = {}): Promise<ApiResult<T>> {
  return send<T>(
    url,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    options,
  );
}

export function postForm<T>(url: string, form: FormData, options: RequestOptions = {}): Promise<ApiResult<T>> {
  return send<T>(url, { method: "POST", body: form }, { timeoutMs: UPLOAD_TIMEOUT_MS, ...options });
}
