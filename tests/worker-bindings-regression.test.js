import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

test("worker.js normalizes env bindings for X4KISS_AUTH_DB and XKISS_AUTH_DB", async () => {
  let queriedWith = null;
  const mockDb = {
    prepare(sql) {
      queriedWith = sql;
      return {
        bind() {
          return {
            async first() { return null; },
            async all() { return { results: [] }; }
          };
        }
      };
    }
  };

  // Test with X4KISS_AUTH_DB set
  const req1 = new Request("https://x4kiss.test/api/auth/me", {
    headers: { Authorization: "Bearer mock-token" }
  });
  const res1 = await worker.fetch(req1, { X4KISS_AUTH_DB: mockDb });
  assert.equal(res1.status, 401);
  assert.ok(queriedWith.includes("SELECT s.id AS session_id"));

  queriedWith = null;
  // Test with XKISS_AUTH_DB set
  const req2 = new Request("https://x4kiss.test/api/auth/me", {
    headers: { Authorization: "Bearer mock-token" }
  });
  const res2 = await worker.fetch(req2, { XKISS_AUTH_DB: mockDb });
  assert.equal(res2.status, 401);
  assert.ok(queriedWith.includes("SELECT s.id AS session_id"));
});

test("worker.js endpoints fail closed with 503 when auth backend binding is unconfigured", async () => {
  const routes = [
    { path: "/api/auth/register", method: "POST", body: { email: "a@b.com" } },
    { path: "/api/auth/login", method: "POST", body: { email: "a@b.com" } },
    { path: "/api/auth/me", method: "GET" },
    { path: "/api/upload/prepare", method: "POST", body: { fileName: "v.mp4" } },
    { path: "/api/creator/videos", method: "GET" }
  ];

  for (const route of routes) {
    const req = new Request(`https://x4kiss.test${route.path}`, {
      method: route.method,
      headers: { "content-type": "application/json" },
      body: route.body ? JSON.stringify(route.body) : undefined
    });
    const res = await worker.fetch(req, {});
    assert.equal(res.status, 503, `Expected 503 for ${route.path}`);
    const data = await res.json();
    assert.equal(data.ok, false);
  }
});

test("worker.js upload prepare rejects unauthenticated request with 401 when DB is present", async () => {
  const mockDb = {
    prepare() {
      return {
        bind() {
          return { async first() { return null; } };
        }
      };
    }
  };

  const req = new Request("https://x4kiss.test/api/upload/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName: "test.mp4", contentType: "video/mp4", title: "Test", category: "Entertainment", fileSize: 1024 })
  });

  const res = await worker.fetch(req, {
    X4KISS_AUTH_DB: mockDb,
    ELASTICLAKE_S3_ENDPOINT: "https://s3.example.test",
    ELASTICLAKE_BUCKET_NAME: "test-bucket",
    ELASTICLAKE_ACCESS_KEY_ID: "key",
    ELASTICLAKE_SECRET_ACCESS_KEY: "secret"
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.ok, false);
});
