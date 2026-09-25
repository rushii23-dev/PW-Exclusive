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
export { answerQuestion, bestQuote, ClauseIndex } from "./retrieve";
export type { RetrievalHit } from "./retrieve";
export { findInconsistencies } from "./inconsistencies";
export { toPlainText } from "./checklist";
export { formatCount } from "./format";
export { CATEGORY_LABELS } from "./categories";
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
  Inconsistency,
  InconsistencyEvidence,
  JargonHit,
  Obligation,
  Party,
  Readability,
  RiskFinding,
  RiskLevel,
  RiskProfile,
} from "./types";
