"use client";

/**
 * Document Q&A. Stateless by design: each question re-sends the document,
 * so the server holds nothing between requests. Gemini answers in the
 * reader's language; every quote it shows has been checked against the
 * document, and "the document doesn't say" is a first-class answer.
 */

import { CornerDownLeft, MessageCircleQuestion } from "lucide-react";
import { useRef, useState } from "react";

import { useAi } from "@/components/ai/AiContext";
import { EngineBadge, GeminiBadge } from "@/components/ai/GeminiBadge";
import { languageAttributes, type LanguageCode } from "@/lib/ai/languages";
import { postJson } from "@/lib/client/api";
import { prefersReducedMotion, useLatestRequest } from "@/lib/client/hooks";
import type { Answer } from "@/lib/engine/client";
import { QUESTION_MAX_CHARS, QUESTION_MIN_CHARS } from "@/lib/limits";

interface Exchange {
  question: string;
  /** The language the answer was asked for. */
  language: LanguageCode;
  answer: Answer | null;
  error?: string;
}

const SUGGESTED = [
  "What happens if I want to leave early?",
  "When do I get my deposit back?",
  "Can they change the terms later?",
  "What am I not allowed to do?",
];

const CHIP =
  "min-h-8 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground";

export function AskPanel() {
  const { documentText, language, configured } = useAi();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextSignal = useLatestRequest();

  async function ask(q: string) {
    const trimmed = q.trim();
    if (trimmed.length < QUESTION_MIN_CHARS || pending) return;
    setPending(true);
    setQuestion("");
    // Whatever was pressed to ask (a suggestion, the button) may disappear
    // or disable; the conversation continues from the input.
    inputRef.current?.focus();
    const asked = language;
    setExchanges((prev) => [...prev, { question: trimmed, language: asked, answer: null }]);

    const result = await postJson<{ answer: Answer }>(
      "/api/ask",
      { text: documentText, question: trimmed, language: asked },
      { signal: nextSignal() },
    );
    if (!result.ok && result.aborted) return;
    setExchanges((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = result.ok
        ? { ...last, answer: result.data.answer }
        : { ...last, error: result.error };
      return next;
    });
    setPending(false);
    // Bring the new answer into view without stealing focus.
    requestAnimationFrame(() =>
      logRef.current?.scrollTo?.({
        top: logRef.current.scrollHeight,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      }),
    );
  }

  const lastFollowUps = exchanges.at(-1)?.answer?.followUps ?? [];

  return (
    <div className="sheet rounded-2xl border border-border">
      <div
        ref={logRef}
        role="log"
        aria-label="Questions and answers"
        aria-busy={pending}
        // The log scrolls; keyboard users need to be able to reach it.
        tabIndex={exchanges.length > 0 ? 0 : undefined}
        className="max-h-[26rem] space-y-4 overflow-y-auto p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {exchanges.length === 0 && (
          <div className="py-6 text-center">
            <MessageCircleQuestion
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Ask anything about this document{configured ? ", in any language" : ""}.
              Every answer quotes the clauses it comes from — and says so plainly
              when the document is silent.
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Suggested questions">
              {SUGGESTED.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => ask(s)} className={CHIP}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {exchanges.map((exchange, i) => (
          <div key={`${i}-${exchange.question}`} className="space-y-3">
            <p className="elev-xs ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-primary-strong to-primary px-4 py-2.5 text-sm text-primary-foreground">
              <span className="sr-only">You asked: </span>
              {exchange.question}
            </p>
            {exchange.answer === null && !exchange.error && (
              <p className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-border px-4 py-3">
                <span aria-hidden className="typing-dot size-1.5 rounded-full bg-primary" />
                <span aria-hidden className="typing-dot size-1.5 rounded-full bg-primary" />
                <span aria-hidden className="typing-dot size-1.5 rounded-full bg-primary" />
                <span className="sr-only">Finding the answer…</span>
              </p>
            )}
            {exchange.error && (
              <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-risk-high-soft px-4 py-2.5 text-sm text-risk-high">
                {exchange.error}
              </p>
            )}
            {exchange.answer && (
              <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm leading-relaxed">
                <div className="mb-1.5">
                  {exchange.answer.source === "ai" ? <GeminiBadge /> : <EngineBadge />}
                </div>
                <p
                  className="whitespace-pre-line"
                  {...(exchange.answer.source === "ai" ? languageAttributes(exchange.language) : {})}
                >
                  {exchange.answer.response}
                </p>
                {exchange.answer.citations.length > 0 && (
                  <div className="mt-3 border-t border-dashed border-border pt-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      From the document
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {exchange.answer.citations.map((c) => (
                        <li key={`${c.clauseId}-${c.quote}`} className="text-xs text-muted-foreground">
                          <span className="font-semibold">
                            {c.heading ?? c.clauseId.replace("clause-", "Clause ")}:
                          </span>{" "}
                          <q className="italic">{c.quote}</q>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {lastFollowUps.length > 0 && !pending && (
        <ul
          className="flex flex-wrap gap-2 border-t border-border px-4 py-3"
          aria-label="Suggested follow-up questions"
          {...languageAttributes(exchanges.at(-1)!.language)}
        >
          {lastFollowUps.map((f) => (
            <li key={f}>
              <button type="button" onClick={() => ask(f)} className={CHIP}>
                {f}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label htmlFor="ask-input" className="sr-only">
          Ask a question about the document
        </label>
        <input
          ref={inputRef}
          id="ask-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={QUESTION_MAX_CHARS}
          placeholder="e.g. How much notice do I have to give?"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm shadow-inner transition-colors placeholder:text-muted-foreground focus:border-border-strong"
        />
        <button
          type="submit"
          disabled={question.trim().length < QUESTION_MIN_CHARS}
          aria-disabled={pending || undefined}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50 aria-disabled:cursor-progress aria-disabled:opacity-70"
        >
          Ask
          <CornerDownLeft className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
