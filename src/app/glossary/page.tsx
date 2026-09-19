import type { Metadata } from "next";

import { GlossaryList } from "@/components/glossary/GlossaryList";
import { GLOSSARY } from "@/lib/engine";

export const metadata: Metadata = {
  title: "Legal glossary",
  description:
    "Plain-language definitions of the legal terms contracts actually use — what each one does to you, not its etymology.",
};

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">Legal glossary</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {GLOSSARY.length} terms defined by what they do to you, not by their
          Latin. The same definitions appear inline wherever a document you
          analyse uses one.
        </p>
      </header>
      <GlossaryList entries={GLOSSARY} />
    </div>
  );
}
