/**
 * Readability metrics for the document header.
 *
 * Flesch Reading Ease is imperfect for legal prose, but as a relative signal
 * it is honest: a 25 reads harder than a 55 every time, and the bands below
 * are calibrated for contracts (almost nothing legal scores "easy").
 */

import { matchGlossary } from "./glossary";
import { countSyllables, splitSentences, tokenize } from "./text";
import type { Readability } from "./types";

export function computeReadability(text: string): Readability {
  const sentences = splitSentences(text);
  const words = tokenize(text);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);

  // Contracts repeat their vocabulary: a long one runs to tens of thousands
  // of words but only a thousand or two distinct ones. Count each once.
  const syllablesIn = new Map<string, number>();
  let syllables = 0;
  for (const w of words) {
    let n = syllablesIn.get(w);
    if (n === undefined) {
      n = countSyllables(w);
      syllablesIn.set(w, n);
    }
    syllables += n;
  }

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = wordCount > 0 ? syllables / wordCount : 0;

  const rawFlesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fleschScore = Math.round(Math.min(100, Math.max(0, rawFlesch)));

  const band: Readability["band"] =
    fleschScore < 30 ? "very hard" : fleschScore < 50 ? "hard" : fleschScore < 65 ? "moderate" : "easy";

  // Whole-word matches only, counted once per term: a plain substring test
  // would find "lien" in every "client" and "term" in every "determine".
  const jargonHits = matchGlossary(text).length;
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
