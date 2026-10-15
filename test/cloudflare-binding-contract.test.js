import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adminBackendStatus } from "../admin/x4kiss-admin-backend.js";
import { settingsBackendStatus } from "../settings/x4kiss-settings-backend.js";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Worker database bindings match the existing Wrangler binding contract", async () => {
  const [wrangler, worker, auth, admin, settings, audit] = await Promise.all([
    read("../wrangler.toml"),
    read("../worker.js"),
    read("../security/x4kiss-auth-backend.js"),
    read("../admin/x4kiss-admin-backend.js"),
    read("../settings/x4kiss-settings-backend.js"),
    read("../security/admin-security-audit.js")
  ]);

  const configuredSources = [worker, auth, admin, settings, audit].join("\n");
  for (const binding of ["XKISS_AUTH_DB", "XKISS_DB", "XKISS_ADMIN_AUDIT"]) {
    assert.match(wrangler, new RegExp('binding\\s*=\\s*"' + binding + '"'), `Wrangler must define ${binding}`);
    assert.ok(configuredSources.includes(binding), `Worker modules must use ${binding}`);
  }
  assert.doesNotMatch(configuredSources, /X4KISS_AUTH_DB|X4KISS_DB|X4KISS_ADMIN_AUDIT/,
    "runtime bindings must not silently diverge from the existing Cloudflare names");
});

test("admin and settings status recognize the configured D1 binding", () => {
  const env = { XKISS_DB: {} };
  assert.equal(adminBackendStatus(env).databaseConfigured, true);
  assert.equal(adminBackendStatus(env).ok, true);
  assert.equal(settingsBackendStatus(env).databaseConfigured, true);
  assert.equal(settingsBackendStatus(env).ok, true);
});
