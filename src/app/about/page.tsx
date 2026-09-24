import { AlertTriangle, Cpu, Eye, Lock, Sparkles, TestTubes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { GLOSSARY } from "@/lib/engine";
import { LEXICON } from "@/lib/engine/lexicon";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The architecture and the honest limits: rules establish the facts, Gemini explains them, every AI quote is verified against your document, and nothing is stored.",
};

const PRINCIPLES = [
  {
    icon: Cpu,
    title: "Rules establish the facts",
    body: `A deterministic engine does the part that must never be wrong: a clause segmenter, a curated lexicon of ${LEXICON.length} risk patterns, extraction of every amount and deadline, contradiction checks, and BM25 retrieval. The same document always produces the same findings — which is why they can be unit-tested line by line.`,
  },
  {
    icon: Sparkles,
    title: "Gemini does the explaining",
    body: "Google's Gemini writes the brief, answers questions, explains individual clauses, lays out your options for a situation you describe, compares documents from your side, and reads for contradictions the rules can't see. It reads scanned PDFs and photos too, and writes in any of 12 languages.",
  },
  {
    icon: Eye,
    title: "No quote, no claim",
    body: "Gemini must cite clauses by id and quote them word for word. Every quote is checked against your document before you see it; one that isn't really there is discarded, and an answer or option left without verified support is dropped — the rule engine answers instead. The document is treated as untrusted data, so instructions hidden inside it are never followed.",
  },
  {
    icon: Lock,
    title: "Private by design",
    body: "Documents are processed in memory and never written to disk, logged or kept. The clauses needed for an AI answer are sent to Gemini for that request only. There are no accounts and no analytics on document content; requests are validated, size-capped and rate-limited.",
  },
  {
    icon: TestTubes,
    title: "Measured, not asserted",
    body: `An extensive automated test suite covers segmentation, classification, extraction, contradiction checks, retrieval, comparison, file reading, and every AI feature — including tests that feed the AI invented quotes and confirm they never reach the reader, and an accessibility audit of every page and panel. The ${GLOSSARY.length}-term glossary and every sample document double as fixtures.`,
  },
];

const LIMITS = [
  "It is not legal advice, and no output should be treated as a lawyer's opinion. The action plan and questions exist to make a professional consultation shorter and better.",
  "The rule engine detects known patterns; a one-sided clause drafted in a novel way can pass unflagged. Gemini catches more, but a clean report is still not a verdict of fairness.",
  "AI explanations can be imperfect even when their quotes are verified. The quoted clause is always shown next to the explanation — read it yourself before relying on it.",
  "It is jurisdiction-agnostic: it tells you an arbitration clause is there and what it means, but whether it is enforceable where you live is a question for a professional.",
  "Text read from photos and scans can contain mistakes. Check the extracted text against the original before analysing.",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10">
        <p className="eyebrow">Architecture and limits</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">How it works</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          The whole design follows from one rule: never show the reader
          something that cannot be pointed at in their document.
        </p>
      </header>

      <div className="space-y-4">
        {PRINCIPLES.map((p, i) => (
          <Reveal key={p.title} delay={Math.min(i * 0.06, 0.2)}>
            <section className="sheet flex gap-4 rounded-2xl border border-border p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-soft to-accent-soft text-primary-strong ring-1 ring-border">
                <p.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-sans text-base font-semibold">{p.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            </section>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <section
          aria-labelledby="limits-heading"
          className="elev-sm mt-12 rounded-2xl border border-risk-medium/40 bg-risk-medium-soft/60 p-6 sm:p-7"
        >
          <h2
            id="limits-heading"
            className="flex items-center gap-2 font-sans text-base font-semibold"
          >
            <AlertTriangle className="size-5 text-risk-medium" aria-hidden />
            What it deliberately does not claim
          </h2>
          <ul className="mt-4 space-y-3">
            {LIMITS.map((limit) => (
              <li key={limit} className="flex gap-2.5 text-sm leading-relaxed">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-risk-medium" />
                {limit}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal>
        <p className="mt-12 text-center">
          <Link
            href="/analyze"
            className="glow-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Try it on a document
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
