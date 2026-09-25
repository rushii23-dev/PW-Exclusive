/**
 * Answers the page already has, so asking for one again costs nothing.
 *
 * Anything with Gemini in it takes seconds and spends model quota, and
 * readers ask for the same thing twice more often than it seems: reopening a
 * clause after filtering the list, switching back to a language, clicking a
 * sample or a suggestion again. The repeat is served from here. Memory only
 * and bounded — the least recently used answer goes first, nothing is written
 * to storage, and nothing outlives the tab.
 */

import type { ApiResult } from "./api";

export class ResponseCache<T> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly capacity: number) {}

  /**
   * The kept answer for `key`, or else whatever `request` returns — kept for
   * next time when `keep` says it is final. Failures and cancellations are
   * never kept, so trying again always really tries again.
   */
  async load(
    key: string,
    request: () => Promise<ApiResult<T>>,
    keep: (data: T) => boolean = () => true,
  ): Promise<ApiResult<T>> {
    const hit = this.entries.get(key);
    if (hit !== undefined) {
      // A Map iterates oldest first; re-inserting marks this the newest.
      this.entries.delete(key);
      this.entries.set(key, hit);
      return { ok: true, data: hit };
    }
    const result = await request();
    if (result.ok && keep(result.data)) {
      this.entries.set(key, result.data);
      if (this.entries.size > this.capacity) {
        this.entries.delete(this.entries.keys().next().value!);
      }
    }
    return result;
  }
}
