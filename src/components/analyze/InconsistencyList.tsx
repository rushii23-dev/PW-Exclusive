import { GitCompareArrows, Quote } from "lucide-react";

import { EngineBadge, GeminiBadge } from "@/components/ai/GeminiBadge";
import { languageAttributes, type LanguageCode } from "@/lib/ai/languages";
import type { Inconsistency } from "@/lib/engine";

/**
 * Places where the document disagrees with itself. Each one quotes every
 * side of the conflict, so the reader can check it against the paper.
 */
export function InconsistencyList({
  items,
  aiLanguage = "en",
}: {
  items: Inconsistency[];
  /** Language Gemini wrote its findings in; the engine's are English. */
  aiLanguage?: LanguageCode;
}) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="inconsistencies-heading"
      className="rounded-2xl border border-risk-medium/40 bg-risk-medium-soft/60 p-6 elev-sm"
    >
      <h2
        id="inconsistencies-heading"
        className="flex items-center gap-2 font-sans text-base font-semibold"
      >
        <GitCompareArrows className="size-5 text-risk-medium" aria-hidden />
        The document contradicts itself{" "}
        <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-bold text-risk-medium ring-1 ring-risk-medium/40 tabular">
          <span className="sr-only">(</span>
          {items.length}
          <span className="sr-only">&nbsp;found)</span>
        </span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        When two clauses disagree, nobody can be sure which one will be relied on. Ask for each of
        these to be fixed in writing before you sign.
      </p>

      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const written = item.source === "ai" ? languageAttributes(aiLanguage) : {};
          return (
            <li key={item.id} className="print-atomic rounded-xl bg-surface-raised p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-center gap-2">
                <p {...written} className="text-sm font-semibold">
                  {item.title}
                </p>
                {item.source === "ai" ? <GeminiBadge label="Found by Gemini" /> : <EngineBadge />}
              </div>
              <p {...written} className="mt-1.5 text-sm leading-relaxed">
                {item.explanation}
              </p>
              <ul className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3">
                {item.evidence.map((e) => (
                  <li key={`${e.clauseId}-${e.quote}`} className="flex gap-2 text-xs text-muted-foreground">
                    <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold text-foreground">
                        {e.heading ?? e.clauseId.replace("clause-", "Clause ")}:
                      </span>{" "}
                      <q className="italic">{e.quote}</q>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
