"use client";

/**
 * On-demand deep explanation of one clause, written by Gemini in the
 * reader's language. Fetched only when asked for — most clauses never need
 * it, and each explanation is a model call — and only once: asking again
 * (say, after filtering the clause list) shows the one already written.
 */

import { Check, ClipboardCopy, HelpCircle, Loader2, PenLine, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAi } from "@/components/ai/AiContext";
import { GeminiBadge } from "@/components/ai/GeminiBadge";
import type { ClauseExplanation } from "@/lib/ai/explain";
import { languageAttributes, type LanguageCode } from "@/lib/ai/languages";
import { useCopy, useLatestRequest } from "@/lib/client/hooks";

export function ClauseExplainer({ clauseId }: { clauseId: string }) {
  const { configured, session, language } = useAi();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ explanation: ClauseExplanation; language: LanguageCode } | null>(null);
  const { copied, copy } = useCopy();
  const nextSignal = useLatestRequest();
  const regionRef = useRef<HTMLDivElement>(null);

  // The button that asked is replaced by the answer; hand focus to the
  // answer so keyboard and screen-reader users continue from there.
  useEffect(() => {
    if (result) regionRef.current?.focus({ preventScroll: true });
  }, [result]);

  if (!configured) return null;

  async function explain() {
    if (pending) return;
    setPending(true);
    setError(null);
    const asked = language;
    const response = await session.explain(clauseId, asked, nextSignal());
    if (!response.ok && response.aborted) return;
    setPending(false);
    if (response.ok) setResult({ explanation: response.data.explanation, language: asked });
    else setError(response.error);
  }

  if (!result) {
    return (
      <div className="print-hidden mt-3.5">
        <button
          type="button"
          onClick={explain}
          aria-disabled={pending || undefined}
          aria-describedby={error ? `${clauseId}-explain-error` : undefined}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary-soft to-accent-soft px-3 py-1.5 text-xs font-semibold text-primary-strong ring-1 ring-primary/20 transition-transform hover:scale-[1.02] aria-disabled:cursor-progress aria-disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
          {pending ? "Explaining…" : "Explain this clause simply"}
        </button>
        {error && (
          <p id={`${clauseId}-explain-error`} role="alert" className="mt-2 text-xs text-risk-high">
            {error}
          </p>
        )}
      </div>
    );
  }

  const { explanation } = result;
  const written = languageAttributes(result.language);
  return (
    <div
      ref={regionRef}
      tabIndex={-1}
      role="region"
      aria-label="Plain-words explanation"
      className="animate-fade-in-up mt-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 to-surface-raised p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">In plain words</p>
        <GeminiBadge />
      </div>
      <p {...written} className="mt-2 text-sm leading-relaxed">{explanation.plainMeaning}</p>
      <p className="mt-2 text-sm leading-relaxed">
        <span className="font-semibold">What it means for you: </span>
        <span {...written}>{explanation.whatItMeansForYou}</span>
      </p>

      {explanation.watchOutFor.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-risk-high">
            <TriangleAlert className="size-3.5" aria-hidden /> Watch out for
          </p>
          <ul {...written} className="mt-1 list-disc space-y-1 ps-5 text-sm leading-relaxed">
            {explanation.watchOutFor.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {explanation.questionsToAsk.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-strong">
            <HelpCircle className="size-3.5" aria-hidden /> Questions to ask
          </p>
          <ul {...written} className="mt-1 list-disc space-y-1 ps-5 text-sm leading-relaxed">
            {explanation.questionsToAsk.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {explanation.fairerWording && (
        <div className="mt-3 rounded-lg bg-surface-raised p-3 ring-1 ring-border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <PenLine className="size-3.5 text-accent-ink" aria-hidden /> A fairer wording you could propose
            </p>
            <button
              type="button"
              onClick={() => copy(explanation.fairerWording!)}
              className="print-hidden inline-flex min-h-6 items-center gap-1 rounded text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="size-3 text-ok" aria-hidden /> : <ClipboardCopy className="size-3" aria-hidden />}
              {copied ? "Copied" : "Copy wording"}
            </button>
            <span role="status" className="sr-only">
              {copied ? "Wording copied to the clipboard." : ""}
            </span>
          </div>
          {/* Written in the document's own language, to drop into it. */}
          <p className="mt-1.5 font-mono text-[12.5px] leading-relaxed">{explanation.fairerWording}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            A starting point for negotiation, not legal drafting — have important changes reviewed.
          </p>
        </div>
      )}
    </div>
  );
}
