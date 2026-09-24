"use client";

import { SearchX } from "lucide-react";
import { useMemo, useState } from "react";

import type { GlossaryEntry } from "@/lib/engine";

export function GlossaryList({ entries }: { entries: GlossaryEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...entries].sort((a, b) => a.term.localeCompare(b.term));
    if (!q) return sorted;
    return sorted.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q) ||
        e.aliases?.some((a) => a.toLowerCase().includes(q)),
    );
  }, [entries, query]);

  return (
    <div>
      <label htmlFor="glossary-search" className="sr-only">
        Search the glossary
      </label>
      <input
        id="glossary-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a term — try “indemnify” or “holdover”…"
        className="elev-xs w-full max-w-md rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm transition-shadow placeholder:text-muted-foreground focus:elev-sm"
      />
      <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
        {filtered.length} of {entries.length} terms
      </p>

      {filtered.length === 0 ? (
        <div className="mt-10 text-center text-muted-foreground">
          <SearchX className="mx-auto size-8" aria-hidden />
          <p className="mt-2 text-sm">No terms match “{query}”.</p>
        </div>
      ) : (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.map((entry) => (
            <div
              key={entry.term}
              className="lift sheet rounded-2xl border border-border p-5"
            >
              <dt className="font-display text-lg font-semibold capitalize">
                {entry.term}
                {entry.aliases && entry.aliases.length > 0 && (
                  <span className="ml-2 align-middle font-sans text-xs font-normal text-muted-foreground">
                    also: {entry.aliases.join(", ")}
                  </span>
                )}
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {entry.definition}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
