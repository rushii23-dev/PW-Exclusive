import {
  ArrowRight,
  BookOpen,
  FileSearch,
  ListChecks,
  MessageCircleQuestion,
  Scale,
  ShieldCheck,
  SplitSquareHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { GLOSSARY } from "@/lib/engine";
import { LEXICON } from "@/lib/engine/lexicon";
import { SAMPLES } from "@/lib/samples";

/* Every number on this page is computed from the code that ships. If the
   lexicon grows, the page grows with it; nothing here can go stale or be
   invented. */
const STATS = [
  { value: LEXICON.length, label: "risk patterns detected" },
  { value: GLOSSARY.length, label: "legal terms explained" },
  { value: SAMPLES.length, label: "sample documents to try" },
  { value: 0, label: "documents stored, ever" },
];

const FEATURES = [
  {
    icon: FileSearch,
    title: "Plain-language breakdown",
    body: "Every clause, translated: what it says, what it means for you, and the exact words that triggered each flag — so you can check the claim against the document.",
    href: "/analyze",
  },
  {
    icon: Scale,
    title: "Risk flags with receipts",
    body: "Auto-renewal traps, one-sided termination, salary deductions, arbitration clauses. Each flag quotes its evidence and tells you what to do about it.",
    href: "/analyze",
  },
  {
    icon: SplitSquareHorizontal,
    title: "Compare two versions",
    body: "Two offers, or an old draft against a new one: which topics each covers, which traps only one has, and how the numbers differ.",
    href: "/compare",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask the document",
    body: "“Can I quit?” “When do I get my deposit back?” Answers come only from the document, quoted and cited — or an honest “it doesn't say.”",
    href: "/analyze",
  },
  {
    icon: ListChecks,
    title: "Before-you-sign checklist",
    body: "Every finding becomes a step: the renewal date to diarise, the exit cost to calculate, the clause to renegotiate.",
    href: "/analyze",
  },
  {
    icon: BookOpen,
    title: "Prepared for your lawyer",
    body: "A generated list of the questions worth paying a professional to answer — so a 30-minute consultation covers what matters.",
    href: "/analyze",
  },
];

const STEPS = [
  {
    title: "The engine finds",
    body: "Deterministic analysis segments the document into clauses, classifies each against a curated lexicon of risk patterns, and extracts every amount, date and deadline with rules — not guesses. The same document always produces the same analysis.",
  },
  {
    title: "The evidence shows",
    body: "Nothing is flagged that can't be pointed at. Every finding carries the sentence that triggered it, every answer quotes the clause it came from, and questions the document doesn't answer get an honest refusal.",
  },
  {
    title: "AI only rephrases",
    body: "An optional AI pass rewrites the findings into a friendlier brief — it receives the engine's results, not licence to invent. With no AI configured, everything still works; the analysis never depended on it.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-aurora absolute -top-32 left-1/4 size-[36rem] rounded-full bg-primary-soft opacity-70 blur-3xl" />
          <div
            className="animate-aurora absolute -right-24 top-24 size-[28rem] rounded-full bg-accent-soft opacity-60 blur-3xl"
            style={{ animationDelay: "-8s" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
          <div className="max-w-3xl">
            <p className="animate-fade-in-up elev-xs inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-1.5 text-xs font-medium tracking-tight text-muted-foreground backdrop-blur">
              <span
                aria-hidden
                className="animate-live-pulse size-2 rounded-full text-ok"
                style={{ background: "currentColor" }}
              />
              Nothing you paste is stored — analysed in memory, then forgotten
            </p>
            <h1
              className="animate-fade-in-up mt-6 text-4xl font-semibold leading-[1.1] sm:text-6xl"
              style={{ animationDelay: "0.08s" }}
            >
              Understand what
              <br />
              <span className="animate-gradient-pan text-gradient">
                you&rsquo;re signing.
              </span>
            </h1>
            <p
              className="animate-fade-in-up mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
              style={{ animationDelay: "0.16s" }}
            >
              Paste a lease, an offer letter, a freelance contract or the terms
              nobody reads. ClearClause breaks it into plain language, flags the
              clauses that cost people money, and tells you what to ask before
              you sign.
            </p>
            <div
              className="animate-fade-in-up mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.24s" }}
            >
              <Link
                href="/analyze"
                className="group glow-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Analyze a document
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/analyze?sample=rental"
                className="sheet inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-muted"
              >
                <Sparkles className="size-4 text-accent-ink" aria-hidden />
                See a sample analysis
              </Link>
            </div>
          </div>

          <dl
            className="animate-fade-in-up elev-md mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4"
            style={{ animationDelay: "0.32s" }}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-surface-raised px-5 py-5">
                <dt className="order-last mt-1 text-xs text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="font-display text-3xl font-semibold tabular">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="features-heading">
        <Reveal>
          <h2 id="features-heading" className="text-3xl font-semibold sm:text-4xl">
            Everything between you
            <br className="hidden sm:block" /> and an unpleasant surprise
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 0.08}>
              <Link
                href={feature.href}
                className="lift sheet group block h-full rounded-2xl border border-border p-6"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary-soft to-accent-soft text-primary-strong ring-1 ring-border">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-sans text-base font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it answers ───────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 id="how-heading" className="text-3xl font-semibold sm:text-4xl">
              Built not to make things up
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              A legal tool that guesses is worse than no tool. The usual
              dependency is inverted here: analysis comes from verifiable
              rules, and a language model is only ever allowed to rephrase it.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.1} as="li">
                <div className="flex h-full flex-col">
                  <span className="font-display text-5xl font-semibold text-primary-soft [-webkit-text-stroke:1.5px_var(--primary)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-sans text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Honesty ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="limits-heading">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 id="limits-heading" className="text-3xl font-semibold sm:text-4xl">
              What this is — and isn&rsquo;t
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              ClearClause helps you understand a document and arrive at a
              professional&rsquo;s desk prepared. It does not replace that
              professional. It detects known patterns; a clause written in a
              novel way can pass unflagged, and a clean report is not a
              verdict of fairness.
            </p>
            <Link
              href="/about"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong hover:underline"
            >
              Read how it works, including its limits
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="space-y-3">
              {[
                "Information, not legal advice — the distinction is on every page and every export.",
                "Deterministic first: the same document always gets the same analysis, so results can be audited and tested.",
                "Works with zero API keys — the optional AI layer only rewords what the engine already found.",
                "No accounts, no storage, no analytics on your documents. The privacy model is that there is nothing to leak.",
              ].map((line) => (
                <li key={line} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                  <span className="text-sm leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground sm:px-14">
            <div
              aria-hidden
              className="animate-aurora pointer-events-none absolute -top-20 right-10 size-72 rounded-full bg-accent opacity-25 blur-3xl"
            />
            <h2 className="relative text-3xl font-semibold sm:text-4xl">
              Read it before you sign it.
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm opacity-85">
              Paste a document or try a sample — the full analysis takes
              seconds and nothing leaves the request.
            </p>
            <Link
              href="/analyze"
              className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-surface px-6 py-3.5 text-sm font-semibold text-foreground transition-transform hover:scale-[1.03]"
            >
              Start analysing <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
