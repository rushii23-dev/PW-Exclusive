import { ArrowRight, FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-strong ring-1 ring-border">
        <FileQuestion className="size-7" aria-hidden />
      </span>
      <p className="eyebrow mt-6">Page not found</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">This page doesn&rsquo;t exist</h1>
      <p className="mt-3 text-muted-foreground">
        The link may be old or mistyped. Your document, if you were working on one, was never
        stored — paste it again to pick up where you left off.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/analyze"
          className="glow-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary-strong to-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          Analyze a document
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Link
          href="/"
          className="sheet inline-flex items-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
