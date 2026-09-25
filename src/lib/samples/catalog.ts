/**
 * The sample documents as the pages list them: a name and a line on what
 * each one shows.
 *
 * The texts themselves (about 17 KB) live in `./index` and reach the
 * browser only when a reader actually picks a sample — as a separate
 * script, fetched once — so the pages that offer samples don't carry six
 * contracts in their JavaScript.
 */

export const SAMPLE_CATALOG = [
  {
    id: "rental",
    title: "Rental agreement",
    description: "An 11-month lease with an auto-renewal trap, a one-sided termination clause and a deposit that can vanish.",
  },
  {
    id: "employment",
    title: "Employment contract",
    description: "An offer with a training bond, a 24-month non-compete and arbitration run by the employer.",
  },
  {
    id: "nda",
    title: "Mutual NDA",
    description: "A fairly standard non-disclosure agreement — useful to see what a reasonable document looks like.",
  },
  {
    id: "freelance",
    title: "Freelance contract",
    description: "A design gig where payment depends on the client's approval and revisions are unlimited.",
  },
  {
    id: "tos",
    title: "Subscription terms",
    description: "A fitness app's terms: auto-renewal, unilateral changes, your data shared, your content licensed forever.",
  },
  {
    id: "pg",
    title: "PG licence (has errors)",
    description: "A paying-guest agreement that contradicts itself: two deposit amounts, mismatched numbers, two courts and a missing clause.",
  },
] as const;

export type SampleId = (typeof SAMPLE_CATALOG)[number]["id"];

export type SampleInfo = (typeof SAMPLE_CATALOG)[number];

/** One sample's text, loading the texts' script the first time it is asked for. */
export async function loadSampleText(id: SampleId): Promise<string> {
  const { SAMPLE_TEXTS } = await import("./index");
  return SAMPLE_TEXTS[id];
}
