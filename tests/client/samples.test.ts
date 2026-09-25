import { describe, expect, it } from "vitest";

import { getSample, SAMPLES } from "@/lib/samples";
import { loadSampleText, SAMPLE_CATALOG } from "@/lib/samples/catalog";

describe("sample catalog", () => {
  it("lists every sample, in the order the pages show them", () => {
    expect(SAMPLES.map(({ id, title, description }) => ({ id, title, description }))).toEqual(
      SAMPLE_CATALOG.map(({ id, title, description }) => ({ id, title, description })),
    );
  });

  it("loads each sample's text on demand", async () => {
    for (const { id } of SAMPLE_CATALOG) {
      const text = await loadSampleText(id);
      expect(text.length).toBeGreaterThan(1000);
      expect(text).toBe(getSample(id)?.text);
    }
  });
});
