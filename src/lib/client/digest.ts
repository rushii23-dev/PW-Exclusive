/**
 * A fixed-size fingerprint of a string, for keying caches.
 *
 * A cache keyed by the document itself would hold a second copy of every
 * contract it remembers and re-hash hundreds of kilobytes on each lookup; a
 * SHA-256 digest is 64 characters whatever the document's size, and no two
 * documents share one in practice. The browser computes it natively.
 */

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

export async function digest(text: string): Promise<string> {
  // Web Crypto exists only in secure contexts (HTTPS and localhost).
  // Elsewhere the text is its own key: bigger, never wrong.
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return text;
  const hash = new Uint8Array(await subtle.digest("SHA-256", new TextEncoder().encode(text)));
  let hex = "";
  for (const byte of hash) hex += HEX[byte];
  return hex;
}
