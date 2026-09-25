/**
 * Decompression-bomb check for ZIP containers such as .docx files.
 *
 * A few megabytes of crafted DEFLATE data can inflate to gigabytes, and a
 * ZIP's own size fields are only claims — a bomb simply lies in them. So
 * the parts a parser will read are actually inflated here, on the thread
 * pool, against one shared byte budget, and the file is refused the moment
 * the budget runs out. Parts no parser reads (images and other media) are
 * never inflated at all.
 */

import "server-only";

import { promisify } from "node:util";
import { inflateRaw } from "node:zlib";

const inflateRawAsync = promisify(inflateRaw);

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_BYTES = 22;
const CENTRAL_HEADER_BYTES = 46;
const LOCAL_HEADER_BYTES = 30;
/** The end record may be followed by a comment of up to this many bytes. */
const MAX_COMMENT_BYTES = 0xffff;

const STORED = 0;
const DEFLATED = 8;

export interface ArchiveLimits {
  /** More entries than this is not a document. */
  maxEntries: number;
  /** Total bytes the checked parts may inflate to, together. */
  maxInflatedBytes: number;
  /** Which entries to check: the ones the parser will read. */
  checks: (name: string) => boolean;
}

export type ArchiveCheck = "ok" | "too_large" | "unreadable";

/** Where the end-of-central-directory record starts, or -1. */
function findEnd(view: DataView): number {
  const last = view.byteLength - EOCD_BYTES;
  for (let at = last; at >= 0 && at >= last - MAX_COMMENT_BYTES; at--) {
    if (view.getUint32(at, true) === EOCD_SIGNATURE) return at;
  }
  return -1;
}

function isTooLarge(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "ERR_BUFFER_TOO_LARGE";
}

/**
 * Walk the central directory and inflate every entry `limits.checks` picks,
 * stopping as soon as the archive proves too large or malformed.
 */
export async function checkArchive(bytes: Uint8Array, limits: ArchiveLimits): Promise<ArchiveCheck> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.byteLength >= EOCD_BYTES ? findEnd(view) : -1;
  if (end < 0) return "unreadable";

  const entries = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  // All-ones fields mark a ZIP64 archive, which nothing that fits in an
  // upload needs.
  if (entries === 0xffff || at === 0xffffffff || entries > limits.maxEntries) return "too_large";

  let budget = limits.maxInflatedBytes;
  const names = new TextDecoder();
  for (let i = 0; i < entries; i++) {
    if (at + CENTRAL_HEADER_BYTES > end || view.getUint32(at, true) !== CENTRAL_SIGNATURE) return "unreadable";
    const method = view.getUint16(at + 10, true);
    const compressedSize = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = names.decode(bytes.subarray(at + CENTRAL_HEADER_BYTES, at + CENTRAL_HEADER_BYTES + nameLength));
    at += CENTRAL_HEADER_BYTES + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    if (!limits.checks(name)) continue;

    if (localOffset + LOCAL_HEADER_BYTES > end || view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) {
      return "unreadable";
    }
    const start =
      localOffset + LOCAL_HEADER_BYTES + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    if (start + compressedSize > end) return "unreadable";
    const data = bytes.subarray(start, start + compressedSize);

    if (method === STORED) {
      budget -= compressedSize;
    } else if (method === DEFLATED) {
      try {
        budget -= (await inflateRawAsync(data, { maxOutputLength: Math.max(1, budget) })).byteLength;
      } catch (err) {
        return isTooLarge(err) ? "too_large" : "unreadable";
      }
    } else {
      return "unreadable";
    }
    if (budget < 0) return "too_large";
  }
  return "ok";
}
