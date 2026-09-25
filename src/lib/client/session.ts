/**
 * Follow-up questions about one analysed document: explain a clause, ask a
 * question, work out options for a situation.
 *
 * The server keeps nothing between requests, so each one carries the
 * document. A session belongs to exactly one document; every answer it gets
 * is kept for that document alone, and a new document gets a new, empty
 * session.
 */

import type { ClauseExplanation } from "@/lib/ai/explain";
import type { LanguageCode } from "@/lib/ai/languages";
import type { SituationGuide } from "@/lib/ai/options";
import type { Answer } from "@/lib/engine/client";

import { postJson, type ApiResult } from "./api";
import { ResponseCache } from "./cache";

export class DocumentSession {
  private readonly explanations = new ResponseCache<{ explanation: ClauseExplanation }>(100);
  private readonly answers = new ResponseCache<{ answer: Answer }>(50);
  private readonly guides = new ResponseCache<{ guide: SituationGuide }>(20);

  /**
   * @param aiConfigured Whether Gemini is on. When it is, an answer from the
   * rule engine is a stand-in for one Gemini couldn't give just then, and is
   * not kept: asking again gives Gemini another chance.
   */
  constructor(
    private readonly text: string,
    private readonly aiConfigured: boolean,
  ) {}

  private isFinal = (source: "ai" | "engine" | undefined) => source === "ai" || !this.aiConfigured;

  explain(clauseId: string, language: LanguageCode, signal: AbortSignal): Promise<ApiResult<{ explanation: ClauseExplanation }>> {
    return this.explanations.load(`${language}:${clauseId}`, () =>
      postJson("/api/explain", { text: this.text, clauseId, language }, { signal }),
    );
  }

  ask(question: string, language: LanguageCode, signal: AbortSignal): Promise<ApiResult<{ answer: Answer }>> {
    return this.answers.load(
      `${language}:${question}`,
      () => postJson("/api/ask", { text: this.text, question, language }, { signal }),
      ({ answer }) => this.isFinal(answer.source),
    );
  }

  options(situation: string, language: LanguageCode, signal: AbortSignal): Promise<ApiResult<{ guide: SituationGuide }>> {
    return this.guides.load(
      `${language}:${situation}`,
      () => postJson("/api/options", { text: this.text, situation, language }, { signal }),
      ({ guide }) => this.isFinal(guide.source),
    );
  }
}
