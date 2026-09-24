"use client";

/**
 * What every AI-aware component needs to know: whether Gemini is configured
 * on this server, which language the reader wants explanations in, and the
 * document the questions are about. Held in context so a clause card deep
 * in a tab can call the API without threading props through every layer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { LANGUAGE_CODES, type LanguageCode } from "@/lib/ai/languages";

export interface AiStatus {
  /** Null until the health check answers. */
  configured: boolean | null;
  model: string | null;
}

interface AiContextValue extends AiStatus {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  documentText: string;
}

const AiContext = createContext<AiContextValue | null>(null);

const LANGUAGE_KEY = "clearclause:language";

/** Ask the server once whether Gemini is available. */
export function useAiStatus(): AiStatus {
  const [status, setStatus] = useState<AiStatus>({ configured: null, model: null });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setStatus({ configured: Boolean(json?.ai?.configured), model: json?.ai?.model ?? null });
      })
      .catch(() => !cancelled && setStatus({ configured: false, model: null }));
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}

function savedLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    return LANGUAGE_CODES.find((c) => c === saved) ?? "en";
  } catch {
    // Storage can be blocked; English is a fine default.
    return "en";
  }
}

/**
 * The reader's language choice, remembered on this device only. Read lazily:
 * the picker only renders after the health check, so the server-rendered
 * HTML never depends on it and hydration stays consistent.
 */
export function useLanguagePreference(): [LanguageCode, (code: LanguageCode) => void] {
  const [language, setLanguageState] = useState<LanguageCode>(savedLanguage);
  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, code);
    } catch {
      // Not remembered, still applied.
    }
  }, []);
  return [language, setLanguage];
}

export function AiProvider({
  status,
  language,
  setLanguage,
  documentText,
  children,
}: {
  status: AiStatus;
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  documentText: string;
  children: ReactNode;
}) {
  // A stable value, so typing in the document box doesn't re-render every
  // clause card that reads this context.
  const { configured, model } = status;
  const value = useMemo<AiContextValue>(
    () => ({ configured, model, language, setLanguage, documentText }),
    [configured, model, language, setLanguage, documentText],
  );
  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAi(): AiContextValue {
  const value = useContext(AiContext);
  if (!value) throw new Error("useAi must be used inside <AiProvider>");
  return value;
}
