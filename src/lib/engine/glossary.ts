/**
 * Plain-language glossary of legal terms.
 *
 * Matched against document text to surface definitions in place, and served
 * on its own page. Definitions describe what the term *does to the reader*,
 * not its etymology.
 */

export interface GlossaryEntry {
  term: string;
  /** Additional surface forms that should match the same entry. */
  aliases?: string[];
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: "indemnify", aliases: ["indemnification", "indemnity", "hold harmless"], definition: "To promise to pay for the other side's losses or legal costs if certain things go wrong — you become their insurance." },
  { term: "arbitration", aliases: ["arbitrator", "arbitral"], definition: "Settling a dispute through a private decision-maker instead of a court. Usually faster, but there is typically no appeal and no jury." },
  { term: "liquidated damages", definition: "A pre-agreed penalty amount for breaking the contract, owed regardless of what the breach actually cost." },
  { term: "force majeure", definition: "Events beyond anyone's control — disasters, wars, epidemics — that excuse a party from performing its obligations while the event lasts." },
  { term: "severability", aliases: ["severable"], definition: "If a court cancels one clause, the rest of the contract still stands." },
  { term: "waiver", aliases: ["waive", "waives"], definition: "Giving up a right. Once waived — sometimes just by not enforcing it — the right may be hard to get back." },
  { term: "jurisdiction", definition: "Which court (and whose law) has the power to decide disputes under the contract." },
  { term: "governing law", aliases: ["choice of law"], definition: "The legal system whose rules are used to interpret the contract — which may not be where you live." },
  { term: "assignment", aliases: ["assign", "assignee"], definition: "Transferring your side of the contract to someone else. Contracts often forbid you from doing it while allowing the other side to." },
  { term: "sublet", aliases: ["sublease", "sublicense"], definition: "Renting out something you are renting. Usually needs the owner's written permission." },
  { term: "lessor", definition: "The owner who rents property out — the landlord." },
  { term: "lessee", definition: "The person renting the property — the tenant." },
  { term: "licensor", definition: "The party granting permission to use something (software, property, a brand)." },
  { term: "licensee", definition: "The party receiving permission to use something." },
  { term: "consideration", definition: "What each side gives the other to make the contract binding — money, services, promises. A contract without it may not be enforceable." },
  { term: "breach", aliases: ["material breach"], definition: "Breaking a promise made in the contract. A 'material' breach is one serious enough to justify the other side ending the deal." },
  { term: "remedy", aliases: ["remedies"], definition: "What the wronged side gets when the contract is breached — damages, termination, or a court order to perform." },
  { term: "injunction", aliases: ["injunctive relief", "equitable relief"], definition: "A court order forcing someone to do — or stop doing — something, rather than just paying money." },
  { term: "liability", aliases: ["liable"], definition: "Legal responsibility to pay for harm or loss." },
  { term: "consequential damages", aliases: ["indirect damages", "incidental damages"], definition: "Knock-on losses caused by a breach — lost profits, lost data, lost opportunities — as opposed to direct, immediate losses." },
  { term: "punitive damages", aliases: ["exemplary damages"], definition: "Extra money awarded to punish especially bad conduct, beyond compensating the actual loss." },
  { term: "warranty", aliases: ["warranties", "warrants"], definition: "A promise that something is true or will work as described. 'As is' means no such promises." },
  { term: "representation", aliases: ["represents and warrants"], definition: "A statement of fact one side makes to convince the other to sign. If false, the misled party may have remedies." },
  { term: "covenant", aliases: ["covenants"], definition: "A formal promise inside a contract to do or not do something." },
  { term: "term", aliases: ["initial term", "renewal term"], definition: "How long the contract lasts. The 'initial term' is the first stretch; 'renewal terms' are extensions." },
  { term: "termination", aliases: ["terminate"], definition: "Ending the contract before it would naturally expire. The clause says who may do it, when, and at what cost." },
  { term: "notice period", definition: "The advance warning required before an action — quitting, cancelling, terminating — takes effect." },
  { term: "lock-in period", aliases: ["lock in period", "minimum term"], definition: "A stretch of time during which you cannot leave the agreement without paying a penalty — often the rent or fees for the rest of that period." },
  { term: "leave and licence", aliases: ["leave and license"], definition: "A common Indian arrangement where you get permission to use a property, not a tenancy — it usually gives you fewer rights to stay than a lease does." },
  { term: "paying guest", aliases: ["PG accommodation"], definition: "Living in a room in someone else's property, often with meals included, under a licence rather than a lease." },
  { term: "rent escalation", aliases: ["escalation clause"], definition: "A built-in rent increase — a fixed percentage or amount at set times, usually each renewal or each year." },
  { term: "probation", aliases: ["probationary period"], definition: "A trial period at the start of a job when either side can usually end the employment quickly, often with little or no notice." },
  { term: "stamp duty", definition: "A government tax paid on certain documents, such as leases, to make them legally valid as evidence. Who pays it is often set in the agreement." },
  { term: "training bond", aliases: ["service bond", "employment bond"], definition: "A promise to stay with an employer for a set time, or pay back a sum — often described as training costs — if you leave early." },
  { term: "non-compete", aliases: ["non compete", "non-competition"], definition: "A restriction on working for competitors or starting a competing business, during or after the job. How far it can be enforced varies widely by country." },
  { term: "notarised", aliases: ["notarized", "notary"], definition: "Signed in front of a notary, who confirms the identities of the people signing. It proves who signed, not that the terms are fair." },
  { term: "cure period", aliases: ["right to cure"], definition: "Time given to fix a breach before the other side may act on it. No cure period means one mistake can end the deal instantly." },
  { term: "default", definition: "Failing to meet an obligation — most often, failing to pay on time." },
  { term: "security deposit", definition: "Money held as protection against damage or unpaid amounts, returned at the end if all is well — the clause controls when it isn't." },
  { term: "escrow", definition: "Money or documents held by a neutral third party until agreed conditions are met." },
  { term: "lien", definition: "A legal claim over property as security for a debt — the property can be held or sold if the debt goes unpaid." },
  { term: "encumbrance", definition: "Any claim, lien or restriction attached to a property that limits how freely it can be used or sold." },
  { term: "pro rata", aliases: ["pro-rata"], definition: "Divided proportionally — for example rent for a partial month calculated by the day." },
  { term: "per annum", definition: "Per year. Interest 'at 2% per month' is about 26.8% per annum compounded — always convert." },
  { term: "joint and several liability", aliases: ["jointly and severally"], definition: "Each person is responsible for the whole obligation, not just their share — one flatmate can be pursued for everyone's rent." },
  { term: "subrogation", definition: "An insurer's right, after paying your claim, to step into your shoes and sue whoever caused the loss." },
  { term: "estoppel", definition: "Being barred from claiming something contrary to what you previously stated or accepted as true." },
  { term: "novation", definition: "Replacing a contract, or a party to it, with a new one — everyone's consent required." },
  { term: "quiet enjoyment", definition: "A tenant's right to use the property without unreasonable interference from the landlord." },
  { term: "holdover", aliases: ["holding over"], definition: "Staying past the end of a lease. Often triggers steep 'holdover rent' — check the rate." },
  { term: "work for hire", aliases: ["work made for hire"], definition: "Creative work that legally belongs to whoever commissioned it, not the person who made it, from the moment it exists." },
  { term: "moral rights", definition: "A creator's rights to be credited and to object to distortions of their work — contracts often ask you to waive them." },
  { term: "non-disclosure", aliases: ["nda"], definition: "An agreement (or clause) requiring information to be kept secret, with penalties for leaks." },
  { term: "solicit", aliases: ["solicitation", "non-solicitation"], definition: "Actively approaching someone — a client to win their business, or an employee to recruit them. Non-solicitation clauses forbid it after you leave." },
  { term: "garden leave", definition: "Being kept on payroll but away from work during a notice period, keeping you out of the market while still bound to the employer." },
  { term: "restrictive covenant", definition: "Umbrella term for clauses limiting what you can do after the contract ends: non-competes, non-solicits, confidentiality." },
  { term: "vesting", definition: "Earning rights (usually to shares or benefits) gradually over time. Leaving early forfeits the unvested part." },
  { term: "cliff", definition: "A vesting rule where nothing is earned until a set date, then a lump vests all at once — leave a day early, get nothing." },
  { term: "due diligence", definition: "The investigation a careful party makes before committing — checking title, finances, or claims." },
  { term: "without prejudice", definition: "A label meaning a statement or offer cannot be used as evidence later — commonly on settlement negotiations." },
  { term: "successors and assigns", definition: "Whoever legally steps into a party's place later — heirs, buyers of the business — is bound by (and benefits from) the contract." },
];

/**
 * Find glossary terms present in a text. Longest match wins per position and
 * each entry is reported once, so the same clause never lists a term twice.
 */
export function findJargon(text: string): Array<{ term: string; definition: string }> {
  const lower = text.toLowerCase();
  const found: Array<{ term: string; definition: string }> = [];
  const seen = new Set<string>();
  for (const entry of GLOSSARY) {
    if (seen.has(entry.term)) continue;
    const forms = [entry.term, ...(entry.aliases ?? [])];
    const hit = forms.some((form) =>
      new RegExp(`\\b${form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower),
    );
    if (hit) {
      seen.add(entry.term);
      found.push({ term: entry.term, definition: entry.definition });
    }
  }
  return found;
}
