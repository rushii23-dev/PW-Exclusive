/**
 * Input limits enforced by both the browser and the API.
 *
 * The form fields use them to stop the reader early with a clear message;
 * the routes use the same numbers to reject anything that skips the form.
 * Client-safe: plain constants, no server imports.
 */

export { MAX_DOCUMENT_CHARS, MIN_DOCUMENT_CHARS } from "@/lib/engine";

/** Fits comfortably under common serverless request limits. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const QUESTION_MIN_CHARS = 3;
export const QUESTION_MAX_CHARS = 500;

export const SITUATION_MIN_CHARS = 8;
export const SITUATION_MAX_CHARS = 1000;
