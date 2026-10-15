import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const API = "https://x4kiss.test/api/auth/security";
const GITHUB_PAGES = "https://aligassrm.github.io";
const NETLIFY_PREVIEW = "https://deploy-preview-31--wondrous-cranachan-a62723.netlify.app";

test("GitHub Pages origin receives CORS permission", async () => {
  const response = await worker.fetch(new Request(API, {
    headers: { Origin: GITHUB_PAGES }
  }), {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), GITHUB_PAGES);
});

test("the project's Netlify deploy preview receives CORS permission", async () => {
  const response = await worker.fetch(new Request(API, {
    headers: { Origin: NETLIFY_PREVIEW }
  }), {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), NETLIFY_PREVIEW);
});

test("preflight for the project's Netlify deploy preview is accepted", async () => {
  const response = await worker.fetch(new Request(API, {
    method: "OPTIONS",
    headers: {
      Origin: NETLIFY_PREVIEW,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization"
    }
  }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), NETLIFY_PREVIEW);
  assert.match(response.headers.get("Access-Control-Allow-Headers") || "", /authorization/i);
});

test("unapproved origins do not receive CORS permission", async () => {
  const response = await worker.fetch(new Request(API, {
    headers: { Origin: "https://untrusted.example" }
  }), {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});
