import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

function makeEnv() {
  return {
    X4KISS_AUTH_DB: {},
    X4KISS_DB: {},
    X4KISS_ADMIN_AUDIT: {
      prepare(sql) {
        assert.match(sql, /INSERT INTO admin_security_audit/);
        return {
          bind() {
            return { async run() { return { success: true }; } };
          }
        };
      }
    }
  };
}

test("admin authorization rejects caller-supplied Super Admin identity without a session", async () => {
  const request = new Request("https://x4kiss.test/api/admin/authorize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: { id: "spoofed", email: "attacker@example.com", role: "super_admin", status: "active" },
      permission: "view_users"
    })
  });

  const response = await worker.fetch(request, makeEnv());
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.ok, false);
  assert.equal(body.allowed, false);
  assert.equal(body.status, "unauthenticated");
});

test("admin authorization fails closed when the authentication binding is absent", async () => {
  const request = new Request("https://x4kiss.test/api/admin/authorize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: { id: "spoofed", email: "attacker@example.com", role: "super_admin", status: "active" },
      permission: "view_users"
    })
  });

  const response = await worker.fetch(request, {});
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.allowed, false);
  assert.equal(body.status, "auth_backend_not_configured");
});
