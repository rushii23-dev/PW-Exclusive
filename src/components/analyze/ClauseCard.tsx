"use client";

import { ChevronDown, Lightbulb, Quote } from "lucide-react";
import { useState } from "react";

import { ClauseExplainer } from "@/components/analyze/ClauseExplainer";
import { RiskBadge } from "@/components/RiskBadge";
import { CATEGORY_LABELS, type Clause } from "@/lib/engine/client";
import { cn } from "@/lib/utils";

const PREVIEW_CHARS = 420;

export function ClauseCard({ clause }: { clause: Clause }) {
  const [expanded, setExpanded] = useState(false);
  const needsExpand = clause.text.length > PREVIEW_CHARS;
  const shown =
    expanded || !needsExpand ? clause.text : `${clause.text.slice(0, PREVIEW_CHARS)}…`;

  return (
    <article
      className={cn(
        "print-atomic elev-xs rounded-2xl border bg-surface-raised p-5 transition-shadow hover:elev-sm",
        // A long contract renders hundreds of cards; let the browser skip
        // laying out the ones far off screen (they stay in the a11y tree).
        "[contain-intrinsic-size:auto_16rem] [content-visibility:auto]",
        clause.risk === "high" ? "border-risk-high/40" : "border-border",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-sans text-sm font-semibold">
          <span className="mr-2 text-muted-foreground tabular">{clause.index + 1}.</span>
          {clause.heading ?? "Untitled clause"}
        </h3>
        {clause.risk && <RiskBadge level={clause.risk} />}
        <span className="flex flex-wrap gap-1.5">
          {clause.categories
            .filter((c) => c !== "general")
            .map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
        </span>
      </header>

      <p
        id={`${clause.id}-text`}
        className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
      >
        {shown}
      </p>
      {needsExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`${clause.id}-text`}
          className="mt-1.5 inline-flex min-h-6 items-center gap-1 rounded text-xs font-semibold text-primary-strong hover:underline"
        >
          {expanded ? "Show less" : "Show the full clause"}
          <ChevronDown
            className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </button>
      )}

      {clause.findings.length > 0 && (
        <ul className="mt-4 space-y-3">
          {clause.findings.map((finding) => (
            <li
              key={finding.ruleId}
              className={cn(
                "rounded-xl p-4 text-sm",
                finding.level === "high"
                  ? "bg-risk-high-soft"
                  : finding.level === "medium"
                    ? "bg-risk-medium-soft"
                    : "bg-risk-low-soft",
              )}
            >
              <p className="font-semibold">{finding.label}</p>
              <p className="mt-1 leading-relaxed">{finding.explanation}</p>
              <p className="mt-2 flex gap-2 leading-relaxed">
                <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{finding.advice}</span>
              </p>
              <p className="mt-2.5 flex gap-2 border-t border-foreground/10 pt-2.5 text-xs italic opacity-80">
                <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <span className="sr-only">Triggered by the words: </span>
                  <q>{finding.evidence}</q>
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {clause.jargon.length > 0 && (
        <details className="mt-3.5 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
            Jargon in this clause ({clause.jargon.length})
          </summary>
          <dl className="mt-2 space-y-2 border-l-2 border-border pl-3">
            {clause.jargon.map((j) => (
              <div key={j.term}>
                <dt className="text-xs font-semibold capitalize">{j.term}</dt>
                <dd className="text-xs leading-relaxed text-muted-foreground">
                  {j.definition}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <ClauseExplainer clauseId={clause.id} />
    </article>
  );
}
