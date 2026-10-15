import test from "node:test";
import assert from "node:assert/strict";
import {
  createVideoKey,
  deleteJsonObject,
  getJsonObject,
  isStorageReady,
  listVideos,
  storeJsonObject,
  storeVideo
} from "../storage/elasticlake-adapter.js";

const env = {
  ELASTICLAKE_ENDPOINT: "https://app.elasticlake.com",
  ELASTICLAKE_BUCKET: "x4kiss-storage--x4kiss-production--x4kiss-media",
  ELASTICLAKE_REGION: "auto",
  ELASTICLAKE_ACCESS_KEY_ID: "unit-test-access-key",
  ELASTICLAKE_SECRET_ACCESS_KEY: "unit-test-secret-key"
};

test("storage readiness rejects missing or malformed configuration", () => {
  assert.equal(isStorageReady({}), false);
  assert.equal(isStorageReady({ ...env, ELASTICLAKE_ACCESS_KEY_ID: "" }), false);
  assert.equal(isStorageReady({ ...env, ELASTICLAKE_ENDPOINT: "not a url" }), false);
  assert.equal(isStorageReady(env), true);
});

test("video keys are unique, namespaced, and sanitized", () => {
  const first = createVideoKey("../my video.mp4");
  const second = createVideoKey("../my video.mp4");
  assert.match(first, /^videos\/[0-9a-f-]+-.*my_video\.mp4$/i);
  assert.notEqual(first, second);
  assert.equal(first.includes("../"), false);
});

test("JSON write signs and sends a PUT to the configured bucket", async (t) => {
  const originalFetch = globalThis.fetch;
  let seen;
  globalThis.fetch = async (request, init) => {
    seen = { url: String(request), method: init?.method || request.method, body: init?.body };
    return new Response("", { status: 200 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await storeJsonObject(env, "events/one.json", { ok: true });
  assert.equal(result.ok, true);
  assert.equal(result.status, "stored");
  assert.equal(seen.method, "PUT");
  assert.match(seen.url, /x4kiss-storage--x4kiss-production--x4kiss-media\/events\/one\.json$/);
  assert.equal(seen.body, JSON.stringify({ ok: true }));
});

test("JSON read returns parsed object and handles 404", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ value: 7 }), {
    status: 200, headers: { "content-type": "application/json" }
  });
  t.after(() => { globalThis.fetch = originalFetch; });
  const found = await getJsonObject(env, "events/one.json");
  assert.equal(found.status, "found");
  assert.deepEqual(found.value, { value: 7 });
});

test("JSON delete treats 404 as already absent", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 404 });
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await deleteJsonObject(env, "events/missing.json");
  assert.equal(result.ok, true);
  assert.equal(result.status, "not-found");
});

test("video upload forwards safe metadata and returns stored status", async (t) => {
  const originalFetch = globalThis.fetch;
  let seen;
  globalThis.fetch = async (request, init) => {
    seen = { url: String(request), headers: new Headers(init?.headers || request.headers), method: init?.method || request.method };
    return new Response("", { status: 200 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await storeVideo(env, "videos/clip.mp4", new Uint8Array([1, 2]), {
    fileName: "clip.mp4", title: "Demo\r\nInjected", visibility: "private"
  });
  assert.equal(result.ok, true);
  assert.equal(seen.method, "PUT");
  assert.match(seen.url, /videos\/clip\.mp4$/);
});

test("video listing parses only videos/ objects", async (t) => {
  const originalFetch = globalThis.fetch;
  const xml = "<ListBucketResult><Contents><Key>videos/a.mp4</Key><Size>12</Size><LastModified>2026-10-15T00:00:00Z</LastModified><ETag>&quot;abc&quot;</ETag></Contents><Contents><Key>other/no.mp4</Key><Size>4</Size></Contents></ListBucketResult>";
  globalThis.fetch = async () => new Response(xml, { status: 200 });
  t.after(() => { globalThis.fetch = originalFetch; });
  const result = await listVideos(env);
  assert.equal(result.ok, true);
  assert.equal(result.videos.length, 1);
  assert.equal(result.videos[0].key, "videos/a.mp4");
  assert.equal(result.videos[0].size, 12);
});

test("object keys reject absolute paths and traversal", async () => {
  await assert.rejects(() => storeJsonObject(env, "../escape.json", {}), /object key is invalid/i);
  await assert.rejects(() => getJsonObject(env, "/absolute.json"), /object key is invalid/i);
});
