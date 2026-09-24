import { AlertTriangle, ListChecks } from "lucide-react";

import { GeminiBadge } from "@/components/ai/GeminiBadge";
import type { AiBrief } from "@/lib/ai/brief";
import { languageAttributes, type LanguageCode } from "@/lib/ai/languages";

/** Gemini's plain-language brief, built from the engine's findings only. */
export function AiBriefCard({ brief, language = "en" }: { brief: AiBrief; language?: LanguageCode }) {
  // The page's own labels stay English; everything Gemini wrote is marked
  // with its language so it is read aloud, and laid out, correctly.
  const written = languageAttributes(language);
  return (
    <section
      aria-labelledby="brief-heading"
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-soft via-surface-raised to-accent-soft p-6 elev-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">Your brief</p>
        <GeminiBadge />
      </div>
      <h2 id="brief-heading" {...written} className="mt-2 text-xl font-semibold leading-snug sm:text-2xl">
        {brief.headline}
      </h2>
      <div {...written} className="mt-3 space-y-2.5 text-[15px] leading-relaxed">
        {brief.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      {brief.topConcerns.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 font-sans text-sm font-semibold">
            <AlertTriangle className="size-4 text-risk-high" aria-hidden />
            What matters most
          </h3>
          <ul {...written} className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
            {brief.topConcerns.map((c) => (
              <li key={c.title} className="rounded-xl bg-surface-raised/80 p-3.5 ring-1 ring-border">
                <p className="text-sm font-semibold">{c.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.beforeYouSign.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 font-sans text-sm font-semibold">
            <ListChecks className="size-4 text-primary-strong" aria-hidden />
            Before you sign
          </h3>
          <ol {...written} className="mt-2 list-decimal space-y-1.5 ps-5 text-sm leading-relaxed">
            {brief.beforeYouSign.map((s) => (
              <li key={s} className="ps-1">
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
        Written by {brief.model} from the rule engine&rsquo;s findings — it can explain them but
        was not allowed to add risks of its own. Information, not legal advice.
      </p>
    </section>
  );
}
