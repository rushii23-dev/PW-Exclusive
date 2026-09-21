import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/** Marks text written by Gemini, so the reader always knows its source. */
export function GeminiBadge({ className, label = "Gemini" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-soft to-accent-soft px-2 py-0.5 text-[11px] font-semibold text-primary-strong ring-1 ring-primary/15",
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden />
      {label}
    </span>
  );
}

/** Marks text produced by the rule engine. */
export function EngineBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border",
        className,
      )}
    >
      Rule engine
    </span>
  );
}
