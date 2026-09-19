import type { RiskProfile } from "@/lib/engine";

/**
 * The document's risk profile as a proportional bar plus counts.
 * The bar is decorative (aria-hidden); the counts are the accessible truth.
 */
export function RiskMeter({ profile, total }: { profile: RiskProfile; total: number }) {
  const clean = total - profile.high - profile.medium - profile.low;
  const segments = [
    { label: "needs attention", count: profile.high, color: "var(--risk-high)" },
    { label: "read carefully", count: profile.medium, color: "var(--risk-medium)" },
    { label: "standard boilerplate", count: profile.low, color: "var(--risk-low)" },
    { label: "not flagged", count: clean, color: "var(--border)" },
  ].filter((s) => s.count > 0);

  return (
    <div>
      <div
        aria-hidden
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {segments.map((s, i) => (
          <div
            key={s.label}
            className="risk-segment h-full rounded-full"
            style={{
              width: `${(s.count / total) * 100}%`,
              background: s.color,
              animationDelay: `${i * 90}ms`,
            }}
          />
        ))}
      </div>
      <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="tabular">{s.count}</span> {s.label}
          </span>
        ))}
      </p>
    </div>
  );
}
