"use client";

/**
 * Accessible tabs implementing the WAI-ARIA tabs pattern: roving tabindex,
 * arrow-key navigation, Home/End, aria-selected, and labelled panels.
 */

import { useId, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TabDef {
  id: string;
  label: string;
  /** Small counter shown after the label. */
  count?: number;
  content: ReactNode;
}

export function Tabs({
  tabs,
  label,
  className,
}: {
  tabs: TabDef[];
  /** Accessible name for the tab list, e.g. "Analysis details". */
  label: string;
  className?: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent) {
    const index = tabs.findIndex((t) => t.id === active);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === -1) return;
    event.preventDefault();
    setActive(tabs[next].id);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]");
    buttons?.[next]?.focus();
  }

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/70 p-1"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                selected
                  ? "elev-sm bg-surface-raised text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {typeof tab.count === "number" && (
                <>
                  {/* Read as "Clauses (12)", not "Clauses12": the space sits
                      outside the badge, where no name computation trims it. */}{" "}
                  <span
                    className={cn(
                      "ml-1 rounded-full px-1.5 py-0.5 text-[11px] tabular",
                      selected ? "bg-primary-soft text-primary-strong" : "bg-muted",
                    )}
                  >
                    <span className="sr-only">(</span>
                    {tab.count}
                    <span className="sr-only">)</span>
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="mt-5 focus-visible:outline-none"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
