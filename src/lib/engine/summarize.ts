/**
 * Document type detection and plain-language summary composition.
 *
 * The summary is assembled from facts the engine actually extracted — type,
 * money, durations, risk counts — phrased through templates. It can be
 * wrong only if the extraction was wrong, and the extraction is testable.
 */

import type {
  Clause,
  DocumentType,
  ExtractedEntity,
  Readability,
  RiskProfile,
} from "./types";

interface TypeSignature {
  type: DocumentType;
  label: string;
  /** Each matched pattern adds its weight; highest total wins. */
  signals: Array<{ pattern: RegExp; weight: number }>;
}

const TYPE_SIGNATURES: TypeSignature[] = [
  {
    type: "rental-agreement",
    label: "Rental agreement",
    signals: [
      { pattern: /\b(?:lease|rental)\s+(?:agreement|deed)\b/i, weight: 4 },
      { pattern: /\b(?:landlord|lessor)\b/i, weight: 2 },
      { pattern: /\b(?:tenant|lessee)\b/i, weight: 2 },
      { pattern: /\brent\b/i, weight: 1 },
      { pattern: /\b(?:premises|security deposit|sublet)\b/i, weight: 1 },
    ],
  },
  {
    type: "employment-contract",
    label: "Employment contract",
    signals: [
      { pattern: /\b(?:employment|offer)\s+(?:agreement|contract|letter)\b/i, weight: 4 },
      { pattern: /\b(?:employee|employer)\b/i, weight: 2 },
      { pattern: /\b(?:salary|compensation|remuneration|ctc)\b/i, weight: 2 },
      { pattern: /\b(?:probation|designation|resignation|working hours)\b/i, weight: 1 },
    ],
  },
  {
    type: "nda",
    label: "Non-disclosure agreement",
    signals: [
      { pattern: /\bnon-?disclosure\s+agreement\b/i, weight: 5 },
      { pattern: /\bconfidential(?:ity)?\s+(?:agreement|information)\b/i, weight: 3 },
      { pattern: /\b(?:disclosing|receiving)\s+party\b/i, weight: 3 },
      { pattern: /\btrade\s+secrets?\b/i, weight: 1 },
    ],
  },
  {
    type: "service-agreement",
    label: "Service agreement",
    signals: [
      { pattern: /\b(?:service|services|consulting|freelance|independent contractor)\s+agreement\b/i, weight: 4 },
      { pattern: /\b(?:contractor|consultant|freelancer)\b/i, weight: 2 },
      { pattern: /\b(?:deliverables?|scope of work|statement of work|milestones?)\b/i, weight: 2 },
      { pattern: /\b(?:client|service provider)\b/i, weight: 1 },
    ],
  },
  {
    type: "loan-agreement",
    label: "Loan agreement",
    signals: [
      { pattern: /\bloan\s+agreement\b/i, weight: 5 },
      { pattern: /\b(?:borrower|lender)\b/i, weight: 3 },
      { pattern: /\b(?:principal\s+(?:amount|sum)|repayment|installments?|emi)\b/i, weight: 2 },
      { pattern: /\b(?:interest\s+rate|collateral|default)\b/i, weight: 1 },
    ],
  },
  {
    type: "terms-of-service",
    label: "Terms of service",
    signals: [
      { pattern: /\bterms\s+(?:of\s+(?:service|use)|and\s+conditions)\b/i, weight: 4 },
      { pattern: /\b(?:user|account|subscription)\b/i, weight: 1 },
      { pattern: /\b(?:the\s+service|our\s+services?|platform|website|app)\b/i, weight: 2 },
      { pattern: /\b(?:privacy\s+policy|acceptable\s+use)\b/i, weight: 2 },
    ],
  },
];

export function detectDocumentType(text: string): { type: DocumentType; label: string } {
  let best: { type: DocumentType; label: string } = {
    type: "general-contract",
    label: "Contract",
  };
  let bestScore = 2; // Below this, stay with the generic label.
  for (const sig of TYPE_SIGNATURES) {
    let score = 0;
    for (const s of sig.signals) if (s.pattern.test(text)) score += s.weight;
    if (score > bestScore) {
      bestScore = score;
      best = { type: sig.type, label: sig.label };
    }
  }
  return best;
}

const RISK_WORD: Record<string, string> = {
  high: "needs your attention before signing",
  medium: "is worth reading carefully",
  low: "is standard boilerplate",
};

export function composeSummary(args: {
  typeLabel: string;
  clauses: Clause[];
  riskProfile: RiskProfile;
  readability: Readability;
  keyFacts: ExtractedEntity[];
}): string[] {
  const { typeLabel, clauses, riskProfile, readability, keyFacts } = args;
  const lines: string[] = [];

  lines.push(
    `This looks like a ${typeLabel.toLowerCase()} of ${readability.wordCount.toLocaleString()} words` +
      ` (about ${readability.readingTimeMinutes} minute${readability.readingTimeMinutes === 1 ? "" : "s"} of careful reading),` +
      ` split into ${clauses.length} clause${clauses.length === 1 ? "" : "s"}.`,
  );

  const flagged = riskProfile.high + riskProfile.medium + riskProfile.low;
  if (riskProfile.high > 0) {
    lines.push(
      `${riskProfile.high} clause${riskProfile.high === 1 ? "" : "s"} ${riskProfile.high === 1 ? RISK_WORD.high : "need your attention before signing"}` +
        (riskProfile.medium > 0
          ? `, and ${riskProfile.medium} more ${riskProfile.medium === 1 ? "is" : "are"} worth reading carefully.`
          : "."),
    );
  } else if (riskProfile.medium > 0) {
    lines.push(
      `No high-risk clauses were flagged, but ${riskProfile.medium} clause${riskProfile.medium === 1 ? "" : "s"} ${riskProfile.medium === 1 ? RISK_WORD.medium : "are worth reading carefully"}.`,
    );
  } else if (flagged > 0) {
    lines.push("Only standard boilerplate was flagged — nothing unusual stood out.");
  } else {
    lines.push(
      "No known risk patterns were flagged. That is not a guarantee of fairness — it means none of the patterns this tool knows about appear here.",
    );
  }

  const money = keyFacts.filter((f) => f.kind === "money").slice(0, 3);
  if (money.length > 0) {
    lines.push(
      `Amounts mentioned include ${money.map((m) => m.text).join(", ")} — verify each against what you were told.`,
    );
  }

  const durations = keyFacts.filter((f) => f.kind === "duration").slice(0, 3);
  if (durations.length > 0) {
    lines.push(
      `Time periods to note: ${durations.map((d) => d.text).join(", ")}. Deadlines in contracts are usually strict.`,
    );
  }

  if (readability.band === "very hard" || readability.band === "hard") {
    lines.push(
      `The drafting is ${readability.band} to read (Flesch ${readability.fleschScore}, averaging ${readability.avgWordsPerSentence} words per sentence) — take the plain-language version below clause by clause.`,
    );
  }

  return lines;
}
