/**
 * Display names for clause categories, for badges and the compare matrix.
 *
 * Kept apart from the lexicon so the page can label a category without
 * downloading every risk pattern the server matches with.
 */

import type { ClauseCategory } from "./types";

export const CATEGORY_LABELS: Record<ClauseCategory, string> = {
  "termination": "Termination",
  "auto-renewal": "Auto-renewal",
  "payment": "Payment",
  "deposit": "Deposit",
  "penalty": "Penalties & late fees",
  "indemnification": "Indemnification",
  "liability": "Liability",
  "arbitration": "Dispute resolution",
  "governing-law": "Governing law",
  "confidentiality": "Confidentiality",
  "non-compete": "Non-compete",
  "assignment": "Assignment",
  "unilateral-changes": "Unilateral changes",
  "waiver": "Waiver of rights",
  "warranty": "Warranties",
  "privacy-data": "Privacy & data",
  "intellectual-property": "Intellectual property",
  "notice": "Notice",
  "maintenance": "Maintenance & repairs",
  "entry-access": "Entry & access",
  "insurance": "Insurance",
  "force-majeure": "Force majeure",
  "severability": "Severability",
  "entire-agreement": "Entire agreement",
  "general": "General",
};
