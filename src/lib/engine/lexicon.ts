/**
 * The risk lexicon: every rule the classifier can fire.
 *
 * Each rule is a regular expression with an explanation and a piece of advice
 * attached. When a rule fires, the exact matched span is kept as evidence, so
 * every flag in the UI can show the words that triggered it. Nothing is
 * flagged that cannot be pointed at.
 *
 * Levels, roughly: **high** — commonly costs people money or rights and is
 * worth negotiating or walking away over; **medium** — standard but worth
 * understanding before signing; **low** — ordinary boilerplate a reader
 * should simply know is there.
 */

import type { ClauseCategory, RiskLevel } from "./types";

export interface LexiconRule {
  id: string;
  category: ClauseCategory;
  level: RiskLevel;
  label: string;
  pattern: RegExp;
  explanation: string;
  advice: string;
}

/** Category metadata for badges and the compare matrix. */
export const CATEGORY_LABELS: Record<ClauseCategory, string> = {
  "termination": "Termination",
  "auto-renewal": "Auto-renewal",
  "payment": "Payment",
  "deposit": "Deposit",
  "penalty": "Penalties & late fees",
  "indemnification": "Indemnification",
  "liability": "Liability",
  "arbitration": "Dispute resolution",
  "governing-law": "Governing law",
  "confidentiality": "Confidentiality",
  "non-compete": "Non-compete",
  "assignment": "Assignment",
  "unilateral-changes": "Unilateral changes",
  "waiver": "Waiver of rights",
  "warranty": "Warranties",
  "privacy-data": "Privacy & data",
  "intellectual-property": "Intellectual property",
  "notice": "Notice",
  "maintenance": "Maintenance & repairs",
  "entry-access": "Entry & access",
  "insurance": "Insurance",
  "force-majeure": "Force majeure",
  "severability": "Severability",
  "entire-agreement": "Entire agreement",
  "general": "General",
};

