/**
 * Public surface of the analysis engine.
 *
 * Everything is deterministic, dependency-free TypeScript. API routes and
 * server components import from here, never from the internals directly.
 * Client components import from `./client` instead: the analysis runs on the
 * server, so the browser needs only the engine's types and display helpers.
 */

export {
  analyzeClause,
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
