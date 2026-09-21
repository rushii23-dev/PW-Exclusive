/**
 * Request fields shared by every route, so limits and defaults can't drift
 * apart between endpoints.
 */

import { z } from "zod";

import { LANGUAGE_CODES } from "@/lib/ai/languages";
import { MAX_DOCUMENT_CHARS } from "@/lib/engine";

export const documentField = z
  .string()
  .min(1, "Provide the document text.")
  .max(MAX_DOCUMENT_CHARS, "Document is too large.");

/** Language for AI-written text. Quotes from the document are never translated. */
export const languageField = z.enum(LANGUAGE_CODES).optional().default("en");
