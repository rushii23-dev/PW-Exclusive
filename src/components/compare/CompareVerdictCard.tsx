import { HelpCircle, ThumbsUp, TriangleAlert } from "lucide-react";

import { GeminiBadge } from "@/components/ai/GeminiBadge";
import type { CompareVerdict } from "@/lib/ai/compare";

function Column({ title, items, tone }: { title: string; items: string[]; tone: "a" | "b" }) {
  return (
    <div className="rounded-xl bg-surface-raised/85 p-4 ring-1 ring-border">
      <p
        className={
          tone === "a"
            ? "flex items-center gap-1.5 text-sm font-semibold text-accent-ink"
            : "flex items-center gap-1.5 text-sm font-semibold text-primary-strong"
        }
      >
        <ThumbsUp className="size-4" aria-hidden />
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nothing clearly better here.</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {items.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Gemini's reading of the structured comparison, from the reader's side. */
export function CompareVerdictCard({ verdict }: { verdict: CompareVerdict }) {
  return (
    <section
      aria-labelledby="ai-verdict-heading"
      className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-soft via-surface-raised to-accent-soft p-6 elev-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ai-verdict-heading" className="font-sans text-base font-semibold">
          What the difference means for you
        </h2>
        <GeminiBadge />
      </div>
      <p className="mt-3 text-[15px] leading-relaxed">{verdict.overview}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Column title="Where Document A is better for you" items={verdict.betterInA} tone="a" />
        <Column title="Where Document B is better for you" items={verdict.betterInB} tone="b" />
      </div>

      {verdict.watchOut.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-risk-high">
            <TriangleAlert className="size-4" aria-hidden /> Watch out in both
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {verdict.watchOut.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {verdict.questionsToAsk.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <HelpCircle className="size-4 text-primary-strong" aria-hidden /> Ask before you choose
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {verdict.questionsToAsk.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Written by {verdict.model} from the side-by-side comparison below — information, not legal
        advice.
      </p>
    </section>
  );
}
