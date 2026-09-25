/**
 * The orchestrator: text in, `Analysis` out.
 *
 * Pure and synchronous — no network, no model, no randomness. The same
 * document always produces the same analysis, which is what makes the whole
 * engine unit-testable and the output auditable.
 */

import { MAX_DOCUMENT_CHARS, MIN_DOCUMENT_CHARS } from "./bounds";
import { buildChecklist, buildLawyerQuestions } from "./checklist";
import { classifyClause } from "./classify";
import { extractEntities } from "./entities";
import { formatCount } from "./format";
import { findJargon } from "./glossary";
import { findInconsistencies } from "./inconsistencies";
import { extractObligations } from "./obligations";
import { computeReadability } from "./readability";
import { byLevelDesc } from "./risk";
import { segment, type RawClause } from "./segment";
import { composeSummary, detectDocumentType } from "./summarize";
import type {
  Analysis,
  Clause,
  DocumentType,
  ExtractedEntity,
  RiskFinding,
  RiskProfile,
} from "./types";

/** Bounds enforced by the API too; enforced here as well so the engine is safe alone. */
export { MAX_DOCUMENT_CHARS, MIN_DOCUMENT_CHARS };

/** Enough duties per side to be useful without burying the list. */
const MAX_OBLIGATIONS = 12;

export class DocumentTooLargeError extends Error {
  constructor() {
    super(`Document exceeds ${formatCount(MAX_DOCUMENT_CHARS)} characters.`);
    this.name = "DocumentTooLargeError";
  }
}

export class DocumentTooSmallError extends Error {
  constructor() {
    super(
      `That is too short to analyse as a legal document (need at least ${MIN_DOCUMENT_CHARS} characters).`,
    );
    this.name = "DocumentTooSmallError";
  }
}

function dedupeFindings(clauses: Clause[]): RiskFinding[] {
  const byRule = new Map<string, RiskFinding>();
  for (const clause of clauses) {
    for (const f of clause.findings) {
      if (!byRule.has(f.ruleId)) byRule.set(f.ruleId, f);
    }
  }
  return [...byRule.values()].sort(byLevelDesc);
}

function dedupeEntities(clauses: Clause[]): ExtractedEntity[] {
  const seen = new Set<string>();
  const out: ExtractedEntity[] = [];
  for (const clause of clauses) {
    for (const e of clause.entities) {
      const key = `${e.kind}:${e.text.toLowerCase().replace(/\s+/g, " ")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

/** The document, trimmed, once it is known to be within bounds. */
function withinBounds(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length > MAX_DOCUMENT_CHARS) throw new DocumentTooLargeError();
  if (trimmed.length < MIN_DOCUMENT_CHARS) throw new DocumentTooSmallError();
  return trimmed;
}

/**
 * Everything the engine knows about one clause. The kind of document decides
 * whose duties are whose (a "client" is the reader of a subscription but the
 * other side of a freelance contract).
 */
function readClause(raw: RawClause, index: number, type: DocumentType): Clause {
  const scope = `${raw.heading ?? ""}\n${raw.text}`;
  const { categories, risk, findings } = classifyClause(scope);
  return {
    id: `clause-${index + 1}`,
    index,
    heading: raw.heading,
    text: raw.text,
    categories: categories.length > 0 ? categories : ["general"],
    risk,
    findings,
    entities: extractEntities(raw.text),
    jargon: findJargon(scope),
    obligations: extractObligations(raw.text, type),
  };
}

export function analyzeDocument(text: string): Analysis {
  const trimmed = withinBounds(text);
  const { type, label } = detectDocumentType(trimmed);
  const clauses = segment(trimmed).map((raw, index) => readClause(raw, index, type));

  const riskProfile: RiskProfile = {
    high: clauses.filter((c) => c.risk === "high").length,
    medium: clauses.filter((c) => c.risk === "medium").length,
    low: clauses.filter((c) => c.risk === "low").length,
    overall: null,
  };
  riskProfile.overall =
    riskProfile.high > 0 ? "high" : riskProfile.medium > 0 ? "medium" : riskProfile.low > 0 ? "low" : null;

  const readability = computeReadability(trimmed);
  const findings = dedupeFindings(clauses);
  const keyFacts = dedupeEntities(clauses);

  const obligations = clauses.flatMap((c) => c.obligations);
  const yourObligations = obligations
    .filter((o) => o.party === "you" || o.party === "both")
    .slice(0, MAX_OBLIGATIONS);
  const theirObligations = obligations
    .filter((o) => o.party === "counterparty")
    .slice(0, MAX_OBLIGATIONS);

  const glossarySeen = new Set<string>();
  const glossary = clauses
    .flatMap((c) => c.jargon)
    .filter((j) => {
      if (glossarySeen.has(j.term)) return false;
      glossarySeen.add(j.term);
      return true;
    });

  return {
    documentType: type,
    documentTypeLabel: label,
    summary: composeSummary({ typeLabel: label, clauses, riskProfile, readability, keyFacts }),
    clauses,
    riskProfile,
    readability,
    findings,
    keyFacts,
    yourObligations,
    theirObligations,
    checklist: buildChecklist(findings),
    lawyerQuestions: buildLawyerQuestions(findings),
    glossary,
    inconsistencies: findInconsistencies(clauses, trimmed),
  };
}
