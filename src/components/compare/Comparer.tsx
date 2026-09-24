"use client";

import { Check, Loader2, Minus, Scale } from "lucide-react";
import { useRef, useState, type Ref } from "react";

import { useAiStatus, useLanguagePreference } from "@/components/ai/AiContext";
import { GeminiBadge } from "@/components/ai/GeminiBadge";
import { LanguagePicker } from "@/components/ai/LanguagePicker";
import { CompareVerdictCard } from "@/components/compare/CompareVerdictCard";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskMeter } from "@/components/RiskMeter";
import type { CompareVerdict } from "@/lib/ai/compare";
import type { LanguageCode } from "@/lib/ai/languages";
import { postJson } from "@/lib/client/api";
import { revealAndFocus, useLatestRequest } from "@/lib/client/hooks";
import { formatCount, type Analysis, type Comparison } from "@/lib/engine";
import { MAX_DOCUMENT_CHARS } from "@/lib/limits";
import { SAMPLES } from "@/lib/samples";
import { cn } from "@/lib/utils";

interface CompareResponse {
  a: Analysis;
  b: Analysis;
  comparison: Comparison;
  ai: { available: boolean; used: boolean; verdict: CompareVerdict | null };
}

function DocumentInput({
  slot,
  value,
  onChange,
}: {
  slot: "A" | "B";
  value: string;
  onChange: (text: string) => void;
}) {
  const inputId = `doc-${slot}`;
  return (
    <div className="sheet flex-1 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold">
          Document {slot}
        </label>
        <label className="sr-only" htmlFor={`${inputId}-sample`}>
          Load a sample into document {slot}
        </label>
        <select
          id={`${inputId}-sample`}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          value=""
          onChange={(e) => {
            const sample = SAMPLES.find((s) => s.id === e.target.value);
            if (sample) onChange(sample.text);
          }}
        >
          <option value="" disabled>
            Load a sample…
          </option>
          {SAMPLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <textarea
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_DOCUMENT_CHARS}
        rows={9}
        placeholder={`Paste document ${slot} here…`}
        className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-3.5 font-mono text-[13px] leading-relaxed shadow-inner placeholder:font-sans placeholder:text-muted-foreground"
      />
    </div>
  );
}

const PRESENCE_STYLE = {
  a: "bg-accent-soft text-accent-ink",
  b: "bg-primary-soft text-primary-strong",
  both: "bg-muted text-muted-foreground",
} as const;

const PRESENCE_LABEL = { a: "Only in A", b: "Only in B", both: "In both" } as const;

export function Comparer() {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: CompareResponse; language: LanguageCode } | null>(null);
  const [status, setStatus] = useState("");
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const aiStatus = useAiStatus();
  const [language, setLanguage] = useLanguagePreference();
  const nextSignal = useLatestRequest();

  async function compare() {
    if (pending) return;
    setPending(true);
    setError(null);
    setStatus("Comparing the documents…");
    const asked = language;
    const res = await postJson<CompareResponse>(
      "/api/compare",
      { textA: textA.trim(), textB: textB.trim(), language: asked },
      { signal: nextSignal() },
    );
    if (!res.ok && res.aborted) return;
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      setStatus("");
      setResult(null);
      return;
    }
    setResult({ data: res.data, language: asked });
    setStatus(`Comparison ready. ${res.data.comparison.verdicts[0] ?? ""}`);
    requestAnimationFrame(() => revealAndFocus(resultHeadingRef.current));
  }

  return (
    <div className="space-y-8">
      <section aria-label="Documents to compare" className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <DocumentInput slot="A" value={textA} onChange={setTextA} />
          <DocumentInput slot="B" value={textB} onChange={setTextB} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={compare}
            disabled={!textA.trim() || !textB.trim()}
            aria-disabled={pending || undefined}
            className="glow-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100 aria-disabled:cursor-progress aria-disabled:opacity-70"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Scale className="size-4" aria-hidden />
            )}
            {pending ? "Comparing…" : "Compare documents"}
          </button>
          {aiStatus.configured && <GeminiBadge label="Gemini on" />}
          {aiStatus.configured && (
            <LanguagePicker
              id="compare-language"
              value={language}
              onChange={setLanguage}
              className="sm:ml-auto"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Try the freelance agreement against the employment contract to see how two ways of
          being paid for work differ.
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-risk-high-soft p-4 text-sm text-risk-high">
            {error}
          </p>
        )}
      </section>

      <p role="status" className="sr-only">
        {status}
      </p>

      <div aria-busy={pending}>
        {pending && !result && (
          <div className="space-y-4">
            <div aria-hidden className="skeleton h-28 w-full" />
            <div aria-hidden className="skeleton h-64 w-full" />
          </div>
        )}

        {result && (
          <ComparisonView data={result.data} language={result.language} headingRef={resultHeadingRef} />
        )}
      </div>
    </div>
  );
}

