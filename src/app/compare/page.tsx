import type { Metadata } from "next";

import { Comparer } from "@/components/compare/Comparer";

export const metadata: Metadata = {
  title: "Compare two documents",
  description:
    "Compare two contracts or two versions of one: topic coverage, risk flags only one of them has, and how the amounts and deadlines differ.",
};

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold sm:text-4xl">Compare two documents</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Two offers on the table, or a new draft against the old one. See which
          topics each covers, which traps only one contains, and how the
          concrete numbers differ.
        </p>
      </header>
      <Comparer />
    </div>
  );
}
