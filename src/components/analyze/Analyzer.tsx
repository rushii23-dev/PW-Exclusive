"use client";

import { FileUp, Loader2, ScanSearch, Trash2 } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

import { AiProvider, useAiStatus, useLanguagePreference } from "@/components/ai/AiContext";
import { GeminiBadge } from "@/components/ai/GeminiBadge";
import { LanguagePicker } from "@/components/ai/LanguagePicker";
import { AnalysisView } from "@/components/analyze/AnalysisView";
import type { AiBrief } from "@/lib/ai/brief";
import { languageName, type LanguageCode } from "@/lib/ai/languages";
import { postForm, postJson, type ApiResult } from "@/lib/client/api";
import { revealAndFocus, useLatestRequest } from "@/lib/client/hooks";
import { formatCount, type Analysis } from "@/lib/engine";
import { MAX_DOCUMENT_CHARS, MAX_UPLOAD_BYTES } from "@/lib/limits";
import { SAMPLES, type SampleDocument } from "@/lib/samples";
import type { Extraction } from "@/lib/server/extract";
import { cn } from "@/lib/utils";

export interface AnalyzeResponse {
  analysis: Analysis;
  ai: {
    available: boolean;
    used: boolean;
    brief: AiBrief | null;
    contradictionsChecked: boolean;
  };
}

/** Text files are read in the browser; everything else goes to /api/extract. */
const ACCEPTED_FILES =
  ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.heic,application/pdf,text/plain,text/markdown,image/*";

function describeExtraction(name: string, x: Extraction): string {
  const pages = x.pages ? ` (${x.pages} page${x.pages === 1 ? "" : "s"})` : "";
  const base =
    x.method === "gemini-vision"
      ? `Gemini read the text from ${name}${pages}. Check it against the original before analysing — photos and scans can be misread.`
      : `Read the text from ${name}${pages}. Review it, then analyse.`;
  return x.truncated ? `${base} The file was longer than one analysis allows, so only the first part is shown.` : base;
}

/** One sentence a screen reader can announce when results arrive. */
function describeResult(analysis: Analysis): string {
  const { high, medium } = analysis.riskProfile;
  const flags =
    high > 0
      ? `${high} clause${high === 1 ? " needs" : "s need"} attention`
      : medium > 0
        ? `${medium} clause${medium === 1 ? " is" : "s are"} worth reading carefully`
        : "no high-risk clauses were flagged";
  const conflicts = analysis.inconsistencies.length;
  return `Analysis ready: ${analysis.documentTypeLabel}, ${analysis.clauses.length} clauses; ${flags}${
    conflicts > 0 ? `; ${conflicts} contradiction${conflicts === 1 ? "" : "s"} found` : ""
  }.`;
}

