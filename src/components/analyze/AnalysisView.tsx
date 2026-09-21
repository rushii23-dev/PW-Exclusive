"use client";

import {
  BookOpenText,
  CalendarClock,
  Check,
  ClipboardCopy,
  Coins,
  FileText,
  Percent,
  Printer,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AiBriefCard } from "@/components/analyze/AiBriefCard";
import { AskPanel } from "@/components/analyze/AskPanel";
import { ClauseCard } from "@/components/analyze/ClauseCard";
import { InconsistencyList } from "@/components/analyze/InconsistencyList";
import { OptionsPanel } from "@/components/analyze/OptionsPanel";
import { RiskMeter } from "@/components/RiskMeter";
import { Tabs } from "@/components/Tabs";
import type { AiBrief } from "@/lib/ai/brief";
import { toPlainText, type Analysis, type RiskLevel } from "@/lib/engine";
import { cn } from "@/lib/utils";

const ENTITY_ICON = {
  money: Coins,
  date: CalendarClock,
  duration: Timer,
  percentage: Percent,
} as const;

type RiskFilter = "all" | RiskLevel;

function ClausesTab({ analysis }: { analysis: Analysis }) {
  const [filter, setFilter] = useState<RiskFilter>("all");
  const clauses =
    filter === "all"
      ? analysis.clauses
      : analysis.clauses.filter((c) => c.risk === filter);

  const options: Array<{ id: RiskFilter; label: string; count: number }> = [
    { id: "all", label: "All clauses", count: analysis.clauses.length },
    { id: "high", label: "Needs attention", count: analysis.riskProfile.high },
    { id: "medium", label: "Read carefully", count: analysis.riskProfile.medium },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter clauses by risk">
        {options
          .filter((o) => o.count > 0)
          .map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={filter === o.id}
              onClick={() => setFilter(o.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === o.id
                  ? "border-primary bg-primary-soft text-primary-strong"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label} <span className="tabular">({o.count})</span>
            </button>
          ))}
      </div>
      <div className="mt-4 space-y-4">
        {clauses.map((clause) => (
          <ClauseCard key={clause.id} clause={clause} />
        ))}
        {clauses.length === 0 && (
          <p className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
            No clauses match this filter.
          </p>
        )}
      </div>
    </div>
  );
}

