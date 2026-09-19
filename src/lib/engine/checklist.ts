/**
 * Next steps and lawyer-preparation questions, derived from the findings.
 *
 * Every checklist item names the finding that produced it, so nothing here is
 * generic filler — delete the finding and the item disappears with it.
 */

import type { Analysis, ChecklistItem, RiskFinding } from "./types";

/** Rule-specific checklist items. Falls back to the rule's advice. */
const CHECKLIST_BY_RULE: Record<string, string> = {
  "auto-renewal":
    "Find the renewal cut-off date and put a reminder in your calendar at least two weeks before it.",
  "lock-in": "Write down the exact lock-in end date and the cost of leaving before it.",
  "early-termination-fee": "Calculate the worst-case exit cost in actual money.",
  "non-refundable": "List every amount that becomes non-refundable the moment you sign.",
  "late-fee": "Convert any monthly interest rate to annual so you know the real cost of a missed payment.",
  "deposit-conditions":
    "Do a documented walkthrough with photos before moving in or starting, and share it in writing.",
  "binding-arbitration": "Look up where and how arbitration would happen, and who pays for it.",
  "distant-forum": "Check how far away the named courts are from where you live.",
  "unilateral-modification":
    "Ask for change notifications in writing and a penalty-free exit if you reject new terms.",
  "non-compete":
    "Write out exactly which jobs or clients this would forbid after you leave, and for how long.",
  "ip-assignment": "List any prior or personal work you want excluded, in writing, before signing.",
  "entry-without-notice": "Ask for a written notice period (24–48 hours) before any entry.",
  "salary-deduction": "Get every possible deduction and its trigger listed with exact amounts.",
  "personal-guarantee": "Confirm exactly whose personal assets are exposed and up to what amount.",
  "rent-escalation": "Compute the final-year price, not the first-year price.",
  "tenant-repairs": "Clarify in writing which repairs are yours and which stay with the owner.",
  "insurance-required": "Get a quote for the required insurance before signing — it is part of the price.",
};

/** Rule-specific questions for a legal professional. */
const LAWYER_QUESTION_BY_RULE: Record<string, string> = {
  "binding-arbitration": "Is this arbitration clause enforceable where I live, and does it block small-claims court?",
  "class-action-waiver": "Is a class-action waiver valid in my jurisdiction?",
  "jury-waiver": "What does waiving a jury trial mean for a dispute like mine?",
  "non-compete": "Is this non-compete enforceable given its duration and scope, and what happens if I ignore it?",
  "confession-of-judgment": "Is a confession of judgment legal here, and what exactly am I giving up?",
  "salary-deduction": "Can an employer lawfully make these deductions or enforce this bond where I work?",
  "one-way-indemnity": "How large could my exposure under this indemnity realistically get, and can it be capped?",
  "personal-guarantee": "What are the consequences of this guarantee for my personal assets?",
  "ip-assignment": "Does this clause capture work I do outside this engagement or created before it?",
  "unilateral-termination": "Do I have any protection if they terminate without cause?",
  "liability-cap": "Is this liability cap reasonable for what a failure would actually cost me?",
  "unilateral-modification": "Can they really change terms without my consent — what are my options if they do?",
  "perpetual-obligation": "Which of my obligations survive termination, and is an indefinite duration enforceable?",
};

const GENERIC_QUESTIONS = [
  "Which of these clauses are negotiable in practice, and what wording should I ask for?",
  "Is anything missing from this document that an agreement of this kind should contain?",
];

export function buildChecklist(findings: RiskFinding[]): ChecklistItem[] {
  const seen = new Set<string>();
  const items: ChecklistItem[] = [];
  for (const f of findings) {
    if (seen.has(f.ruleId)) continue;
    seen.add(f.ruleId);
    if (f.level === "low") continue; // Boilerplate doesn't earn homework.
    items.push({
      text: CHECKLIST_BY_RULE[f.ruleId] ?? f.advice,
      because: f.label,
    });
  }
  return items.slice(0, 10);
}

export function buildLawyerQuestions(findings: RiskFinding[]): string[] {
  const seen = new Set<string>();
  const questions: string[] = [];
  for (const f of findings) {
    const q = LAWYER_QUESTION_BY_RULE[f.ruleId];
    if (!q || seen.has(f.ruleId)) continue;
    seen.add(f.ruleId);
    questions.push(q);
  }
  // The generic questions are useful in every consultation; keep them last.
  return [...questions.slice(0, 6), ...GENERIC_QUESTIONS];
}

/** Plain-text export of the whole analysis, for printing or pasting. */
export function toPlainText(analysis: Analysis): string {
  const lines: string[] = [];
  lines.push(`${analysis.documentTypeLabel} — ClearClause analysis`);
  lines.push("=".repeat(50));
  lines.push("");
  lines.push("SUMMARY");
  for (const s of analysis.summary) lines.push(`  ${s}`);
  lines.push("");
  if (analysis.findings.length > 0) {
    lines.push("FLAGS");
    for (const f of analysis.findings) {
      lines.push(`  [${f.level.toUpperCase()}] ${f.label}: ${f.explanation}`);
    }
    lines.push("");
  }
  if (analysis.checklist.length > 0) {
    lines.push("BEFORE YOU SIGN");
    for (const item of analysis.checklist) lines.push(`  [ ] ${item.text} (${item.because})`);
    lines.push("");
  }
  if (analysis.lawyerQuestions.length > 0) {
    lines.push("QUESTIONS FOR A LEGAL PROFESSIONAL");
    for (const q of analysis.lawyerQuestions) lines.push(`  - ${q}`);
    lines.push("");
  }
  lines.push(
    "Generated by ClearClause. This is information, not legal advice; have important documents reviewed by a qualified professional.",
  );
  return lines.join("\n");
}
