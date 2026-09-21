"use client";

import { FileUp, Loader2, ScanSearch, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AiProvider, useAiStatus, useLanguagePreference } from "@/components/ai/AiContext";
import { GeminiBadge } from "@/components/ai/GeminiBadge";
import { LanguagePicker } from "@/components/ai/LanguagePicker";
import { AnalysisView } from "@/components/analyze/AnalysisView";
import type { AiBrief } from "@/lib/ai/brief";
import { postJson } from "@/lib/client/api";
import { MAX_DOCUMENT_CHARS, type Analysis } from "@/lib/engine";
import { SAMPLES, type SampleDocument } from "@/lib/samples";
import { cn } from "@/lib/utils";

interface AnalyzeResponse {
  analysis: Analysis;
  ai: {
    available: boolean;
    used: boolean;
    brief: AiBrief | null;
    contradictionsChecked: boolean;
  };
}

/** Only ever read as text, capped well below the engine limit. */
const ACCEPTED_FILES = ".txt,.md,.text,text/plain,text/markdown";

export function Analyzer({
  initialSample,
}: {
  /** Resolved server-side from ?sample=, so server and client HTML agree. */
  initialSample: SampleDocument | null;
}) {
  const [text, setText] = useState(initialSample?.text ?? "");
  const aiStatus = useAiStatus();
  const [language, setLanguage] = useLanguagePreference();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const autoRan = useRef(false);

  const analyze = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || pending) return;
      setPending(true);
      setError(null);

      const result = await postJson<AnalyzeResponse>("/api/analyze", {
        text: trimmed,
        language,
      });
      setPending(false);
      if (!result.ok) {
        setError(result.error);
        setResult(null);
        return;
      }
      setResult(result.data);
      setAnalyzedText(trimmed);
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    },
    [pending, language],
  );

  // Deep link: /analyze?sample=rental runs the seeded sample immediately.
  useEffect(() => {
    if (autoRan.current || !initialSample) return;
    autoRan.current = true;
    void analyze(initialSample.text);
  }, [initialSample, analyze]);

  function onFileChosen(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_CHARS) {
      setError("That file is too large — the limit is about 200,000 characters.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      setText(String(reader.result ?? ""));
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  return (
    <AiProvider
      status={aiStatus}
      language={language}
      setLanguage={setLanguage}
      documentText={analyzedText}
    >
    <div className="space-y-8">
      <section aria-labelledby="input-heading" className="sheet rounded-2xl border border-border p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="input-heading" className="flex items-center gap-2 font-sans text-base font-semibold">
            Your document
            {aiStatus.configured && <GeminiBadge label="Gemini on" />}
          </h2>
          <p className="text-xs text-muted-foreground">
            Processed in memory, never stored.
          </p>
        </div>

        <label htmlFor="document-input" className="sr-only">
          Paste the document text
        </label>
        <textarea
          id="document-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_DOCUMENT_CHARS}
          rows={12}
          placeholder="Paste a lease, contract, offer letter or terms of service here…"
          className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed shadow-inner placeholder:font-sans placeholder:text-muted-foreground/70"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span aria-live="polite" className="tabular">
            {text.length.toLocaleString()} / {MAX_DOCUMENT_CHARS.toLocaleString()} characters
          </span>
          {text.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setText("");
                setResult(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1 font-semibold hover:text-foreground"
            >
              <Trash2 className="size-3.5" aria-hidden /> Clear
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => analyze(text)}
            disabled={pending || text.trim().length === 0}
            className="glow-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ScanSearch className="size-4" aria-hidden />
            )}
            {pending ? "Analysing…" : "Analyze document"}
          </button>

          <label className="elev-xs inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium transition-colors hover:border-border-strong hover:bg-muted">
            <FileUp className="size-4" aria-hidden />
            Upload .txt / .md
            <input
              type="file"
              accept={ACCEPTED_FILES}
              className="sr-only"
              onChange={(e) => {
                onFileChosen(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>

          {aiStatus.configured && (
            <LanguagePicker value={language} onChange={setLanguage} className="sm:ml-auto" />
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Or try a sample
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <li key={sample.id}>
                <button
                  type="button"
                  onClick={() => {
                    setText(sample.text);
                    setError(null);
                    void analyze(sample.text);
                  }}
                  title={sample.description}
                  className={cn(
                    "rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium",
                    "transition-colors hover:border-primary hover:text-primary-strong",
                  )}
                >
                  {sample.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-risk-high-soft p-4 text-sm text-risk-high">
            {error}
          </p>
        )}
      </section>

      <div ref={resultRef} aria-live="polite">
        {pending && !result && (
          <div className="space-y-4" aria-label="Analysing the document">
            <div className="skeleton h-36 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-56 w-full" />
          </div>
        )}
        {result && (
          <AnalysisView
            analysis={result.analysis}
            aiBrief={result.ai.brief}
            aiCheckedContradictions={result.ai.contradictionsChecked}
          />
        )}
      </div>
    </div>
    </AiProvider>
  );
}