function ActionPlanTab({ analysis }: { analysis: Analysis }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(toPlainText(analysis));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context); the
      // print path still works.
    }
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="checklist-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="checklist-heading" className="font-sans text-base font-semibold">
            Before you sign
          </h3>
          <div className="print-hidden flex gap-2">
            <button
              type="button"
              onClick={copyAll}
              className="elev-xs inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold transition-colors hover:border-border-strong hover:bg-muted"
            >
              {copied ? (
                <Check className="size-3.5 text-ok" aria-hidden />
              ) : (
                <ClipboardCopy className="size-3.5" aria-hidden />
              )}
              {copied ? "Copied" : "Copy as text"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="elev-xs inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold transition-colors hover:border-border-strong hover:bg-muted"
            >
              <Printer className="size-3.5" aria-hidden />
              Print / save PDF
            </button>
          </div>
        </div>
        {analysis.checklist.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">
            Nothing was flagged that needs preparation — still worth a careful
            read of the clauses tab.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {analysis.checklist.map((item, i) => (
              <li key={item.text}>
                <label
                  className={cn(
                    "elev-xs flex cursor-pointer gap-3 rounded-xl border border-border bg-surface-raised p-4 transition-opacity hover:border-border-strong",
                    done.has(i) && "opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={done.has(i)}
                    onChange={() =>
                      setDone((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className="text-sm leading-relaxed">
                    <span className={cn(done.has(i) && "line-through")}>{item.text}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Because of: {item.because}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="lawyer-heading">
        <h3 id="lawyer-heading" className="font-sans text-base font-semibold">
          Questions for a legal professional
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Take these to a consultation so the paid minutes go where they matter.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {analysis.lawyerQuestions.map((q) => (
            <li key={q} className="pl-1">
              {q}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function FactsTab({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-8">
      {analysis.keyFacts.length > 0 && (
        <section aria-labelledby="facts-heading">
          <h3 id="facts-heading" className="font-sans text-base font-semibold">
            Amounts, dates and periods found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Extracted exactly as written — verify each against what you were told.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {analysis.keyFacts.map((fact) => {
              const Icon = ENTITY_ICON[fact.kind];
              return (
                <li
                  key={`${fact.kind}-${fact.text}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium"
                >
                  <Icon className="size-3.5 text-primary-strong" aria-hidden />
                  <span className="sr-only">{fact.kind}: </span>
                  {fact.text}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {analysis.yourObligations.length > 0 && (
        <section aria-labelledby="obligations-heading">
          <h3 id="obligations-heading" className="font-sans text-base font-semibold">
            What this document requires of you
          </h3>
          <ul className="mt-3 space-y-2">
            {analysis.yourObligations.map((o) => (
              <li
                key={o.text}
                className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed"
              >
                {o.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.glossary.length > 0 && (
        <section aria-labelledby="glossary-heading">
          <h3 id="glossary-heading" className="font-sans text-base font-semibold">
            Jargon used in this document
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {analysis.glossary.map((j) => (
              <div key={j.term} className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-sm font-semibold capitalize">{j.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {j.definition}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

export function AnalysisView({
  analysis,
  aiBrief,
  aiCheckedContradictions,
}: {
  analysis: Analysis;
  aiBrief: AiBrief | null;
  /** Whether Gemini completed its contradiction read, so the "none found" note is truthful. */
  aiCheckedContradictions: boolean;
}) {
  const stats = useMemo(
    () => [
      { label: "words", value: analysis.readability.wordCount.toLocaleString() },
      { label: "min read", value: String(analysis.readability.readingTimeMinutes) },
      { label: "clauses", value: String(analysis.clauses.length) },
      { label: "reading level", value: analysis.readability.band },
    ],
    [analysis],
  );

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <section
        aria-labelledby="result-heading"
        className="sheet rounded-2xl border border-border p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="size-3.5" aria-hidden />
              Detected document type
            </p>
            <h2 id="result-heading" className="mt-1 text-2xl font-semibold sm:text-3xl">
              {analysis.documentTypeLabel}
            </h2>
          </div>
          <dl className="flex gap-5">
            {stats.map((s) => (
              <div key={s.label} className="text-right">
                <dd className="font-display text-xl font-semibold capitalize tabular">
                  {s.value}
                </dd>
                <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-5">
          <RiskMeter profile={analysis.riskProfile} total={analysis.clauses.length} />
        </div>
      </section>

      {/* ── Gemini brief ────────────────────────────────────────────── */}
      {aiBrief && <AiBriefCard brief={aiBrief} />}

      {/* ── Summary ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="summary-heading"
        className="sheet rounded-2xl border border-border p-6"
      >
        <h2 id="summary-heading" className="font-sans text-base font-semibold">
          In plain language
        </h2>
        <ul className="mt-3 space-y-2.5">
          {analysis.summary.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm leading-relaxed">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {line}
            </li>
          ))}
        </ul>

        {analysis.inconsistencies.length === 0 && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-ok-soft px-3 py-2 text-xs font-medium text-ok">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {aiCheckedContradictions
              ? "No contradictions found — checked by the rule engine and by Gemini."
              : "No contradictions found between clauses by the rule engine."}
          </p>
        )}
      </section>

      {/* ── Contradictions ──────────────────────────────────────────── */}
      <InconsistencyList items={analysis.inconsistencies} />

      {/* ── Detail tabs ─────────────────────────────────────────────── */}
      <Tabs
        tabs={[
          {
            id: "clauses",
            label: "Clauses",
            count: analysis.clauses.length,
            content: <ClausesTab analysis={analysis} />,
          },
          {
            id: "ask",
            label: "Ask the document",
            content: <AskPanel />,
          },
          {
            id: "options",
            label: "Your options",
            content: <OptionsPanel documentType={analysis.documentType} />,
          },
          {
            id: "plan",
            label: "Action plan",
            count: analysis.checklist.length,
            content: <ActionPlanTab analysis={analysis} />,
          },
          {
            id: "facts",
            label: "Key facts",
            count: analysis.keyFacts.length,
            content: <FactsTab analysis={analysis} />,
          },
        ]}
      />

      <p className="flex items-start gap-2 rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
        <BookOpenText className="mt-0.5 size-4 shrink-0" aria-hidden />
        This analysis is information, not legal advice. It detects known
        patterns and can miss clauses written in novel ways; a clean report is
        not a verdict of fairness. For decisions that matter, take the action
        plan to a qualified professional.
      </p>
    </div>
  );
}
