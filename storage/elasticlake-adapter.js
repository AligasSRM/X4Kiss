import { AwsClient } from "aws4fetch";

const DEFAULTS = Object.freeze({
  endpoint: "https://app.elasticlake.com",
  bucket: "x4kiss-storage--x4kiss-production--x4kiss-media",
  region: "auto"
});

function readSetting(env, names, fallback = "") {
  for (const name of names) {
    const value = env?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim().replace(/^(['"])(.*)\1$/, "$2").trim();
    }
  }
  return fallback;
}

function configuration(env = {}) {
  let endpoint = readSetting(env, ["ELASTICLAKE_ENDPOINT"], DEFAULTS.endpoint);
  if (!/^https?:\/\//i.test(endpoint)) endpoint = "https://" + endpoint;

  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("Invalid ElasticLake endpoint URL.");
  }
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.search || parsed.hash) {
    throw new Error("ElasticLake endpoint must be an HTTP(S) URL without query parameters.");
  }

  return {
    endpoint: parsed.toString().replace(/\/$/, ""),
    bucket: readSetting(env, ["ELASTICLAKE_BUCKET"], DEFAULTS.bucket),
    region: readSetting(env, ["ELASTICLAKE_REGION"], DEFAULTS.region),
    accessKey: readSetting(env, ["ELASTICLAKE_ACCESS_KEY_ID"]),
    secretKey: readSetting(env, ["ELASTICLAKE_SECRET_ACCESS_KEY"])
  };
}

export function isStorageReady(env = {}) {
  try {
    const c = configuration(env);
    return Boolean(c.endpoint && c.bucket && c.region && c.accessKey && c.secretKey);
  } catch {
    return false;
  }
}

function objectKey(input) {
  const key = String(input ?? "");
  if (!key || key.startsWith("/") || key.includes("\\") ||
      key.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("ElasticLake object key is invalid.");
  }
  return key;
}

function encodedKey(key) {
  return objectKey(key).split("/").map(encodeURIComponent).join("/");
}

function safeText(value, limit = 512) {
  return String(value ?? "").replace(/[\r\n\0]/g, " ").slice(0, limit);
}

function fileName(value) {
  return safeText(value || "video", 180).replace(/[^a-zA-Z0-9._-]/g, "_") || "video";
}

export function createVideoKey(name) {
  return "videos/" + crypto.randomUUID() + "-" + fileName(name);
}

async function requestObject(env, method, key = "", body = undefined, headers = {}, query = "") {
  const c = configuration(env);
  if (!c.accessKey || !c.secretKey || !c.bucket) {
    throw new Error("ElasticLake credentials or bucket configuration are missing.");
  }

  const resource = "/" + encodeURIComponent(c.bucket) + (key ? "/" + encodedKey(key) : "");
  const url = c.endpoint + resource + query;
  const requestHeaders = new Headers(headers);
  if (body !== undefined && body !== null && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/octet-stream");
  }

  const signer = new AwsClient({
    accessKeyId: c.accessKey,
    secretAccessKey: c.secretKey,
    service: "s3",
    region: c.region
  });
  const signed = await signer.sign(url, { method, headers: requestHeaders, body });
  return fetch(signed);
}

async function requireSuccess(operation, response) {
  if (response.ok) return;
  const detail = (await response.text().catch(() => "")).slice(0, 240);
  throw new Error("ElasticLake " + operation + " failed (HTTP " + response.status + ")" +
    (detail ? ": " + detail : ""));
}

export async function storeJsonObject(env, key, value) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready" };
  }
  const keyName = objectKey(key);
  const response = await requestObject(env, "PUT", keyName, JSON.stringify(value), {
    "content-type": "application/json; charset=utf-8"
  });
  await requireSuccess("JSON write", response);
  return { ok: true, storageReady: true, status: "stored", key: keyName, storage: "ElasticLake" };
}

export async function getJsonObject(env, key) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready", value: null };
  }
  const keyName = objectKey(key);
  const response = await requestObject(env, "GET", keyName);
  if (response.status === 404) {
    return { ok: true, storageReady: true, status: "not-found", value: null };
  }
  await requireSuccess("JSON read", response);
  return { ok: true, storageReady: true, status: "found", value: await response.json() };
}

export async function deleteJsonObject(env, key) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready" };
  }
  const keyName = objectKey(key);
  const response = await requestObject(env, "DELETE", keyName);
  if (response.status !== 404) await requireSuccess("object delete", response);
  return {
    ok: true,
    storageReady: true,
    status: response.status === 404 ? "not-found" : "deleted",
    key: keyName,
    storage: "ElasticLake"
  };
}

export async function storeVideo(env, key, body, metadata = {}) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready" };
  }
  const keyName = objectKey(key);
  const headers = {
    "content-type": safeText(metadata.contentType || "application/octet-stream", 128),
    "x-amz-meta-filename": fileName(metadata.fileName),
    "x-amz-meta-title": safeText(metadata.title, 180),
    "x-amz-meta-visibility": safeText(metadata.visibility || "private", 32)
  };
  const response = await requestObject(env, "PUT", keyName, body, headers);
  await requireSuccess("video upload", response);
  return { ok: true, storageReady: true, status: "stored", key: keyName, storage: "ElasticLake" };
}

function xmlValue(block, tag) {
  const match = block.match(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">"));
  if (!match) return "";
  return match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export async function listVideos(env) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready", videos: [] };
  }
  const response = await requestObject(env, "GET", "", undefined, {}, "?list-type=2&prefix=videos%2F");
  await requireSuccess("video listing", response);
  const xml = await response.text();
  const videos = (xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || [])
    .map(block => ({
      key: xmlValue(block, "Key"),
      size: Number(xmlValue(block, "Size") || 0),
      lastModified: xmlValue(block, "LastModified"),
      etag: xmlValue(block, "ETag").replace(/^"|"$/g, "")
    }))
    .filter(item => item.key.startsWith("videos/"));
  return { ok: true, storageReady: true, status: "listed", videos };
}
