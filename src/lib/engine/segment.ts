/**
 * Clause segmentation.
 *
 * Real agreements arrive in three shapes: numbered clauses ("7. TERMINATION"),
 * heading lines in capitals or title case followed by body text, and plain
 * paragraphs with no structure at all. The segmenter handles all three and
 * degrades to paragraph splitting, so no document produces zero clauses.
 */

import { normalizeWhitespace } from "./text";

export interface RawClause {
  heading: string | null;
  text: string;
}

/** "1.", "1.2", "(a)", "Section 4", "ARTICLE IV", "Clause 7:" … */
const NUMBERED_HEADING_RE =
  /^(?:(?:section|article|clause|para(?:graph)?)\s+)?(?:\d+(?:\.\d+)*[.):]?|[IVXLC]+[.)]|\([a-z]\))\s+/i;

/** A line that is a heading on its own: short, no closing period, capitalised. */
function looksLikeHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 80) return false;
  if (/[.;,]$/.test(t)) return false;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  // ALL CAPS or Title Case with few words reads as a heading.
  if (upper / letters.length > 0.8) return true;
  const words = t.split(/\s+/);
  return (
    words.length <= 6 &&
    words.every((w) => /^[A-Z(]/.test(w) || /^(?:of|and|the|to|for|in|on|a|an|by)$/i.test(w))
  );
}

/** Strip the enumerator and separate an inline heading from its body. */
function splitHeadingFromBody(block: string): RawClause {
  const stripped = block.replace(NUMBERED_HEADING_RE, "");
  // "TERMINATION. Either party may…" or "Termination: Either party may…"
  const inline = stripped.match(/^([A-Z][A-Za-z /&-]{2,60}?)[.:]\s+(?=[A-Z(])/);
  if (inline) {
    const heading = inline[1].trim();
    const letters = heading.replace(/[^A-Za-z]/g, "");
    const upper = letters.replace(/[^A-Z]/g, "").length;
    const titled = heading
      .split(/\s+/)
      .every((w) => /^[A-Z]/.test(w) || /^(?:of|and|the|to|for|in|on|a|an|by)$/i.test(w));
    if (upper / Math.max(1, letters.length) > 0.8 || titled) {
      return { heading: toTitle(heading), text: stripped.slice(inline[0].length).trim() };
    }
  }
  const lines = stripped.split("\n");
  if (lines.length > 1 && looksLikeHeadingLine(lines[0])) {
    return { heading: toTitle(lines[0].trim()), text: lines.slice(1).join("\n").trim() };
  }
  return { heading: null, text: stripped.trim() };
}

function toTitle(s: string): string {
  if (!/[a-z]/.test(s)) {
    // ALL CAPS → Title Case so it doesn't shout in the UI.
    return s
      .toLowerCase()
      .replace(/(?:^|\s|\/|-)[a-z]/g, (m) => m.toUpperCase());
  }
  return s;
}

/**
 * Split a document into clauses.
 *
 * Strategy: prefer numbered-clause boundaries when the document has enough of
 * them to be its real structure (≥3), otherwise fall back to blank-line
 * paragraphs. Fragments under 40 characters merge into their neighbour so a
 * stray line never becomes a "clause".
 */
export function segment(document: string): RawClause[] {
  const text = normalizeWhitespace(document);
  if (text.length === 0) return [];

  const lines = text.split("\n");
  const numberedStarts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (NUMBERED_HEADING_RE.test(lines[i]) || looksLikeHeadingLine(lines[i])) {
      numberedStarts.push(i);
    }
  }

  let blocks: string[];
  if (numberedStarts.length >= 3) {
    blocks = [];
    // Text before the first heading is the preamble (parties, recitals).
    if (numberedStarts[0] > 0) {
      const pre = lines.slice(0, numberedStarts[0]).join("\n").trim();
      if (pre) blocks.push(pre);
    }
    for (let k = 0; k < numberedStarts.length; k++) {
      const from = numberedStarts[k];
      const to = k + 1 < numberedStarts.length ? numberedStarts[k + 1] : lines.length;
      const block = lines.slice(from, to).join("\n").trim();
      if (block) blocks.push(block);
    }
  } else {
    blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  }

  // Merge fragments forward so no clause is a stub.
  const merged: string[] = [];
  for (const block of blocks) {
    if (merged.length > 0 && block.length < 40 && !NUMBERED_HEADING_RE.test(block)) {
      merged[merged.length - 1] += `\n${block}`;
    } else {
      merged.push(block);
    }
  }

  return merged.map(splitHeadingFromBody).filter((c) => c.text.length > 0 || c.heading);
}
