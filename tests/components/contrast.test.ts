/**
 * The design tokens promise that every text colour clears WCAG AA on the
 * backgrounds it is used on. jsdom cannot measure contrast, so this test
 * reads the tokens straight out of globals.css and does the arithmetic:
 * oklch → linear sRGB → relative luminance → contrast ratio.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");
const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("@theme inline"));

const tokens = new Map<string, [number, number, number]>();
for (const m of rootBlock.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)\s*;/g)) {
  tokens.set(m[1], [Number(m[2]), Number(m[3]), Number(m[4])]);
}

function luminance(name: string): number {
  const token = tokens.get(name);
  if (!token) throw new Error(`no oklch token --${name}`);
  const [L, C, h] = token;
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const [r, g, bl] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every text-on-background pairing the components use. */
const TEXT_PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["foreground", "surface-raised"],
  ["muted-foreground", "background"],
  ["muted-foreground", "surface"],
  ["muted-foreground", "surface-raised"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "primary-soft"],
  ["primary-strong", "primary-soft"],
  ["primary-strong", "accent-soft"],
  ["primary-strong", "surface-raised"],
  ["primary-foreground", "primary"],
  ["primary-foreground", "primary-strong"],
  ["accent-ink", "accent-soft"],
  ["accent-ink", "surface-raised"],
  ["risk-high", "risk-high-soft"],
  ["risk-high", "surface-raised"],
  ["risk-medium", "risk-medium-soft"],
  ["risk-medium", "surface-raised"],
  ["risk-low", "risk-low-soft"],
  ["ok", "ok-soft"],
  ["ok", "surface-raised"],
];

describe("colour contrast of the design tokens", () => {
  it("reads the tokens it checks", () => {
    expect(tokens.size).toBeGreaterThan(20);
  });

  it.each(TEXT_PAIRS)("%s on %s clears WCAG AA for text (4.5:1)", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("gives the focus ring at least 3:1 against the page (WCAG 1.4.11)", () => {
    expect(contrast("ring", "background")).toBeGreaterThanOrEqual(3);
    expect(contrast("ring", "surface-raised")).toBeGreaterThanOrEqual(3);
  });
});
