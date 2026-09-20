import type { Metadata } from "next";

import { Analyzer } from "@/components/analyze/Analyzer";
import { getSample } from "@/lib/samples";

export const metadata: Metadata = {
  title: "Analyze a document",
  description:
    "Paste any legal document for a plain-language breakdown: clause-by-clause meaning, risk flags with evidence, a checklist, and grounded Q&A.",
};

export default async function AnalyzePage({ searchParams }: PageProps<"/analyze">) {
  // Resolving ?sample= on the server keeps server and client HTML identical —
  // seeding it client-side from useSearchParams caused a hydration mismatch.
  const params = await searchParams;
  const sampleId = typeof params.sample === "string" ? params.sample : "";
  const initialSample = getSample(sampleId) ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="eyebrow">Plain-language analysis</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Analyze a document
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Paste the text of a lease, contract, offer or terms of service. You
          get a plain-language summary, every clause explained with its risks
          flagged, a before-you-sign checklist, and a Q&amp;A that answers only
          from the document.
        </p>
      </header>
      <Analyzer initialSample={initialSample} />
    </div>
  );
}