function ComparisonView({
  data: result,
  language,
  headingRef,
}: {
  data: CompareResponse;
  language: LanguageCode;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="animate-fade-in-up space-y-6">
      {result.ai.verdict && <CompareVerdictCard verdict={result.ai.verdict} language={language} />}

      {/* ── Verdicts ────────────────────────────────────────── */}
      <section
        aria-labelledby="verdict-heading"
        className="sheet rounded-2xl border border-border p-6"
      >
        <h2
          id="verdict-heading"
          ref={headingRef}
          tabIndex={-1}
          className="scroll-mt-24 font-sans text-base font-semibold focus:outline-none"
        >
          The comparison in short
        </h2>
        <ul className="mt-3 space-y-2.5">
          {result.comparison.verdicts.map((v) => (
            <li key={v} className="flex gap-2.5 text-sm leading-relaxed">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {v}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Side-by-side profiles ───────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["A", result.a],
            ["B", result.b],
          ] as const
        ).map(([slot, analysis]) => (
          <section
            key={slot}
            aria-label={`Document ${slot} profile`}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Document {slot}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{analysis.documentTypeLabel}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCount(analysis.readability.wordCount)} words · reading
              level: {analysis.readability.band}
            </p>
            <div className="mt-4">
              <RiskMeter
                profile={analysis.riskProfile}
                total={analysis.clauses.length}
              />
            </div>
          </section>
        ))}
      </div>

      {/* ── Findings diff ───────────────────────────────────── */}
      <section
        aria-labelledby="diff-heading"
        className="sheet rounded-2xl border border-border p-6"
      >
        <h2 id="diff-heading" className="font-sans text-base font-semibold">
          Flags, side by side
        </h2>
        <ul className="mt-4 space-y-2.5">
          {result.comparison.findings.map((f) => (
            <li
              key={f.label}
              className="flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-xl border border-border p-3.5"
            >
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                  PRESENCE_STYLE[f.presence],
                )}
              >
                {PRESENCE_LABEL[f.presence]}
              </span>
              <RiskBadge level={f.level} />
              <span className="w-full text-sm sm:w-auto sm:flex-1">
                <span className="font-semibold">{f.label}.</span>{" "}
                <span className="text-muted-foreground">{f.explanation}</span>
              </span>
            </li>
          ))}
          {result.comparison.findings.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Neither document triggered any flags.
            </li>
          )}
        </ul>
      </section>

      {/* ── Coverage matrix ─────────────────────────────────── */}
      <section
        aria-labelledby="coverage-heading"
        className="overflow-hidden rounded-2xl border border-border bg-surface"
      >
        <h2 id="coverage-heading" className="px-6 pt-6 font-sans text-base font-semibold">
          Topic coverage
        </h2>
        <p className="px-6 pt-1 text-xs text-muted-foreground">
          Where one document is silent, default law — or the other side —
          fills the gap.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-6 py-2.5 font-semibold">
                  Topic
                </th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold">
                  Document A
                </th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold">
                  Document B
                </th>
              </tr>
            </thead>
            <tbody>
              {result.comparison.categories.map((row) => (
                <tr key={row.category} className="border-t border-border">
                  <th scope="row" className="px-6 py-2.5 text-left font-medium">
                    {row.label}
                  </th>
                  {(
                    [
                      [row.inA, row.riskA],
                      [row.inB, row.riskB],
                    ] as const
                  ).map(([present, risk], i) => (
                    <td key={i} className="px-4 py-2.5 text-center">
                      {present ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="size-4 text-ok" aria-hidden />
                          <span className="sr-only">covered</span>
                          {risk && <RiskBadge level={risk} />}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Minus className="size-4" aria-hidden />
                          <span className="text-xs">not covered</span>
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Numbers ─────────────────────────────────────────── */}
      {result.comparison.numbers.length > 0 && (
        <section
          aria-labelledby="numbers-heading"
          className="sheet rounded-2xl border border-border p-6"
        >
          <h2 id="numbers-heading" className="font-sans text-base font-semibold">
            The numbers, extracted
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {result.comparison.numbers.map((n) => (
              <div key={n.kind} className="rounded-xl border border-border p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {n.kind === "duration" ? "Time periods" : n.kind === "money" ? "Amounts" : "Percentages"}
                </p>
                <dl className="mt-2.5 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Document A</dt>
                    <dd>{n.valuesA.length > 0 ? n.valuesA.join(" · ") : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Document B</dt>
                    <dd>{n.valuesB.length > 0 ? n.valuesB.join(" · ") : "—"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
