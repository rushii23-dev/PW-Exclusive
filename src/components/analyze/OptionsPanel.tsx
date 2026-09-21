"use client";

/**
 * "What are my options?" The reader describes their situation in their own
 * words; Gemini lays out the routes the document gives them, what each one
 * costs, and what to do next — every option backed by quotes from the text.
 */

import { ArrowRight, Clock, Compass, Loader2, Quote, Scale } from "lucide-react";
import { useState } from "react";

import { useAi } from "@/components/ai/AiContext";
import { EngineBadge, GeminiBadge } from "@/components/ai/GeminiBadge";
import type { SituationGuide } from "@/lib/ai/options";
import { postJson } from "@/lib/client/api";
import type { DocumentType } from "@/lib/engine";
import { cn } from "@/lib/utils";

const SUGGESTIONS: Record<DocumentType | "default", string[]> = {
  "rental-agreement": [
    "I got a job in another city and need to move out in two months.",
    "The landlord wants to keep my whole deposit for normal wear and tear.",
    "The landlord says he is raising the rent next month.",
  ],
  "employment-contract": [
    "I have a better offer and want to resign as soon as possible.",
    "My employer wants to cut my salary for a late project.",
    "I want to start a side business in a different field.",
  ],
  nda: [
    "I want to mention this project in my portfolio.",
    "A former colleague asked me about the other company's plans.",
  ],
  "service-agreement": [
    "The client stopped paying after I delivered half the work.",
    "The client wants a lot of extra work at no extra cost.",
  ],
  "terms-of-service": [
    "I want to cancel my subscription and get a refund.",
    "They closed my account without warning.",
  ],
  "loan-agreement": [
    "I will miss next month's payment.",
    "I want to repay the whole loan early.",
  ],
  "general-contract": [
    "I want to get out of this agreement early.",
    "The other side hasn't done what they promised.",
  ],
  default: ["I want to get out of this agreement early."],
};

const URGENCY = {
  "act-now": { label: "Act now — there is a deadline", className: "bg-risk-high-soft text-risk-high" },
  soon: { label: "Act soon", className: "bg-risk-medium-soft text-risk-medium" },
  "no-rush": { label: "No immediate deadline", className: "bg-ok-soft text-ok" },
} as const;

export function OptionsPanel({ documentType }: { documentType: DocumentType }) {
  const { documentText, language } = useAi();
  const [situation, setSituation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guide, setGuide] = useState<SituationGuide | null>(null);

  async function run(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 8 || pending) return;
    setSituation(trimmed);
    setPending(true);
    setError(null);
    const result = await postJson<{ guide: SituationGuide }>("/api/options", {
      text: documentText,
      situation: trimmed,
      language,
    });
    setPending(false);
    if (result.ok) setGuide(result.data.guide);
    else {
      setGuide(null);
      setError(result.error);
    }
  }

  const suggestions = SUGGESTIONS[documentType] ?? SUGGESTIONS.default;

  return (
    <div className="space-y-5">
      <form
        className="sheet rounded-2xl border border-border p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void run(situation);
        }}
      >
        <label htmlFor="situation-input" className="flex items-center gap-2 font-sans text-base font-semibold">
          <Compass className="size-5 text-primary-strong" aria-hidden />
          Describe your situation
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          In your own words. You&rsquo;ll get the routes this document gives you, what each one
          costs, and what to do next.
        </p>
        <textarea
          id="situation-input"
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="e.g. I need to move out three months early because of a job transfer."
          className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3.5 text-sm leading-relaxed shadow-inner placeholder:text-muted-foreground/70 focus:border-border-strong"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || situation.trim().length < 8}
            className="glow-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Scale className="size-4" aria-hidden />}
            {pending ? "Working it out…" : "Show my options"}
          </button>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Example situations">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => void run(s)}
                disabled={pending}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </form>

      <div aria-live="polite">
        {pending && (
          <div className="space-y-3" aria-label="Working out your options">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-32 w-full" />
          </div>
        )}

        {error && !pending && (
          <p role="alert" className="rounded-xl bg-risk-high-soft p-4 text-sm text-risk-high">
            {error}
          </p>
        )}

        {guide && !pending && <GuideView guide={guide} />}
      </div>
    </div>
  );
}

function GuideView({ guide }: { guide: SituationGuide }) {
  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="sheet rounded-2xl border border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          {guide.source === "ai" ? <GeminiBadge /> : <EngineBadge />}
          {guide.urgency && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                URGENCY[guide.urgency].className,
              )}
            >
              <Clock className="size-3" aria-hidden />
              {URGENCY[guide.urgency].label}
            </span>
          )}
        </div>
        <p className="mt-3 text-[15px] leading-relaxed">{guide.summary}</p>
      </div>

      {guide.options.length > 0 && (
        <section aria-labelledby="options-heading">
          <h3 id="options-heading" className="font-sans text-base font-semibold">
            Your options under this document
          </h3>
          <ol className="mt-3 grid gap-3 md:grid-cols-2">
            {guide.options.map((o, i) => (
              <li key={o.title} className="lift sheet flex flex-col rounded-2xl border border-border p-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs text-primary-strong tabular">
                    {i + 1}
                  </span>
                  {o.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{o.whatHappens}</p>
                {o.costsAndRisks && (
                  <p className="mt-2 rounded-lg bg-risk-medium-soft/70 p-2.5 text-xs leading-relaxed">
                    <span className="font-semibold">Cost or risk: </span>
                    {o.costsAndRisks}
                  </p>
                )}
                <ul className="mt-4 space-y-1.5 border-t border-dashed border-border pt-3">
                  {o.support.map((s) => (
                    <li key={`${s.clauseId}-${s.quote}`} className="flex gap-1.5 text-xs text-muted-foreground">
                      <Quote className="mt-0.5 size-3 shrink-0" aria-hidden />
                      <span>
                        <span className="font-semibold text-foreground">
                          {s.heading ?? s.clauseId.replace("clause-", "Clause ")}:
                        </span>{" "}
                        <span className="italic">“{s.quote}”</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {guide.nextSteps.length > 0 && (
          <section aria-labelledby="next-steps-heading" className="sheet rounded-2xl border border-border p-5">
            <h3 id="next-steps-heading" className="font-sans text-sm font-semibold">
              Next steps
            </h3>
            <ol className="mt-2.5 space-y-2">
              {guide.nextSteps.map((s) => (
                <li key={s} className="flex gap-2 text-sm leading-relaxed">
                  <ArrowRight className="mt-1 size-3.5 shrink-0 text-primary" aria-hidden />
                  {s}
                </li>
              ))}
            </ol>
          </section>
        )}
        {guide.questionsForProfessional.length > 0 && (
          <section aria-labelledby="pro-questions-heading" className="sheet rounded-2xl border border-border p-5">
            <h3 id="pro-questions-heading" className="font-sans text-sm font-semibold">
              Ask a legal professional
            </h3>
            <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              {guide.questionsForProfessional.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        These are the options the document itself sets out — information, not legal advice. The law
        where you live can give you rights the document doesn&rsquo;t mention; a legal aid service
        or lawyer can confirm what applies to you.
      </p>
    </div>
  );
}
