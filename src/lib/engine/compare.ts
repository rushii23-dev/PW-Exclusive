/**
 * Two-document comparison.
 *
 * Three views matter to someone choosing between agreements (or checking a
 * new version against an old one): which topics each document covers, how
 * the flagged risks differ, and how the concrete numbers — durations,
 * amounts, percentages — differ. All three come from the per-document
 * analyses, so compare can never disagree with analyze.
 */

import { CATEGORY_LABELS } from "./lexicon";
import { LEVEL_ORDER, worseLevel } from "./risk";
import type { Analysis, ClauseCategory, RiskFinding, RiskLevel } from "./types";

export interface CategoryRow {
  category: ClauseCategory;
  label: string;
  inA: boolean;
  inB: boolean;
  /** Worst risk that category carries in each document. */
  riskA: RiskLevel | null;
  riskB: RiskLevel | null;
}

export interface FindingDiff {
  label: string;
  level: RiskLevel;
  explanation: string;
  /** "a" — only document A has it; "b" — only B; "both". */
  presence: "a" | "b" | "both";
}

export interface NumberDiff {
  kind: "duration" | "money" | "percentage";
  valuesA: string[];
  valuesB: string[];
}

export interface Comparison {
  categories: CategoryRow[];
  findings: FindingDiff[];
  numbers: NumberDiff[];
  /** Composed one-paragraph verdicts, most important first. */
  verdicts: string[];
}

function worstByCategory(analysis: Analysis): Map<ClauseCategory, RiskLevel | null> {
  const map = new Map<ClauseCategory, RiskLevel | null>();
  for (const clause of analysis.clauses) {
    for (const cat of clause.categories) {
      map.set(cat, worseLevel(map.get(cat) ?? null, clause.risk));
    }
  }
  return map;
}

export function compare(a: Analysis, b: Analysis): Comparison {
  const catsA = worstByCategory(a);
  const catsB = worstByCategory(b);

  const allCats = [...new Set([...catsA.keys(), ...catsB.keys()])].filter(
    (c) => c !== "general",
  );
  const categories: CategoryRow[] = allCats
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      inA: catsA.has(category),
      inB: catsB.has(category),
      riskA: catsA.get(category) ?? null,
      riskB: catsB.get(category) ?? null,
    }))
    .sort((x, y) => {
      // One-sided rows first — coverage gaps are the comparison's payload.
      const oneSided = Number(x.inA !== x.inB);
      const oneSidedY = Number(y.inA !== y.inB);
      if (oneSided !== oneSidedY) return oneSidedY - oneSided;
      return x.label.localeCompare(y.label);
    });

  const findingsA = new Map(a.findings.map((f) => [f.ruleId, f]));
  const findingsB = new Map(b.findings.map((f) => [f.ruleId, f]));
  const allRules = [...new Set([...findingsA.keys(), ...findingsB.keys()])];
  const findings: FindingDiff[] = allRules
    .map((ruleId) => {
      const f = (findingsA.get(ruleId) ?? findingsB.get(ruleId)) as RiskFinding;
      const presence: FindingDiff["presence"] = findingsA.has(ruleId)
        ? findingsB.has(ruleId)
          ? "both"
          : "a"
        : "b";
      return { label: f.label, level: f.level, explanation: f.explanation, presence };
    })
    .sort((x, y) => {
      const oneSided = Number(x.presence !== "both");
      const oneSidedY = Number(y.presence !== "both");
      if (oneSided !== oneSidedY) return oneSidedY - oneSided;
      return LEVEL_ORDER[y.level] - LEVEL_ORDER[x.level];
    });

  const numbers: NumberDiff[] = (["duration", "money", "percentage"] as const)
    .map((kind) => ({
      kind,
      valuesA: a.keyFacts.filter((f) => f.kind === kind).map((f) => f.text).slice(0, 5),
      valuesB: b.keyFacts.filter((f) => f.kind === kind).map((f) => f.text).slice(0, 5),
    }))
    .filter((n) => n.valuesA.length > 0 || n.valuesB.length > 0);

  const verdicts: string[] = [];
  const highA = a.riskProfile.high;
  const highB = b.riskProfile.high;
  if (highA !== highB) {
    const [worse, better, wn, bn] =
      highA > highB ? ["A", "B", highA, highB] : ["B", "A", highB, highA];
    verdicts.push(
      `Document ${worse} carries more high-risk clauses (${wn} vs ${bn}). That does not automatically make Document ${better} the better deal — but it does mean ${worse} needs the harder read.`,
    );
  } else if (highA > 0) {
    verdicts.push(
      `Both documents carry ${highA} high-risk clause${highA === 1 ? "" : "s"} — compare them side by side below before choosing either.`,
    );
  } else {
    verdicts.push("Neither document was flagged high-risk by the patterns this tool knows.");
  }

  const onlyA = findings.filter((f) => f.presence === "a" && f.level !== "low");
  const onlyB = findings.filter((f) => f.presence === "b" && f.level !== "low");
  if (onlyA.length > 0) {
    verdicts.push(
      `Only Document A has: ${onlyA.map((f) => f.label.toLowerCase()).join(", ")}.`,
    );
  }
  if (onlyB.length > 0) {
    verdicts.push(
      `Only Document B has: ${onlyB.map((f) => f.label.toLowerCase()).join(", ")}.`,
    );
  }

  const gapRows = categories.filter((c) => c.inA !== c.inB);
  if (gapRows.length > 0) {
    verdicts.push(
      `Coverage differs on ${gapRows.length} topic${gapRows.length === 1 ? "" : "s"} — where one document is silent, the other side's version of events usually fills the gap.`,
    );
  }

  if (a.readability.fleschScore !== b.readability.fleschScore) {
    const harder = a.readability.fleschScore < b.readability.fleschScore ? "A" : "B";
    verdicts.push(`Document ${harder} is written in noticeably harder language.`);
  }

  return { categories, findings, numbers, verdicts };
}
