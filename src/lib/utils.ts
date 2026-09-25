import { clsx, type ClassValue } from "clsx";

/**
 * Join class names, dropping the falsy ones.
 *
 * Deliberately not Tailwind-aware: no call site passes two utilities for the
 * same property — a state that changes a colour swaps it out rather than
 * stacking a second one — so there are no conflicts to resolve at runtime,
 * and every page is spared a class-merging library.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
