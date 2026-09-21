"use client";

/**
 * On-demand deep explanation of one clause, written by Gemini in the
 * reader's language. Fetched only when asked for — most clauses never need
 * it, and each explanation is a model call.
 */

import { Check, ClipboardCopy, HelpCircle, Loader2, PenLine, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { useAi } from "@/components/ai/AiContext";
import { GeminiBadge } from "@/components/ai/GeminiBadge";
import type { ClauseExplanation } from "@/lib/ai/explain";
import { postJson } from "@/lib/client/api";

export function ClauseExplainer({ clauseId }: { clauseId: string }) {
  const { configured, documentText, language } = useAi();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ClauseExplanation | null>(null);
  const [copied, setCopied] = useState(false);

  if (!configured) return null;

  async function explain() {
    setPending(true);
    setError(null);
    const result = await postJson<{ explanation: ClauseExplanation }>("/api/explain", {
      text: documentText,
      clauseId,
      language,
    });
    setPending(false);
    if (result.ok) setExplanation(result.data.explanation);
    else setError(result.error);
  }

  async function copyWording(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; the text is on screen to copy by hand.
    }
  }

  if (!explanation) {
    return (
      <div className="print-hidden mt-3.5">
        <button
          type="button"
          onClick={explain}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary-soft to-accent-soft px-3 py-1.5 text-xs font-semibold text-primary-strong ring-1 ring-primary/20 transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}
          {pending ? "Explaining…" : "Explain this clause simply"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-xs text-risk-high">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up mt-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 to-surface-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">In plain words</p>
        <GeminiBadge />
      </div>
      <p className="mt-2 text-sm leading-relaxed">{explanation.plainMeaning}</p>
      <p className="mt-2 text-sm leading-relaxed">
        <span className="font-semibold">What it means for you: </span>
        {explanation.whatItMeansForYou}
      </p>

      {explanation.watchOutFor.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-risk-high">
            <TriangleAlert className="size-3.5" aria-hidden /> Watch out for
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed">
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
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed">
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
              onClick={() => copyWording(explanation.fairerWording!)}
              className="print-hidden inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="size-3 text-ok" aria-hidden /> : <ClipboardCopy className="size-3" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[12.5px] leading-relaxed">{explanation.fairerWording}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            A starting point for negotiation, not legal drafting — have important changes reviewed.
          </p>
        </div>
      )}
    </div>
  );
}
