/**
 * Size bounds on a document, enforced by the engine, the API and the form.
 *
 * A module of its own, with no imports, so the browser can read the limits
 * without loading the engine that enforces them.
 */

export const MAX_DOCUMENT_CHARS = 200_000;
export const MIN_DOCUMENT_CHARS = 80;
