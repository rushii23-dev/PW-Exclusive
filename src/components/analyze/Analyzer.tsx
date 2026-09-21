"use client";

import { FileUp, Loader2, ScanSearch, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AiProvider, useAiStatus, useLanguagePreference } from "@/components/ai/AiContext";
import { GeminiBadge } from "@/components/ai/GeminiBadge";
import { LanguagePicker } from "@/components/ai/LanguagePicker";
import { AnalysisView } from "@/components/analyze/AnalysisView";
import type { AiBrief } from "@/lib/ai/brief";
import { languageName, type LanguageCode } from "@/lib/ai/languages";
import { postJson } from "@/lib/client/api";
import { formatCount, MAX_DOCUMENT_CHARS, type Analysis } from "@/lib/engine";
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

/** Text files are read in the browser; everything else goes to /api/extract. */
const ACCEPTED_FILES =
  ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.heic,application/pdf,text/plain,text/markdown,image/*";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

interface ExtractResponse {
  text: string;
  method: "text" | "pdf-text" | "docx" | "gemini-vision";
  truncated: boolean;
  pages?: number;
}

function describeExtraction(name: string, x: ExtractResponse): string {
  const pages = x.pages ? ` (${x.pages} page${x.pages === 1 ? "" : "s"})` : "";
  const base =
    x.method === "gemini-vision"
      ? `Gemini read the text from ${name}${pages}. Check it against the original before analysing — photos and scans can be misread.`
      : `Read the text from ${name}${pages}. Review it, then analyse.`;
  return x.truncated ? `${base} The file was longer than one analysis allows, so only the first part is shown.` : base;
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const [analyzedLanguage, setAnalyzedLanguage] = useState<LanguageCode>("en");
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
      setAnalyzedLanguage(language);
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
    try {
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        setError(json?.error?.message ?? "Could not read that file.");
        return;
      }
      const extraction = json as ExtractResponse;
      setText(extraction.text);
      setResult(null);
      setNotice(describeExtraction(file.name, extraction));
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setReading(false);
    }
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
            "mt-3 w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-[13px] leading-relaxed shadow-inner transition-colors placeholder:font-sans placeholder:text-muted-foreground/70",
            dragging && "border-primary bg-primary-soft/40",
          )}
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span aria-live="polite" className="tabular">
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

        {notice && !error && (
          <p role="status" className="mt-4 rounded-xl bg-primary-soft p-4 text-sm text-primary-strong">
            {notice}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-risk-high-soft p-4 text-sm text-risk-high">
            {error}
          </p>
        )}
      </section>

      <div ref={resultRef} aria-live="polite">
        {pending && !result && (
          <div className="space-y-4" aria-label="Analysing the document">
            {aiStatus.configured && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                Reading every clause, then asking Gemini to explain it…
              </p>
            )}
            <div className="skeleton h-36 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-56 w-full" />
          </div>
        )}
        {result && aiStatus.configured && result.ai.used && analyzedLanguage !== language && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-strong">
            <span>
              This brief is in {languageName(analyzedLanguage)}. Want it in {languageName(language)}?
            </span>
            <button
              type="button"
              onClick={() => analyze(analyzedText)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-semibold ring-1 ring-primary/20 transition-colors hover:bg-surface disabled:opacity-60"
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
            aiCheckedContradictions={result.ai.contradictionsChecked}
          />
        )}
      </div>
    </div>
    </AiProvider>
  );
}
