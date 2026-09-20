import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-raised">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-3">
            <p className="font-display text-lg font-semibold tracking-tight">
              ClearClause
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Plain-language analysis of legal documents. Everything is
              processed in memory and forgotten when the response is sent —
              no accounts, no storage, no tracking.
            </p>
            <p className="inline-flex items-center gap-2 rounded-full bg-ok-soft px-3 py-1.5 text-xs font-medium text-ok">
              <ShieldCheck className="size-3.5" aria-hidden />
              Documents are never stored
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline" href="/analyze">
              Analyze a document
            </Link>
            <Link className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline" href="/compare">
              Compare two documents
            </Link>
            <Link className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline" href="/glossary">
              Legal glossary
            </Link>
            <Link className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline" href="/about">
              How it works
            </Link>
          </nav>
        </div>
        <hr className="rule-fade mt-8" />
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          ClearClause provides information to help you understand documents. It
          is not a law firm, does not provide legal advice, and is not a
          substitute for a qualified professional. For decisions that matter,
          consult one — this tool helps you arrive prepared.
        </p>
      </div>
    </footer>
  );
}
