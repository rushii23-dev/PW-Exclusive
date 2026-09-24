/**
 * Ordering of risk levels, shared by everything that ranks or compares them,
 * so "high beats medium" is defined exactly once.
 */

import type { RiskLevel } from "./types";

export const LEVEL_ORDER: Readonly<Record<RiskLevel, number>> = { high: 3, medium: 2, low: 1 };

/** Sort comparator: worst level first. */
export function byLevelDesc(a: { level: RiskLevel }, b: { level: RiskLevel }): number {
  return LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level];
}

/** The worse of two levels; `null` means "not flagged" and loses to any level. */
export function worseLevel(a: RiskLevel | null, b: RiskLevel | null): RiskLevel | null {
  if (!a) return b;
  if (!b) return a;
  return LEVEL_ORDER[b] > LEVEL_ORDER[a] ? b : a;
}