export function Analyzer({
  initialSample,
}: {
  /** Resolved server-side from ?sample=, so server and client HTML agree. */
  initialSample: SampleDocument | null;
}) {
  const [text, setText] = useState(initialSample?.text ?? "");
  const aiStatus = useAiStatus();
  const [language, setLanguage] = useLanguagePreference();
  // A deep-linked sample is analysed on arrival, so the page starts busy.
  const [pending, setPending] = useState(Boolean(initialSample));
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState(initialSample ? "Analysing the document…" : "");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const [analyzedLanguage, setAnalyzedLanguage] = useState<LanguageCode>("en");
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextAnalyzeSignal = useLatestRequest();
  const nextUploadSignal = useLatestRequest();

  /** Put a finished analysis — or its failure — on the page. */
  const showResult = useCallback(
    (response: ApiResult<AnalyzeResponse>, trimmed: string, language: LanguageCode) => {
      if (!response.ok && response.aborted) return;
      setPending(false);
      if (!response.ok) {
        setError(response.error);
        setStatus("");
        setResult(null);
        return;
      }
      setResult(response.data);
      setAnalyzedText(trimmed);
      setAnalyzedLanguage(language);
      setStatus(describeResult(response.data.analysis));
      // Keyboard and screen-reader users land on the results, not at the
      // top of a page that has changed underneath them.
      requestAnimationFrame(() => revealAndFocus(resultHeadingRef.current));
    },
    [],
  );

  /** Ask for an analysis; the page changes only once the answer arrives. */
  const request = useCallback(
    (trimmed: string, language: LanguageCode) =>
      // A newer request (another sample, a language change) cancels any
      // analysis still in flight rather than racing it.
      postJson<AnalyzeResponse>("/api/analyze", { text: trimmed, language }, { signal: nextAnalyzeSignal() }).then(
        (response) => showResult(response, trimmed, language),
      ),
    [nextAnalyzeSignal, showResult],
  );

  const analyze = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      setPending(true);
      setError(null);
      setStatus("Analysing the document…");
      void request(trimmed, language);
    },
    [language, request],
  );

  // Deep link: /analyze?sample=rental runs the seeded sample immediately.
  // An effect event, so a later language change doesn't re-run the sample;
  // and no "already ran" guard, so if the effect is torn down and re-run
  // (React does exactly that in development) the cancelled request is
  // simply made again.
  const runInitialSample = useEffectEvent((sample: SampleDocument) => {
    void request(sample.text.trim(), language);
  });
  useEffect(() => {
    if (initialSample) runInitialSample(initialSample);
  }, [initialSample]);

  async function onFileChosen(file: File | undefined) {
    if (!file || reading) return;
    setError(null);
    setNotice(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That file is too large — the limit is 4 MB.");
      return;
    }

    // Plain text never needs to leave the browser.
    if (/\.(txt|md|text)$/i.test(file.name) || file.type.startsWith("text/")) {
      try {
        setText((await file.text()).slice(0, MAX_DOCUMENT_CHARS));
        setNotice(`Loaded ${file.name}. Review it, then analyse.`);
      } catch {
        setError("Could not read that file.");
      }
      return;
    }

    setReading(true);
    const form = new FormData();
    form.append("file", file);
    const response = await postForm<Extraction>("/api/extract", form, { signal: nextUploadSignal() });
    if (!response.ok && response.aborted) return;
    setReading(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setText(response.data.text);
    setResult(null);
    setNotice(describeExtraction(file.name, response.data));
  }

  const describedBy = ["document-count", error ? "analyze-error" : notice ? "analyze-notice" : null]
    .filter(Boolean)
    .join(" ");

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
          Document text
        </label>
        <textarea
          id="document-input"
          aria-describedby={describedBy}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            if (e.dataTransfer.files.length === 0) return;
            e.preventDefault();
            setDragging(false);
            void onFileChosen(e.dataTransfer.files[0]);
          }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_DOCUMENT_CHARS}
          rows={12}
          placeholder="Paste a lease, contract, offer letter or terms of service here — or drop a PDF, Word file or photo…"
          className={cn(
            "mt-3 w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed shadow-inner transition-colors placeholder:font-sans placeholder:text-muted-foreground",
            dragging && "border-primary bg-primary-soft/40",
          )}
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          {/* Not a live region: announcing every keystroke drowns out typing. */}
          <span id="document-count" className="tabular">
            {formatCount(text.length)} / {formatCount(MAX_DOCUMENT_CHARS)} characters
          </span>
          {text.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setText("");
                setResult(null);
                setError(null);
                setNotice(null);
                setStatus("Cleared.");
                document.getElementById("document-input")?.focus();
              }}
              className="inline-flex min-h-6 items-center gap-1 rounded font-semibold hover:text-foreground"
            >
              <Trash2 className="size-3.5" aria-hidden /> Clear
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!pending) void analyze(text);
            }}
            disabled={text.trim().length === 0}
            aria-disabled={pending || undefined}
            className="glow-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100 aria-disabled:cursor-progress aria-disabled:opacity-70"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ScanSearch className="size-4" aria-hidden />
            )}
            {pending ? "Analysing…" : "Analyze document"}
          </button>

          {/* The input is visually hidden, so the label shows its keyboard focus. */}
          <label className="elev-xs inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium transition-colors hover:border-border-strong hover:bg-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
            {reading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileUp className="size-4" aria-hidden />
            )}
            {reading ? "Reading file…" : "Upload PDF, Word or photo"}
            <input
              type="file"
              accept={ACCEPTED_FILES}
              disabled={reading}
              className="sr-only"
              onChange={(e) => {
                void onFileChosen(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>

          {aiStatus.configured && (
            <LanguagePicker value={language} onChange={setLanguage} className="sm:ml-auto" />
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <h3 id="samples-heading" className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Or try a sample
          </h3>
          <ul aria-labelledby="samples-heading" className="mt-2.5 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <li key={sample.id}>
                <button
                  type="button"
                  onClick={() => {
                    setText(sample.text);
                    setError(null);
                    void analyze(sample.text);
                  }}
                  aria-describedby={`sample-${sample.id}-description`}
                  className={cn(
                    "min-h-8 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium",
                    "transition-colors hover:border-primary hover:text-primary-strong",
                  )}
                >
                  {sample.title}
                </button>
                <span id={`sample-${sample.id}-description`} className="sr-only">
                  {sample.description}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {notice && !error && (
          <p id="analyze-notice" role="status" className="mt-4 rounded-xl bg-primary-soft p-4 text-sm text-primary-strong">
            {notice}
          </p>
        )}

        {error && (
          <p id="analyze-error" role="alert" className="mt-4 rounded-xl bg-risk-high-soft p-4 text-sm text-risk-high">
            {error}
          </p>
        )}
      </section>

      {/* A short spoken summary instead of re-reading the whole analysis. */}
      <p role="status" className="sr-only">
        {status}
      </p>

      <div aria-busy={pending}>
        {pending && !result && (
          <div className="space-y-4">
            {aiStatus.configured && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                Reading every clause, then asking Gemini to explain it…
              </p>
            )}
            <div aria-hidden className="skeleton h-36 w-full" />
            <div aria-hidden className="skeleton h-24 w-full" />
            <div aria-hidden className="skeleton h-56 w-full" />
          </div>
        )}
        {result && aiStatus.configured && result.ai.used && analyzedLanguage !== language && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-strong">
            <span>
              This brief is in {languageName(analyzedLanguage)}. Want it in {languageName(language)}?
            </span>
            <button
              type="button"
              onClick={() => {
                if (!pending) void analyze(analyzedText);
              }}
              aria-disabled={pending || undefined}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-semibold ring-1 ring-primary/20 transition-colors hover:bg-surface aria-disabled:opacity-60"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Rewrite in {languageName(language)}
            </button>
          </div>
        )}
        {result && (
          <AnalysisView
            analysis={result.analysis}
            aiBrief={result.ai.brief}
            aiLanguage={analyzedLanguage}
            aiCheckedContradictions={result.ai.contradictionsChecked}
            headingRef={resultHeadingRef}
          />
        )}
      </div>
    </div>
    </AiProvider>
  );
}
