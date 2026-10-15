import test from "node:test";
import assert from "node:assert/strict";
import { readdir, stat, readFile } from "node:fs/promises";
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
    const source = await readFile(importer, "utf8");
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

test("Worker D1 references match Wrangler binding names", async () => {
  const [worker, wrangler] = await Promise.all([
    readFile(path.join(ROOT, "worker.js"), "utf8"),
    readFile(path.join(ROOT, "wrangler.toml"), "utf8")
  ]);
  for (const binding of ["XKISS_AUTH_DB", "XKISS_DB", "XKISS_ADMIN_AUDIT"]) {
    assert.match(wrangler, new RegExp('binding\\s*=\\s*"' + binding + '"'), `Wrangler binding missing: ${binding}`);
    assert.ok(worker.includes("env." + binding), `Worker does not consume configured binding: ${binding}`);
  }
  assert.doesNotMatch(
    worker,
    /env\.X4KISS_(?:AUTH_DB|DB|ADMIN_AUDIT)\b/,
    "Worker must not use D1 binding names that Wrangler does not define"
  );
});
