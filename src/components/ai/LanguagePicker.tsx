"use client";

import { Languages } from "lucide-react";

import { LANGUAGES, type LanguageCode } from "@/lib/ai/languages";
import { cn } from "@/lib/utils";

/**
 * Which language Gemini writes its explanations in. Quotes from the document
 * always stay exactly as written, so they still match the paper.
 */
export function LanguagePicker({
  value,
  onChange,
  className,
  id = "language-picker",
}: {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <label htmlFor={id} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Languages className="size-4" aria-hidden />
        Explain in
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        className="elev-xs rounded-lg border border-border bg-surface-raised px-2.5 py-2 text-sm font-medium transition-colors hover:border-border-strong"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native === l.name ? l.name : `${l.native} — ${l.name}`}
          </option>
        ))}
      </select>
    </div>
  );
}
