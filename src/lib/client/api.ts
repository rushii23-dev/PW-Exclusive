/**
 * One way to call the API from the browser, so every panel reports failures
 * the same way and none of them can leave a spinner running forever.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const OFFLINE = "Could not reach the server. Check your connection and try again.";
const GENERIC = "Something went wrong. Please try again.";

export async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: OFFLINE };
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // A proxy error page or an empty body — fall through to the status check.
  }

  if (!res.ok) {
    const message = (json as { error?: { message?: string } } | null)?.error?.message;
    if (res.status === 429) return { ok: false, error: message ?? "Too many requests — please wait a moment." };
    return { ok: false, error: message ?? GENERIC };
  }
  if (json === null) return { ok: false, error: GENERIC };
  return { ok: true, data: json as T };
}
