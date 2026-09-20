"use client";

/**
 * Document Q&A. Stateless by design: each question re-sends the document,
 * so the server holds nothing between requests. Answers always quote their
 * clause, and "the document doesn't say" is rendered as a first-class answer.
 */

import { CornerDownLeft, MessageCircleQuestion } from "lucide-react";
import { useRef, useState } from "react";

import type { Answer } from "@/lib/engine";

interface Exchange {
  question: string;
  answer: Answer | null;
  error?: string;
}

const SUGGESTED = [
  "What happens if I want to leave early?",
  "When do I get my deposit back?",
  "Can they change the terms later?",
  "What am I not allowed to do?",
];

export function AskPanel({ documentText }: { documentText: string }) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setQuestion("");
    setExchanges((prev) => [...prev, { question: trimmed, answer: null }]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: documentText, question: trimmed }),
      });
      const json = await res.json();
      setExchanges((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (res.ok) {
          next[next.length - 1] = { ...last, answer: json.answer };
        } else {
          next[next.length - 1] = {
            ...last,
            error: json?.error?.message ?? "Something went wrong. Please try again.",
          };
        }
        return next;
      });
    } catch {
      setExchanges((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          error: "Could not reach the server. Please try again.",
        };
        return next;
      });
    } finally {
      setPending(false);
      // Bring the new answer into view without stealing focus.
      requestAnimationFrame(() =>
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }),
      );
    }
  }

  return (
    <div className="sheet rounded-2xl border border-border">
      <div
        ref={logRef}
        aria-live="polite"
        className="max-h-[26rem] space-y-4 overflow-y-auto p-5"
      >
        {exchanges.length === 0 && (
          <div className="py-6 text-center">
            <MessageCircleQuestion
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Ask anything about this document. Answers are quoted from its own
              clauses — never invented.
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
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
              {exchange.question}
            </p>
            {exchange.answer === null && !exchange.error && (
              <p
                className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md border border-border px-4 py-3"
                aria-label="Finding the answer"
              >
                <span className="typing-dot size-1.5 rounded-full bg-primary" />
                <span className="typing-dot size-1.5 rounded-full bg-primary" />
                <span className="typing-dot size-1.5 rounded-full bg-primary" />
              </p>
            )}
            {exchange.error && (
              <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-risk-high-soft px-4 py-2.5 text-sm text-risk-high">
                {exchange.error}
              </p>
            )}
            {exchange.answer && (
              <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm leading-relaxed">
                <p>{exchange.answer.response}</p>
                {exchange.answer.citations.length > 0 && (
                  <div className="mt-3 border-t border-dashed border-border pt-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      From the document
                    </p>
                    <ul className="mt-1.5 space-y-1.5">
                      {exchange.answer.citations.map((c) => (
                        <li key={c.clauseId} className="text-xs text-muted-foreground">
                          <span className="font-semibold">
                            {c.heading ?? c.clauseId.replace("clause-", "Clause ")}:
                          </span>{" "}
                          <span className="italic">“{c.quote}”</span>
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

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label htmlFor="ask-input" className="sr-only">
          Ask a question about the document
        </label>
        <input
          id="ask-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="e.g. How much notice do I have to give?"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm shadow-inner transition-colors placeholder:text-muted-foreground/70 focus:border-border-strong"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || question.trim().length < 3}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          Ask
          <CornerDownLeft className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
