import type { RiskLevel } from "@/lib/engine";
import { cn } from "@/lib/utils";

const STYLES: Record<RiskLevel, string> = {
  high: "bg-risk-high-soft text-risk-high",
  medium: "bg-risk-medium-soft text-risk-medium",
  low: "bg-risk-low-soft text-risk-low",
};

const LABELS: Record<RiskLevel, string> = {
  high: "Needs attention",
  medium: "Read carefully",
  low: "Standard",
};

/**
 * Risk level as a badge. Colour encodes the level, but the words carry it
 * alone — the badge works in grayscale and in a screen reader.
 */
export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STYLES[level],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {LABELS[level]}
    </span>
  );
}
