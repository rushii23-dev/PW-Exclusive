/**
 * Domain model for the analysis engine.
 *
 * Everything here is produced deterministically from the document text.
 * Gemini builds its explanations on top of these facts, and anything it
 * quotes is checked against the clauses defined here before it is shown —
 * that is what keeps the output verifiable against the document.
 */

/** Categories a clause can belong to. A clause may match several. */
export type ClauseCategory =
  | "termination"
  | "auto-renewal"
  | "payment"
  | "deposit"
  | "penalty"
  | "indemnification"
  | "liability"
  | "arbitration"
  | "governing-law"
  | "confidentiality"
  | "non-compete"
  | "assignment"
  | "unilateral-changes"
  | "waiver"
  | "warranty"
  | "privacy-data"
  | "intellectual-property"
  | "notice"
  | "maintenance"
  | "entry-access"
  | "insurance"
  | "force-majeure"
  | "severability"
  | "entire-agreement"
  | "general";

export type RiskLevel = "high" | "medium" | "low";

/** Which side of the agreement a duty or power falls on. */
export type Party = "you" | "counterparty" | "both" | "unclear";

/** One matched risk pattern, with the evidence that triggered it. */
export interface RiskFinding {
  /** Stable identifier of the lexicon rule that fired. */
  ruleId: string;
  category: ClauseCategory;
  level: RiskLevel;
  /** Short name shown as a badge, e.g. "Automatic renewal". */
  label: string;
  /** Plain-language explanation of why this matters. */
  explanation: string;
  /** What the reader can do about it. */
  advice: string;
  /** The exact text span that triggered the rule — the receipt. */
  evidence: string;
}

export interface ExtractedEntity {
  kind: "money" | "date" | "duration" | "percentage";
  /** Text exactly as it appears in the document. */
  text: string;
  /** Normalised value where one can be computed (days for durations, number for %). */
  value?: number;
}

export interface JargonHit {
  term: string;
  definition: string;
}

/** A sentence that places a duty on someone. */
export interface Obligation {
  party: Party;
  text: string;
}

export interface Clause {
  id: string;
  index: number;
  heading: string | null;
  text: string;
  categories: ClauseCategory[];
  risk: RiskLevel | null;
  findings: RiskFinding[];
  entities: ExtractedEntity[];
  jargon: JargonHit[];
  obligations: Obligation[];
}

export type DocumentType =
  | "rental-agreement"
  | "employment-contract"
  | "nda"
  | "service-agreement"
  | "loan-agreement"
  | "terms-of-service"
  | "general-contract";

export interface Readability {
  /** Flesch Reading Ease, clamped to 0–100. Higher is easier. */
  fleschScore: number;
  /** Interpreted band: "very hard" … "easy". */
  band: "very hard" | "hard" | "moderate" | "easy";
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  /** Distinct legal-jargon terms per 100 words. */
  jargonDensity: number;
  /** Estimated minutes for a careful read at 180 wpm. */
  readingTimeMinutes: number;
}

export interface RiskProfile {
  high: number;
  medium: number;
  low: number;
  /** Overall call for the header: worst level present, or null if clean. */
  overall: RiskLevel | null;
}

/** A quoted passage that supports an inconsistency. */
export interface InconsistencyEvidence {
  clauseId: string;
  heading: string | null;
  /** Exact text from the clause. */
  quote: string;
}

/** Two parts of the document that disagree, or one that points at nothing. */
export interface Inconsistency {
  id: string;
  kind: "number-mismatch" | "conflicting-values" | "missing-reference" | "contradiction";
  title: string;
  explanation: string;
  evidence: InconsistencyEvidence[];
  /** Found by a deterministic rule, or by the model and then quote-verified. */
  source: "engine" | "ai";
}

export interface ChecklistItem {
  /** What to do. */
  text: string;
  /** Which finding or category prompted it. */
  because: string;
}

export interface Analysis {
  documentType: DocumentType;
  /** Human label for the type, e.g. "Rental agreement". */
  documentTypeLabel: string;
  /** Plain-language overview composed from detected facts. */
  summary: string[];
  clauses: Clause[];
  riskProfile: RiskProfile;
  readability: Readability;
  /** Every distinct finding across the document, worst first. */
  findings: RiskFinding[];
  /** Key amounts, dates and periods, deduplicated. */
  keyFacts: ExtractedEntity[];
  /** Duties the document places on the reader's side. */
  yourObligations: Obligation[];
  /** Duties it places on the other side — what the reader can hold them to. */
  theirObligations: Obligation[];
  /** Concrete next steps derived from the findings. */
  checklist: ChecklistItem[];
  /** Questions worth asking a legal professional, derived from the findings. */
  lawyerQuestions: string[];
  /** Jargon found in the document with plain definitions. */
  glossary: JargonHit[];
  /** Places where the document contradicts itself, each with quotes. */
  inconsistencies: Inconsistency[];
}

/** A grounded answer to a question about the document. */
export interface Answer {
  /** True when retrieval was confident enough to answer at all. */
  found: boolean;
  /** Who wrote the response text: the rule engine or the model. */
  source?: "engine" | "ai";
  /** Suggested next questions, when the model offers them. */
  followUps?: string[];
  /** Plain-language response. Empty when `found` is false. */
  response: string;
  /** The clauses the answer is drawn from, best first. */
  citations: Array<{
    clauseId: string;
    heading: string | null;
    /** Exact supporting quote from the clause. */
    quote: string;
    score: number;
  }>;
}
