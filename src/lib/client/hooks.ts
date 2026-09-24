/**
 * Small behaviours several panels share. Import only from client components.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One in-flight request per panel. Each call cancels the previous request
 * and returns a signal for the next; unmounting cancels whatever is left, so
 * a slow answer can never land in a panel the reader has moved on from.
 */
export function useLatestRequest(): () => AbortSignal {
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  return useCallback(() => {
    current.current?.abort();
    current.current = new AbortController();
    return current.current.signal;
  }, []);
}

/** Copy text to the clipboard; `copied` stays true for a moment afterwards. */
export function useCopy(resetAfterMs = 2000): { copied: boolean; copy: (text: string) => Promise<void> } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard can be unavailable (permissions, insecure context); the
        // text is still on screen to copy by hand.
        return;
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetAfterMs);
    },
    [resetAfterMs],
  );
  return { copied, copy };
}

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Move keyboard and screen-reader focus to new content and bring it into
 * view — smoothly, unless the reader asked for less motion. Focus without
 * the scroll jump comes first, so the scroll is the only movement.
 */
export function revealAndFocus(element: HTMLElement | null | undefined): void {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

/** Offer text as a file download, entirely in the browser. */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before letting go.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
