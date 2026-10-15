import { AwsClient } from "aws4fetch";

const VIDEO_PREFIX = "videos/";
const DEFAULT_ENDPOINT = "https://app.elasticlake.com";
const DEFAULT_BUCKET = "x4kiss-storage--x4kiss-production--x4kiss-media";
const DEFAULT_REGION = "auto";

function envText(value, fallback = "") {
  return String(value ?? fallback).trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

function getConfig(env = {}) {
  let endpoint = envText(env.ELASTICLAKE_ENDPOINT, DEFAULT_ENDPOINT);
  if (endpoint && !/^https?:\/\//i.test(endpoint)) endpoint = "https://" + endpoint;

  let parsedEndpoint;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new Error("ElasticLake endpoint is not a valid URL.");
  }
  if (!["https:", "http:"].includes(parsedEndpoint.protocol) || parsedEndpoint.search || parsedEndpoint.hash) {
    throw new Error("ElasticLake endpoint must be an HTTP(S) URL without query or fragment.");
  }

  return {
    endpoint: endpoint.replace(/\/$/, ""),
    bucket: envText(env.ELASTICLAKE_BUCKET, DEFAULT_BUCKET),
    region: envText(env.ELASTICLAKE_REGION, DEFAULT_REGION),
    accessKey: envText(env.ELASTICLAKE_ACCESS_KEY_ID || env.ELASTICLAKE_ACCESS_KEY),
    secretKey: envText(env.ELASTICLAKE_SECRET_ACCESS_KEY || env.ELASTICLAKE_SECRET_KEY)
  };
}

export function isStorageReady(env) {
  try {
    const c = getConfig(env);
    return Boolean(c.bucket && c.region && c.accessKey && c.secretKey);
  } catch {
    return false;
  }
}

function assertObjectKey(key) {
  const value = String(key ?? "");
  if (!value || value.startsWith("/") || value.split("/").some((part) => part === "..")) {
    throw new Error("ElasticLake object key is invalid.");
  }
  return value;
}

function safeMetadata(value, fallback = "") {
  return String(value ?? fallback).replace(/[\r\n\0]/g, " ").slice(0, 1024);
}

function sanitizeFileName(fileName) {
  return String(fileName || "video")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-180) || "video";
}

export function createVideoKey(fileName) {
  return VIDEO_PREFIX + crypto.randomUUID() + "-" + sanitizeFileName(fileName);
}

function encodeKey(key) {
  return assertObjectKey(key).split("/").map(encodeURIComponent).join("/");
}

async function signedRequest(env, method, key = "", body = null, extraHeaders = {}) {
  const c = getConfig(env);
  if (!c.bucket || !c.region || !c.accessKey || !c.secretKey) {
    throw new Error("ElasticLake credentials or bucket configuration are missing.");
  }

  // S3-compatible path-style addressing: /{bucket}/{object-key}.
  const path = "/" + encodeURIComponent(c.bucket) + (key ? "/" + encodeKey(key) : "");
  const headers = new Headers(extraHeaders);
  if (body != null && !headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }

  const client = new AwsClient({
    accessKeyId: c.accessKey,
    secretAccessKey: c.secretKey,
    service: "s3",
    region: c.region
  });

  const signed = await client.sign(c.endpoint + path, { method, headers, body });
  return fetch(signed);
}

async function ensureOk(action, response) {
  if (response.ok) return;
  const detail = (await response.text().catch(() => "")).slice(0, 400);
  // Never include configured credentials in errors or logs.
  throw new Error("ElasticLake " + action + " failed with HTTP " + response.status +
    (detail ? ": " + detail : ""));
}

export async function storeJsonObject(env, key, value) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready" };
  }
  const objectKey = assertObjectKey(key);
  const response = await signedRequest(env, "PUT", objectKey, JSON.stringify(value), {
    "content-type": "application/json; charset=utf-8"
  });
  await ensureOk("JSON write", response);
  return { ok: true, storageReady: true, status: "stored", key: objectKey, storage: "ElasticLake" };
}

export async function getJsonObject(env, key) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready", value: null };
  }
  const objectKey = assertObjectKey(key);
  const response = await signedRequest(env, "GET", objectKey);
  if (response.status === 404) {
    return { ok: true, storageReady: true, status: "not-found", value: null };
  }
  await ensureOk("JSON read", response);
  return { ok: true, storageReady: true, status: "found", value: await response.json() };
}

export async function deleteJsonObject(env, key) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready" };
  }
  const objectKey = assertObjectKey(key);
  const response = await signedRequest(env, "DELETE", objectKey);
  if (!response.ok && response.status !== 404) await ensureOk("JSON delete", response);
  return {
    ok: true,
    storageReady: true,
    status: response.status === 404 ? "not-found" : "deleted",
    key: objectKey,
    storage: "ElasticLake"
  };
}

export async function storeVideo(env, key, body, metadata = {}) {
  if (!isStorageReady(env)) {
    return { ok: false, storageReady: false, status: "storage-not-ready" };
  }
  const objectKey = assertObjectKey(key);
  const headers = {
    "content-type": safeMetadata(metadata.contentType, "application/octet-stream"),
    "x-amz-meta-originalfilename": safeMetadata(metadata.fileName, "video"),
    "x-amz-meta-title": safeMetadata(metadata.title),
    "x-amz-meta-creatorid": safeMetadata(metadata.creatorId),
    "x-amz-meta-description": safeMetadata(metadata.description),
    "x-amz-meta-category": safeMetadata(metadata.category),
    "x-amz-meta-downloadpolicy": safeMetadata(metadata.downloadPolicy, "disabled"),
    "x-amz-meta-visibility": safeMetadata(metadata.visibility, "private"),
    "x-amz-meta-status": "Ready"
  };
  const response = await signedRequest(env, "PUT", objectKey, body, headers);
  await ensureOk("video upload", response);
  return { ok: true, storageReady: true, status: "stored", key: objectKey, storage: "ElasticLake" };
}

function decodeXml(value) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function xmlTag(xml, tag) {
  const match = xml.match(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">"));
  return match ? decodeXml(match[1]) : "";
}

export async function listVideos(env) {
  if (!isStorageReady(env)) {
    return { ok: true, storageReady: false, videos: [] };
  }
  const response = await signedRequest(env, "GET");
  await ensureOk("object listing", response);
  const xml = await response.text();
  const blocks = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || [];
  const videos = blocks.map((block) => {
    const key = xmlTag(block, "Key");
    if (!key || !key.startsWith(VIDEO_PREFIX)) return null;
    return {
      key,
      size: Number(xmlTag(block, "Size") || 0),
      uploaded: xmlTag(block, "LastModified") || null,
      etag: xmlTag(block, "ETag") || null,
      title: key.split("/").pop() || "Untitled video",
      description: "",
      category: "Uncategorized",
      downloadPolicy: "disabled",
      visibility: "private",
      status: "Ready",
      storage: "ElasticLake"
    };
  }).filter(Boolean);
  return { ok: true, storageReady: true, videos };
}
