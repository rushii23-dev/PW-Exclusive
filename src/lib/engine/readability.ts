/**
 * Readability metrics for the document header.
 *
 * Flesch Reading Ease is imperfect for legal prose, but as a relative signal
 * it is honest: a 25 reads harder than a 55 every time, and the bands below
 * are calibrated for contracts (almost nothing legal scores "easy").
 */

import { GLOSSARY } from "./glossary";
import { countSyllables, splitSentences, tokenize } from "./text";
import type { Readability } from "./types";

const JARGON_FORMS: string[] = GLOSSARY.flatMap((g) => [g.term, ...(g.aliases ?? [])]);

export function computeReadability(text: string): Readability {
  const sentences = splitSentences(text);
  const words = tokenize(text);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);

  let syllables = 0;
  for (const w of words) syllables += countSyllables(w);

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = wordCount > 0 ? syllables / wordCount : 0;

  const rawFlesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fleschScore = Math.round(Math.min(100, Math.max(0, rawFlesch)));

  const band: Readability["band"] =
    fleschScore < 30 ? "very hard" : fleschScore < 50 ? "hard" : fleschScore < 65 ? "moderate" : "easy";

  const lower = text.toLowerCase();
  let jargonHits = 0;
  for (const form of JARGON_FORMS) {
    if (lower.includes(form.toLowerCase())) jargonHits += 1;
  }
  const jargonDensity =
    wordCount > 0 ? Math.round((jargonHits / wordCount) * 100 * 10) / 10 : 0;

  return {
    fleschScore,
    band,
    wordCount,
    sentenceCount: sentences.length,
    avgWordsPerSentence: Math.round(wordsPerSentence * 10) / 10,
    jargonDensity,
    readingTimeMinutes: Math.max(1, Math.round(wordCount / 180)),
  };
}
