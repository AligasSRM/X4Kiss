import test from "node:test";
import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set([".git", "node_modules", ".netlify", ".wrangler"]);
const STATIC_IMPORT_PATTERNS = [
  /\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g,
  /\bimport\s*["'](\.{1,2}\/[^"']+)["']/g,
  /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(fullPath));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) found.push(fullPath);
  }
  return found;
}

async function resolvesLocalImport(importer, specifier) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const target = path.resolve(path.dirname(importer), clean);
  const candidates = [
    target,
    target + ".js",
    target + ".mjs",
    target + ".cjs",
    target + ".json",
    path.join(target, "index.js"),
    path.join(target, "index.mjs")
  ];
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return true;
    } catch {}
  }
  return false;
}

test("all relative JavaScript imports resolve to repository files", async () => {
  const files = await walk(ROOT);
  const missing = [];
  for (const importer of files) {
    const source = await (await import("node:fs/promises")).readFile(importer, "utf8");
    for (const pattern of STATIC_IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        if (!await resolvesLocalImport(importer, match[1])) {
          missing.push(path.relative(ROOT, importer) + " -> " + match[1]);
        }
      }
    }
  }
  assert.deepEqual(missing, [], "Unresolved local imports:\n" + missing.join("\n"));
});
