/**
 * The analysis runs on the server; the browser gets the engine's types and
 * display helpers and nothing else. One value import of the engine's index
 * from client code would quietly add the risk lexicon, the glossary and the
 * tokenizer to every page's JavaScript — no error, just a heavier page — so
 * the boundary is checked here, from the source.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));

/** `import …` and `export … from` statements, with what they bring in. */
const IMPORT_RE =
  /^(?:import|export)\s+(type\s+)?(?:(\*(?:\s+as\s+\w+)?|\{[^}]*\}|\w+(?:\s*,\s*\{[^}]*\})?)\s+from\s+)?["']([^"']+)["']/gm;

interface Import {
  from: string;
  /** False when only types are imported: the compiler erases those. */
  runtime: boolean;
}

function importsOf(file: string): Import[] {
  const out: Import[] = [];
  for (const [, typeOnly, clause, from] of readFileSync(file, "utf8").matchAll(IMPORT_RE)) {
    let runtime = !typeOnly;
    if (runtime && clause?.startsWith("{")) {
      const names = clause.slice(1, -1).split(",").map((n) => n.trim()).filter(Boolean);
      runtime = names.some((n) => !n.startsWith("type "));
    }
    out.push({ from, runtime });
  }
  return out;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

/** Everything that can end up in a browser bundle. */
function clientFiles(): string[] {
  const all = sourceFiles(SRC);
  const marked = all.filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
  const shared = [
    ...sourceFiles(path.join(SRC, "components")),
    ...sourceFiles(path.join(SRC, "lib", "client")),
    path.join(SRC, "lib", "limits.ts"),
  ];
  return [...new Set([...marked, ...shared])];
}

function resolveRelative(from: string, specifier: string): string {
  const base = path.resolve(path.dirname(from), specifier);
  const found = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(existsSync);
  if (!found) throw new Error(`Cannot resolve ${specifier} from ${from}`);
  return found;
}

describe("the engine/browser boundary", () => {
  it("client code imports the engine only through its client entry", () => {
    const offenders: string[] = [];
    for (const file of clientFiles()) {
      for (const { from, runtime } of importsOf(file)) {
        if (runtime && from.startsWith("@/lib/engine") && from !== "@/lib/engine/client") {
          offenders.push(`${path.relative(SRC, file)} imports ${from}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the client entry reaches only limits, labels and formatting — no analysis code", () => {
    const entry = path.join(SRC, "lib", "engine", "client.ts");
    const reached = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (reached.has(file)) continue;
      reached.add(file);
      for (const { from, runtime } of importsOf(file)) {
        if (runtime && from.startsWith(".")) queue.push(resolveRelative(file, from));
      }
    }
    const modules = [...reached].map((f) => path.basename(f, ".ts")).sort();
    expect(modules).toEqual(["bounds", "categories", "checklist", "client", "format"]);
  });

  it("client code lists the samples from their catalog and never bundles the texts", () => {
    const offenders: string[] = [];
    for (const file of clientFiles()) {
      for (const { from, runtime } of importsOf(file)) {
        if (runtime && from === "@/lib/samples") offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("reads imports the way the compiler does", () => {
    // A guard that misreads imports guards nothing; pin the parser down.
    const sample = path.join(SRC, "lib", "engine", "client.ts");
    const imports = importsOf(sample);
    expect(imports).toContainEqual({ from: "./bounds", runtime: true });
    expect(imports).toContainEqual({ from: "./glossary", runtime: false });
    expect(importsOf(path.join(SRC, "components", "analyze", "ClauseCard.tsx"))).toContainEqual({
      from: "@/lib/engine/client",
      runtime: true,
    });
  });
});
