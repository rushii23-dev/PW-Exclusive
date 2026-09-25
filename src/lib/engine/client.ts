/**
 * The engine as the browser sees it: types, limits and display helpers.
 *
 * The analysis itself runs on the server, so the page never needs the risk
 * lexicon, the glossary matchers, the tokenizer or the retrieval index.
 * Client components import from here rather than from the engine's index,
 * which would bring that machinery into every page's JavaScript. Each module
 * below imports nothing but types; `tests/client/engine-boundary.test.ts`
 * keeps it that way.
 */

export { MAX_DOCUMENT_CHARS, MIN_DOCUMENT_CHARS } from "./bounds";
export { CATEGORY_LABELS } from "./categories";
export { toPlainText } from "./checklist";
export { formatCount } from "./format";
export type { Comparison } from "./compare";
export type { GlossaryEntry } from "./glossary";
export type {
  Analysis,
  Answer,
  Clause,
  DocumentType,
  Inconsistency,
  Obligation,
  RiskLevel,
  RiskProfile,
} from "./types";
