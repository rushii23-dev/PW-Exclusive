import { deflateRawSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { makeDocx, zipOf, type RawEntry } from "./files";

import { DOCX_LIMITS } from "@/lib/server/extract";
import { checkArchive, type ArchiveLimits } from "@/lib/server/zip-guard";

const KB = 1024;
const limits: ArchiveLimits = { maxEntries: 10, maxInflatedBytes: 64 * KB, checks: (name) => name.endsWith(".xml") };

/** An entry that really inflates to `size` bytes, whatever it claims. */
function deflated(name: string, size: number, declaredSize = size): RawEntry {
  return { name, data: new Uint8Array(deflateRawSync(Buffer.alloc(size, 0x20))), method: 8, declaredSize };
}

describe("checkArchive", () => {
  it("passes a genuine Word document", async () => {
    expect(await checkArchive(await makeDocx(["1. TERM", "The lease runs for eleven months."]), DOCX_LIMITS)).toBe("ok");
  });

  it("passes parts that fit the budget exactly", async () => {
    const zip = zipOf([deflated("a.xml", 40 * KB), deflated("b.xml", 24 * KB)]);
    expect(await checkArchive(zip, limits)).toBe("ok");
  });

  it("measures what the parts really inflate to, not what their headers claim", async () => {
    // 1 MB of XML that says it is 100 bytes: the lie is caught by inflating.
    const zip = zipOf([deflated("word/document.xml", 1024 * KB, 100)]);
    expect(zip.byteLength).toBeLessThan(4 * KB);
    expect(await checkArchive(zip, limits)).toBe("too_large");
  });

  it("counts every checked part against one shared budget", async () => {
    const zip = zipOf([deflated("a.xml", 40 * KB), deflated("b.xml", 40 * KB)]);
    expect(await checkArchive(zip, limits)).toBe("too_large");
  });

  it("counts stored parts too", async () => {
    const stored: RawEntry = { name: "a.xml", data: new Uint8Array(65 * KB), method: 0, declaredSize: 65 * KB };
    expect(await checkArchive(zipOf([stored]), limits)).toBe("too_large");
  });

  it("never inflates parts the parser will not read", async () => {
    const zip = zipOf([deflated("word/media/scan.png", 1024 * KB), deflated("word/document.xml", 1 * KB)]);
    expect(await checkArchive(zip, limits)).toBe("ok");
  });

  it("refuses an archive with more entries than a document has", async () => {
    const zip = zipOf(Array.from({ length: 11 }, (_, i) => deflated(`part-${i}.xml`, 10)));
    expect(await checkArchive(zip, limits)).toBe("too_large");
  });

  it("refuses ZIP64 archives, which no upload needs", async () => {
    const zip = zipOf([deflated("a.xml", 10)]);
    new DataView(zip.buffer).setUint32(zip.byteLength - 22 + 16, 0xffffffff, true);
    expect(await checkArchive(zip, limits)).toBe("too_large");
  });

  it.each([
    ["no end record", new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4])],
    ["corrupt DEFLATE data", zipOf([{ name: "a.xml", data: new Uint8Array([1, 2, 3, 4, 5]), method: 8, declaredSize: 5 }])],
    ["an unknown compression method", zipOf([{ name: "a.xml", data: new Uint8Array(4), method: 12, declaredSize: 4 }])],
  ])("reports %s as unreadable", async (_, zip) => {
    expect(await checkArchive(zip, limits)).toBe("unreadable");
  });

  it("reports a directory that points outside the file as unreadable", async () => {
    const zip = zipOf([deflated("a.xml", 10)]);
    // Aim the entry's local header offset past the end of the data.
    new DataView(zip.buffer).setUint32(zip.byteLength - 22 - (46 + "a.xml".length) + 42, zip.byteLength, true);
    expect(await checkArchive(zip, limits)).toBe("unreadable");
  });
});
