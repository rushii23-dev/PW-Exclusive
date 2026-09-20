import { AlertTriangle, Cpu, Eye, Lock, Scale, TestTubes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { GLOSSARY } from "@/lib/engine";
import { LEXICON } from "@/lib/engine/lexicon";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The architecture and the honest limits: deterministic analysis, evidence for every flag, optional AI that only rephrases, and no storage of your documents.",
};

const PRINCIPLES = [
  {
    icon: Cpu,
    title: "Deterministic first",
    body: `The analysis is produced by rules, not by a model's recollection: a clause segmenter, a curated lexicon of ${LEXICON.length} risk patterns, entity extraction for every amount and deadline, and BM25 retrieval for questions. The same document always produces the same result — which is why the engine can be unit-tested line by line.`,
  },
  {
    icon: Eye,
    title: "Every flag carries its receipt",
    body: "A finding is only ever attached to the exact sentence that triggered it, and that sentence is shown with the flag. Answers to questions quote the clause they came from. If retrieval isn't confident, the answer is “this document doesn't say” — a legal tool that guesses is worse than no tool.",
  },
  {
    icon: Scale,
    title: "AI may rephrase, never assert",
    body: "When an AI brief is enabled, Claude receives the engine's findings — not the authority to add any. It rewrites them into a friendlier paragraph and nothing else. With no API key configured, the product is fully functional; the analysis never depended on the model.",
  },
  {
    icon: Lock,
    title: "Nothing to leak",
    body: "Documents are processed in memory and never written to disk, logged, or sent to third parties (the optional AI brief sends only the engine's findings to the AI provider). There are no accounts and no analytics on document content. Requests are validated, size-capped and rate-limited.",
  },
  {
    icon: TestTubes,
    title: "Measured, not asserted",
    body: `The engine ships with an extensive automated test suite: segmentation, classification, entity extraction, retrieval confidence, comparison symmetry, API validation and rate limiting. The ${GLOSSARY.length}-term glossary and every sample document double as test fixtures — the demo you see is the behaviour the tests pin down.`,
  },
];

const LIMITS = [
  "It is not legal advice, and no output should be treated as a lawyer's opinion. The action plan exists to make a professional consultation shorter and better.",
  "It detects known patterns. A one-sided clause drafted in a novel way can pass unflagged, so a clean report is not a verdict of fairness.",
  "It reads English-language documents. Agreements in other languages, and scanned documents that aren't text, are out of scope today.",
  "It is jurisdiction-agnostic: it tells you an arbitration clause is there and what it means, but whether it is enforceable where you live is a question for a professional.",
  "Extraction is deterministic but not omniscient — unusual formatting can hide an amount or a date from the patterns. The clause text is always shown so you can check.",
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
            <section className="flex gap-4 rounded-2xl border border-border bg-surface p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
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
          className="mt-12 rounded-2xl border border-risk-medium/40 bg-risk-medium-soft/50 p-6"
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
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            Try it on a document
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
