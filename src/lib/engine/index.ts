/**
 * Public surface of the analysis engine.
 *
 * Everything is deterministic, dependency-free TypeScript. UI code and API
 * routes import from here, never from the internals directly.
 */

export {
  analyzeDocument,
  DocumentTooLargeError,
  DocumentTooSmallError,
  MAX_DOCUMENT_CHARS,
  MIN_DOCUMENT_CHARS,
} from "./analyze";
export { compare } from "./compare";
export type { CategoryRow, Comparison, FindingDiff, NumberDiff } from "./compare";
export { answerQuestion, ClauseIndex } from "./retrieve";
export { toPlainText } from "./checklist";
export { CATEGORY_LABELS } from "./lexicon";
export { GLOSSARY } from "./glossary";
export type { GlossaryEntry } from "./glossary";
export type {
  Analysis,
  Answer,
  ChecklistItem,
  Clause,
  ClauseCategory,
  DocumentType,
  ExtractedEntity,
  JargonHit,
  Obligation,
  Party,
  Readability,
  RiskFinding,
  RiskLevel,
  RiskProfile,
} from "./types";
