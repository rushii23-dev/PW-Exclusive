/**
 * Clause classification: fire lexicon rules, collect evidence, derive risk.
 *
 * A clause's risk level is simply the worst level among its findings. There
 * is no scoring model to tune and nothing to hallucinate — remove the finding
 * and the risk goes with it.
 */

import { LEXICON } from "./lexicon";
import { byLevelDesc, worseLevel } from "./risk";
import { truncateAtWord } from "./text";
import type { ClauseCategory, RiskFinding, RiskLevel } from "./types";

export interface Classification {
  categories: ClauseCategory[];
  risk: RiskLevel | null;
  findings: RiskFinding[];
}

/** Extract the sentence-ish window around a match for use as evidence. */
function evidenceAround(text: string, index: number, matchLength: number): string {
  const windowStart = Math.max(0, text.lastIndexOf(".", index) + 1);
  const nextPeriod = text.indexOf(".", index + matchLength);
  const windowEnd = nextPeriod === -1 ? text.length : nextPeriod + 1;
  const sentence = text.slice(windowStart, windowEnd).trim();
  return truncateAtWord(sentence, 220);
}

export function classifyClause(text: string): Classification {
  const findings: RiskFinding[] = [];
  const categories = new Set<ClauseCategory>();

  for (const rule of LEXICON) {
    const match = rule.pattern.exec(text);
    if (!match) continue;
    categories.add(rule.category);
    findings.push({
      ruleId: rule.id,
      category: rule.category,
      level: rule.level,
      label: rule.label,
      explanation: rule.explanation,
      advice: rule.advice,
      evidence: evidenceAround(text, match.index, match[0].length),
    });
  }

  findings.sort(byLevelDesc);

  const risk = findings.reduce<RiskLevel | null>((worst, f) => worseLevel(worst, f.level), null);

  return { categories: [...categories], risk, findings };
}