export const LEXICON: LexiconRule[] = [
  // ── Renewal and term traps ──────────────────────────────────────────
  {
    id: "auto-renewal",
    category: "auto-renewal",
    level: "high",
    label: "Automatic renewal",
    pattern: /\b(?:automatic(?:ally)?\s+renew|auto-?renew|renew(?:s|ed)?\s+automatically|deemed\s+(?:to\s+be\s+)?renewed|successive\s+(?:renewal\s+)?(?:terms?|periods?))\b/i,
    explanation:
      "The agreement extends itself unless you actively cancel before a deadline. Missing that window locks you in for another full term.",
    advice:
      "Find the cancellation deadline and set a reminder well before it. Ask for renewal to require your explicit agreement instead.",
  },
  {
    id: "lock-in",
    category: "termination",
    level: "high",
    label: "Lock-in period",
    pattern: /\b(?:lock-?in\s+period|minimum\s+(?:commitment|term|period)\s+of|may\s+not\s+(?:be\s+)?terminat\w+\s+(?:during|before|within)|no\s+termination\s+(?:during|before))\b/i,
    explanation:
      "You cannot exit during this period even if circumstances change — or you can only exit by paying for the remainder.",
    advice:
      "Check what leaving early actually costs, and whether exceptions exist for events like job relocation or breach by the other side.",
  },
  {
    id: "early-termination-fee",
    category: "penalty",
    level: "high",
    label: "Early termination fee",
    pattern: /\b(?:early\s+termination\s+(?:fee|charge|penalty)|terminat\w+\s+(?:fee|charge|penalty)|pay\s+(?:the\s+)?(?:remaining|balance\s+of\s+the)\s+(?:rent|term|fees?)|forfeit\w*\s+.{0,40}(?:deposit|amount|fee))\b/i,
    explanation:
      "Leaving early has a price tag — a fixed fee, the rest of the term's payments, or a forfeited deposit.",
    advice:
      "Work out the worst-case exit cost in actual money before signing, and compare it against how likely you are to need out.",
  },
  {
    id: "unilateral-termination",
    category: "termination",
    level: "high",
    label: "One-sided termination",
    pattern: /\b(?:(?:company|landlord|lessor|owner|provider|licensor|employer|we)\s+may\s+terminate\s+(?:this\s+)?(?:agreement|lease|licen[cs]e|contract)?\s*(?:at\s+any\s+time|without\s+(?:cause|notice|reason))|terminate\s+(?:at\s+its\s+sole|in\s+its\s+sole)\s+discretion|with\s+or\s+without\s+cause)\b/i,
    explanation:
      "One side can end the agreement whenever it likes, while you are likely bound to notice periods or fees. The exit rights are not symmetrical.",
    advice:
      "Compare your termination rights against theirs, and ask for the same notice period to apply to both sides.",
  },

  // ── Money ───────────────────────────────────────────────────────────
  {
    id: "non-refundable",
    category: "payment",
    level: "high",
    label: "Non-refundable payment",
    pattern: /\b(?:non-?refundable|not\s+(?:be\s+)?refund(?:ed|able)|no\s+refunds?)\b/i,
    explanation:
      "Money paid under this clause is gone regardless of whether you receive the service, cancel, or the other side fails to deliver.",
    advice:
      "Ask under what circumstances a refund IS possible, and get any promised exceptions in writing.",
  },
  {
    id: "late-fee",
    category: "penalty",
    level: "medium",
    label: "Late fees / interest",
    pattern: /\b(?:late\s+(?:fee|charge|payment\s+(?:fee|charge|penalty))|interest\s+(?:at|of)\s+.{0,25}(?:%|percent|per\s+(?:month|annum|day))|penalty\s+of|liquidated\s+damages)\b/i,
    explanation:
      "Missing a payment triggers extra charges. Percentage rates compound quickly — 2% per month is over 26% a year.",
    advice:
      "Convert the rate to an annual figure so you know the real cost, and check whether there is a grace period.",
  },
  {
    id: "rent-escalation",
    category: "payment",
    level: "medium",
    label: "Price escalation",
    pattern: /\b(?:(?:rent|fee|price|rate)s?\s+(?:shall|will|may)\s+(?:be\s+)?(?:increas\w+|escalat\w+|revis\w+)|annual\s+(?:increase|increment|escalation)|increase\s+(?:of|by)\s+\d{1,3}\s?(?:%|percent))\b/i,
    explanation:
      "The price rises on a schedule — the amount you agree today is not the amount you'll pay later in the term.",
    advice:
      "Compute the final-year cost, not the first-year cost, and check whether increases are capped.",
  },
  {
    id: "deposit-conditions",
    category: "deposit",
    level: "medium",
    label: "Deposit deductions",
    pattern: /\b(?:deduct\w*\s+from\s+the\s+(?:security\s+)?deposit|deposit\s+(?:shall|will|may)\s+be\s+(?:adjusted|applied|forfeited|retained|withheld)|forfeit\w*\s+(?:the\s+)?(?:security\s+)?deposit)\b/i,
    explanation:
      "Spells out when the other side can keep some or all of your deposit. Vague grounds ('damages', 'cleaning') are where deposits disappear.",
    advice:
      "Insist on a move-in condition report with photos, and ask for deduction grounds to be specific and itemised.",
  },
  {
    id: "attorney-fees",
    category: "penalty",
    level: "medium",
    label: "You pay their legal costs",
    pattern: /\b(?:(?:reasonable\s+)?attorneys?'?s?\s+fees|legal\s+(?:fees|costs)\s+(?:and\s+expenses\s+)?(?:shall|will)\s+be\s+borne\s+by|recover\s+.{0,30}costs\s+of\s+(?:collection|enforcement))\b/i,
    explanation:
      "If a dispute goes their way — or sometimes merely if they enforce the contract — you pay their lawyers too, which can dwarf the original amount.",
    advice:
      "Ask for a mutual clause: whichever side wins recovers costs, not just theirs.",
  },

  // ── Liability and indemnity ─────────────────────────────────────────
  {
    id: "one-way-indemnity",
    category: "indemnification",
    level: "high",
    label: "Indemnification",
    pattern: /\b(?:indemnif\w+|hold\s+(?:\w+\s+)?harmless|defend,?\s+indemnify)\b/i,
    explanation:
      "You promise to cover the other side's losses, legal costs included, for claims arising from the agreement. If it is one-way, your exposure is open-ended while theirs is zero.",
    advice:
      "Check whether it runs both ways, whether it is capped, and whether it covers their own negligence — that last one is worth pushing back on.",
  },
  {
    id: "liability-cap",
    category: "liability",
    level: "medium",
    label: "Liability cap",
    pattern: /\b(?:liability\s+(?:shall|will|is)\s+(?:be\s+)?limited\s+to|(?:aggregate|total|maximum)\s+liability|in\s+no\s+event\s+shall\s+.{0,60}(?:be\s+liable|liability)\s+exceed|shall\s+not\s+exceed\s+the\s+(?:amount|fees)\s+paid)\b/i,
    explanation:
      "Caps what you can recover from them if things go wrong — often to the fees you already paid, which may be far less than your actual loss.",
    advice:
      "Compare the cap against what a realistic failure would cost you. Carve-outs for data breaches or gross negligence are common asks.",
  },
  {
    id: "consequential-waiver",
    category: "liability",
    level: "medium",
    label: "No indirect damages",
    pattern: /\b(?:consequential|incidental|indirect|special|punitive|exemplary)\s+(?:\w+\s+){0,3}damages\b/i,
    explanation:
      "Excludes compensation for knock-on losses — lost income, lost data, lost opportunities — which are often the losses that actually hurt.",
    advice:
      "If a failure by them would cost you downstream (e.g. your business stops), ask for specific carve-outs.",
  },
  {
    id: "as-is",
    category: "warranty",
    level: "medium",
    label: "“As is” — no warranties",
    pattern: /\b(?:as[-\s]is|as\s+available|without\s+(?:any\s+)?warrant(?:y|ies)|disclaims?\s+all\s+warrant(?:y|ies)|no\s+warrant(?:y|ies)\s+of\s+any\s+kind)\b/i,
    explanation:
      "The product or property comes with no promises about condition or fitness. If it is defective, that is your problem.",
    advice:
      "Inspect before you commit, and get any verbal assurances written into the agreement — spoken promises are excluded by this clause.",
  },

  // ── Disputes ────────────────────────────────────────────────────────
  {
    id: "binding-arbitration",
    category: "arbitration",
    level: "high",
    label: "Binding arbitration",
    pattern: /\b(?:binding\s+arbitration|resolved?\s+(?:exclusively\s+)?(?:by|through)\s+arbitration|submit(?:ted)?\s+to\s+(?:final\s+and\s+binding\s+)?arbitration|arbitration\s+shall\s+be\s+(?:final|binding))\b/i,
    explanation:
      "Disputes go to a private arbitrator instead of a court. You give up the right to sue, usually with no appeal, and the process can favour the party that wrote the clause.",
    advice:
      "Check who picks and pays the arbitrator and where hearings happen. Ask whether small-claims court is carved out.",
  },
  {
    id: "class-action-waiver",
    category: "waiver",
    level: "high",
    label: "Class action waiver",
    pattern: /\b(?:class\s+action\s+waiver|waive\w*\s+.{0,60}(?:class|representative)\s+(?:\w+\s+)?(?:action|proceeding|member)|only\s+(?:on\s+an?\s+)?individual\s+(?:basis|capacity)|not\s+.{0,30}(?:class|representative)\s+(?:action|member|proceeding)|class\s+or\s+representative\s+proceeding)\b/i,
    explanation:
      "You can only bring claims alone, never jointly with others — which makes small-value claims practically impossible to pursue.",
    advice:
      "Know that this often accompanies arbitration clauses; in some jurisdictions such waivers are unenforceable, which is a question for a professional.",
  },
  {
    id: "jury-waiver",
    category: "waiver",
    level: "high",
    label: "Jury trial waiver",
    pattern: /\b(?:waive\w*\s+.{0,40}(?:right\s+to\s+a?\s*)?(?:trial\s+by\s+)?jury|jury\s+trial\s+waiver)\b/i,
    explanation:
      "If a dispute does reach court, you have agreed in advance to have it decided by a judge alone.",
    advice:
      "Flag this for a legal professional — the significance varies a lot by jurisdiction.",
  },
  {
    id: "distant-forum",
    category: "governing-law",
    level: "medium",
    label: "Exclusive jurisdiction",
    pattern: /\b(?:exclusive\s+(?:jurisdiction|venue)|courts?\s+(?:of|at|in)\s+[A-Z][a-zA-Z ]+\s+(?:shall|will)\s+have\s+(?:exclusive\s+)?jurisdiction|submit\s+to\s+the\s+(?:exclusive\s+)?jurisdiction|governed\s+by\s+(?:and\s+construed\s+(?:in\s+accordance\s+with|under)\s+)?the\s+laws?\s+of)\b/i,
    explanation:
      "Disputes must be brought in a specific place under a specific law. If that place is far from you, enforcing your rights means travelling there.",
    advice:
      "Check where the named courts sit. If pursuing a claim means a flight, the clause effectively prices you out of small disputes.",
  },

  // ── Power imbalances ────────────────────────────────────────────────
  {
    id: "unilateral-modification",
    category: "unilateral-changes",
    level: "high",
    label: "They can change the terms",
    pattern: /\b(?:(?:we|company|provider|licensor)\s+(?:reserves?\s+the\s+right\s+to|may)\s+(?:modify|change|amend|update|revise)\s+(?:these\s+terms|this\s+agreement|the\s+(?:terms|fees|services))|(?:modify|change|amend)\s+.{0,30}at\s+any\s+time\s+(?:without|with\s+or\s+without)\s+(?:prior\s+)?notice|continued\s+use\s+.{0,40}constitutes\s+acceptance)\b/i,
    explanation:
      "The other side can rewrite the deal after you sign, sometimes without telling you. What you agreed to today is only the starting point.",
    advice:
      "Ask for advance written notice of changes and the right to exit without penalty if you reject them.",
  },
  {
    id: "sole-discretion",
    category: "unilateral-changes",
    level: "medium",
    label: "Sole discretion",
    pattern: /\b(?:at\s+(?:its|our|his|her|their)\s+sole\s+(?:and\s+absolute\s+)?discretion|in\s+(?:its|our)\s+sole\s+judgment|sole\s+discretion)\b/i,
    explanation:
      "Decisions under this clause are theirs alone to make — you have no say and, typically, no appeal.",
    advice:
      "Note what exactly is left to their discretion. If it touches your money or your exit rights, ask for objective criteria instead.",
  },
  {
    id: "asymmetric-assignment",
    category: "assignment",
    level: "medium",
    label: "Assignment restrictions",
    pattern: /\b(?:may\s+not\s+(?:assign|transfer|sublet|sublease|delegate)|shall\s+not\s+(?:assign|transfer|sublet|sublease)|without\s+(?:the\s+)?prior\s+written\s+consent\s+.{0,30}(?:assign|transfer|sublet)|(?:assign|transfer)\s+.{0,50}without\s+(?:your\s+)?consent)\b/i,
    explanation:
      "Controls who can hand the agreement to someone else. Often you cannot, while they can freely transfer it — including to a company you have never heard of.",
    advice:
      "Check whether the restriction is mutual. If they can assign freely, ask that any assignee must honour the same terms.",
  },
  {
    id: "unilateral-setoff",
    category: "payment",
    level: "medium",
    label: "Set-off rights",
    pattern: /\b(?:set-?off|deduct\w*\s+(?:any\s+)?(?:amounts?|sums?)\s+(?:owed|due|payable)|withhold\s+(?:payment|amounts?|salary|wages))\b/i,
    explanation:
      "They can subtract money they say you owe from money they owe you — salary, deposits, invoices — before you see it.",
    advice:
      "Ask for set-off to require an itemised written statement first, so deductions can be checked and disputed.",
  },

  // ── Restraints on you ───────────────────────────────────────────────
  {
    id: "non-compete",
    category: "non-compete",
    level: "high",
    label: "Non-compete",
    pattern: /\b(?:non-?compet\w+|shall\s+not\s+.{0,40}(?:engage\s+in|carry\s+on|be\s+employed\s+(?:by|in)|provide\s+services\s+to)\s+.{0,40}(?:compet\w+|similar\s+business)|restrain\w*\s+of\s+trade)\b/i,
    explanation:
      "Restricts where you can work or what business you can run after this agreement ends. Scope, duration and geography decide whether it is reasonable — or enforceable at all.",
    advice:
      "Map exactly what work it would forbid and for how long. Enforceability varies widely by jurisdiction; this one is worth professional advice.",
  },
  {
    id: "non-solicit",
    category: "non-compete",
    level: "medium",
    label: "Non-solicitation",
    pattern: /\b(?:non-?solicit\w+|shall\s+not\s+(?:directly\s+or\s+indirectly\s+)?solicit|induce\s+.{0,30}(?:employee|customer|client)s?\s+to\s+(?:leave|terminate))\b/i,
    explanation:
      "After leaving, you cannot approach their clients or recruit their staff for a period. Broad versions can block you from serving people who came to you unprompted.",
    advice:
      "Ask to narrow it to clients you personally dealt with, and to exclude people who approach you on their own.",
  },
  {
    id: "broad-confidentiality",
    category: "confidentiality",
    level: "medium",
    label: "Confidentiality obligations",
    pattern: /\b(?:confidential\s+information|non-?disclosure|shall\s+(?:keep|hold|maintain)\s+.{0,30}(?:confiden(?:ce|tial)|secret)|trade\s+secrets?)\b/i,
    explanation:
      "Defines what you must keep secret and for how long. Watch the definition: 'all information disclosed' with no exclusions and no end date is a lifetime obligation.",
    advice:
      "Check for standard exclusions (public knowledge, independently developed, legally compelled) and a defined duration.",
  },
  {
    id: "perpetual-obligation",
    category: "confidentiality",
    level: "medium",
    label: "Survives termination",
    pattern: /\b(?:surviv\w+\s+(?:the\s+)?(?:termination|expir\w+)|perpetual(?:ly)?|in\s+perpetuity|shall\s+(?:remain|continue)\s+in\s+(?:full\s+)?(?:force|effect)\s+(?:after|following|notwithstanding))\b/i,
    explanation:
      "Parts of this agreement keep binding you after it ends — sometimes forever.",
    advice:
      "List which duties survive and for how long, so you know what you are still carrying after the relationship ends.",
  },
  {
    id: "ip-assignment",
    category: "intellectual-property",
    level: "high",
    label: "IP assignment",
    pattern: /\b(?:(?:hereby\s+)?assigns?\s+.{0,60}(?:intellectual\s+property|inventions?|works?|copyright)|work\s+(?:made\s+)?for\s+hire|all\s+(?:right,?\s+title,?\s+and\s+interest|inventions|work\s+product)\s+.{0,40}(?:belong|vest|shall\s+be\s+the\s+(?:sole\s+)?property))\b/i,
    explanation:
      "What you create becomes theirs. Broad versions capture things you make on your own time or before/after the engagement.",
    advice:
      "Ask to limit it to work created for them, during the engagement, using their resources — and to list any prior work you are keeping.",
  },
  {
    id: "license-to-content",
    category: "intellectual-property",
    level: "medium",
    label: "Broad content license",
    pattern: /\b(?:perpetual,?\s+irrevocable|royalty-?free,?\s+(?:worldwide|perpetual)|worldwide,?\s+(?:non-?exclusive,?\s+)?royalty-?free)\s+(?:\w+,?\s+){0,4}licen[cs]e\b/i,
    explanation:
      "You grant them a permanent, unpaid right to use what you upload or create — even after you leave the service.",
    advice:
      "Check whether the license ends when you delete your content or close your account.",
  },

  // ── Property-specific ───────────────────────────────────────────────
  {
    id: "entry-without-notice",
    category: "entry-access",
    level: "high",
    label: "Entry without notice",
    pattern: /\b(?:enter\s+(?:the\s+)?(?:premises|property|unit|apartment|room|flat|house|accommodation)\s+(?:at\s+any\s+time|without\s+(?:prior\s+)?notice)|right\s+(?:of|to)\s+(?:entry|inspect\w*)\s+(?:at\s+any\s+time|without\s+notice))\b/i,
    explanation:
      "The landlord can come in whenever they choose. Standard practice — and in many places the law — is reasonable advance notice except in emergencies.",
    advice:
      "Ask for a notice requirement (24–48 hours is typical) with an exception only for genuine emergencies.",
  },
  {
    id: "tenant-repairs",
    category: "maintenance",
    level: "medium",
    label: "Repairs shifted to you",
    pattern: /\b(?:tenant|lessee|licensee|guest|occupant)\s+(?:shall|will|is\s+responsible\s+(?:for|to))\s+(?:\w+\s+){0,6}?(?:repair|maintain|maintenance|upkeep)\b/i,
    explanation:
      "Maintenance costs that usually fall on the owner are moved to you. 'All repairs' can include structural problems you did not cause.",
    advice:
      "Ask to limit your responsibility to damage you cause, with the owner keeping structural, electrical and plumbing repairs.",
  },
  {
    id: "insurance-required",
    category: "insurance",
    level: "low",
    label: "Insurance requirement",
    pattern: /\b(?:shall\s+(?:obtain|maintain|carry)\s+(?:\w+\s+){0,4}insurance|proof\s+of\s+insurance|named\s+as\s+(?:an\s+)?additional\s+insured)\b/i,
    explanation:
      "You must buy and maintain insurance — a real recurring cost on top of the headline price.",
    advice:
      "Price the required policy before signing and add it to the true cost of the agreement.",
  },

  // ── Data ────────────────────────────────────────────────────────────
  {
    id: "data-sharing",
    category: "privacy-data",
    level: "medium",
    label: "Data sharing",
    pattern: /\b(?:share\s+(?:your\s+)?(?:personal\s+)?(?:data|information)\s+with|disclose\s+.{0,30}(?:to\s+)?third\s+part(?:y|ies)|sell\s+.{0,20}(?:personal\s+)?(?:data|information)|affiliates?\s+and\s+partners)\b/i,
    explanation:
      "Your information can go to companies you have no relationship with, under their privacy practices, not these.",
    advice:
      "Look for who exactly receives data and whether you can opt out. 'Partners' with no list means anyone.",
  },

  // ── Quiet boilerplate worth knowing about ───────────────────────────
  {
    id: "entire-agreement",
    category: "entire-agreement",
    level: "low",
    label: "Entire agreement",
    pattern: /\b(?:entire\s+(?:agreement|understanding)|supersedes?\s+all\s+(?:prior|previous)\s+(?:agreements?|understandings?|negotiations?|representations?))\b/i,
    explanation:
      "Only what is written here counts. Anything promised in conversation, email or a brochure is legally erased unless it appears in this document.",
    advice:
      "If something was promised verbally, get it added to the document before signing — this clause is why.",
  },
  {
    id: "severability",
    category: "severability",
    level: "low",
    label: "Severability",
    pattern: /\b(?:severab\w+|if\s+any\s+provision\s+.{0,40}(?:invalid|unenforceable|illegal))\b/i,
    explanation:
      "If a court strikes down one clause, the rest of the agreement still stands.",
    advice: "Ordinary boilerplate — no action needed.",
  },
  {
    id: "no-waiver",
    category: "waiver",
    level: "low",
    label: "No waiver",
    pattern: /\b(?:failure\s+(?:or\s+delay\s+)?to\s+enforce|no\s+waiver\s+of\s+any|shall\s+not\s+(?:constitute|be\s+deemed)\s+a\s+waiver)\b/i,
    explanation:
      "Letting a breach slide once does not give up the right to enforce it later. If they ignored a late fee last month, they can still charge it next month.",
    advice: "Do not read past leniency as a change to the rules.",
  },
  {
    id: "force-majeure",
    category: "force-majeure",
    level: "low",
    label: "Force majeure",
    pattern: /\b(?:force\s+majeure|acts?\s+of\s+god|beyond\s+(?:its|their|the)\s+reasonable\s+control)\b/i,
    explanation:
      "Neither side is liable for failures caused by events outside their control — disasters, wars, and similar.",
    advice:
      "Check whether your payment obligations pause too, or whether you must keep paying while they are excused from delivering.",
  },
  {
    id: "notice-formality",
    category: "notice",
    level: "low",
    label: "Formal notice required",
    pattern: /\b(?:notices?\s+(?:shall|must)\s+be\s+(?:in\s+writing|given|sent|delivered)|written\s+notice\s+(?:of|to)|by\s+(?:registered|certified)\s+(?:mail|post))\b/i,
    explanation:
      "Notices only count if delivered the specified way. A text message or phone call may be legally invisible.",
    advice:
      "When it matters — cancelling, complaining, terminating — use exactly the method written here and keep proof.",
  },
  {
    id: "time-of-essence",
    category: "notice",
    level: "low",
    label: "Time is of the essence",
    pattern: /\btime\s+is\s+of\s+the\s+essence\b/i,
    explanation:
      "Deadlines in this agreement are strict: even a small delay can count as a breach of contract.",
    advice: "Treat every date in the document as a hard deadline.",
  },
  {
    id: "personal-guarantee",
    category: "liability",
    level: "high",
    label: "Personal guarantee",
    pattern: /\b(?:personal(?:ly)?\s+guarantee|guarantor|jointly\s+and\s+severally\s+liable)\b/i,
    explanation:
      "Someone is personally on the hook — their own assets, not just the business's — and 'jointly and severally' means any one person can be pursued for the whole amount.",
    advice:
      "Understand exactly whose assets are exposed and for how much before anyone signs as guarantor.",
  },
  {
    id: "confession-of-judgment",
    category: "waiver",
    level: "high",
    label: "Confession of judgment",
    pattern: /\b(?:confess(?:ion)?\s+(?:of\s+)?judgment|cognovit|waive\w*\s+.{0,30}(?:service\s+of\s+process|right\s+to\s+(?:notice\s+and\s+)?(?:a\s+)?hearing))\b/i,
    explanation:
      "You agree in advance to lose: they can obtain a court judgment against you without a trial, sometimes without you even being notified.",
    advice:
      "This is a serious waiver that is illegal in many places. Do not sign without professional advice.",
  },
  {
    id: "unpaid-work",
    category: "payment",
    level: "medium",
    label: "Payment conditions",
    pattern: /\b(?:payment\s+(?:is\s+)?(?:subject\s+to|conditional\s+(?:up)?on|contingent\s+(?:up)?on)|no\s+payment\s+(?:shall\s+be\s+)?(?:due|made)\s+(?:until|unless)|upon\s+(?:client|customer)\s+approval)\b/i,
    explanation:
      "Getting paid depends on a condition — approval, acceptance, their client paying them. If the condition never happens, the money may never be due.",
    advice:
      "Ask for objective acceptance criteria and a deadline after which work is deemed accepted.",
  },
  {
    id: "probation-terms",
    category: "termination",
    level: "medium",
    label: "Probation period",
    pattern: /\b(?:probation(?:ary)?\s+period|during\s+probation)\b/i,
    explanation:
      "During probation you can usually be let go with little or no notice, and some benefits may not apply yet.",
    advice:
      "Check how long probation lasts, what notice applies during it, and what changes when it ends.",
  },
  {
    id: "salary-deduction",
    category: "payment",
    level: "high",
    label: "Deductions from pay",
    pattern: /\b(?:deduct\w*\s+from\s+(?:the\s+)?(?:salary|wages|pay|remuneration|compensation)|recover\w*\s+from\s+(?:the\s+)?(?:salary|wages|final\s+settlement)|training\s+(?:costs?|bond)|employment\s+bond)\b/i,
    explanation:
      "The employer can take money out of your pay — for training costs, notice shortfall, equipment, or a bond. Bonds can mean owing money for quitting.",
    advice:
      "Get the exact amounts and triggers in writing. Employment bonds are restricted or unenforceable in many jurisdictions — worth checking.",
  },
];
