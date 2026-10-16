import { AwsClient } from "aws4fetch";

const DEFAULTS = Object.freeze({
  endpoint: "https://app.elasticlake.com",
  bucket: "x4kiss-storage--x4kiss-production--x4kiss-media",
  region: "auto"
});
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
const PART_SIZE = 10 * 1024 * 1024;
const MAX_PARTS = 10000;

function read(env, name, fallback = "") {
  const value = env?.[name];
  if (value === undefined || value === null || String(value).trim() === "") return fallback;
  return String(value).trim().replace(/^(['"])(.*)\1$/, "$2").trim();
}

function config(env = {}) {
  let url;
  const endpoint = read(env, "ELASTICLAKE_ENDPOINT", DEFAULTS.endpoint);
  try {
    url = new URL(/^https:\/\//i.test(endpoint) ? endpoint : "https://" + endpoint);
  } catch {
    throw new Error("Invalid ElasticLake endpoint URL.");
  }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash) {
    throw new Error("ElasticLake endpoint must be HTTPS and cannot contain credentials, query, or fragment.");
  }
  return {
    endpoint: url.toString().replace(/\/$/, ""),
    bucket: read(env, "ELASTICLAKE_BUCKET", DEFAULTS.bucket),
    region: read(env, "ELASTICLAKE_REGION", DEFAULTS.region),
    accessKey: read(env, "ELASTICLAKE_ACCESS_KEY_ID"),
    secretKey: read(env, "ELASTICLAKE_SECRET_ACCESS_KEY")
  };
}

export function isStorageReady(env = {}) {
  try {
    const c = config(env);
    return Boolean(c.endpoint && c.bucket && c.region && c.accessKey && c.secretKey);
  } catch {
    return false;
  }
}

function keyOf(value) {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.endsWith("/") ||
      value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value) ||
      value.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("ElasticLake object key is invalid.");
  }
  return value;
}

function encodedKey(value) {
  return keyOf(value).split("/").map(encodeURIComponent).join("/");
}

function cleanText(value, max = 512) {
  return String(value ?? "").replace(/[\r\n\0]/g, " ").slice(0, max);
}

function fileName(value) {
  return cleanText(value || "video", 180).replace(/[^a-zA-Z0-9._-]/g, "_") || "video";
}

export function createVideoKey(name) {
  return "videos/" + crypto.randomUUID() + "-" + fileName(name);
}

function objectUrl(c, key = "", query = "") {
  return c.endpoint + "/" + encodeURIComponent(c.bucket) +
    (key ? "/" + encodedKey(key) : "") + (query ? (query.startsWith("?") ? query : "?" + query) : "");
}

function xmlValue(xml, tag) {
  const match = String(xml).match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + "\\s*>", "i"));
  if (!match) return "";
  return match[1].trim()
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function xmlBlocks(xml, tag) {
  return String(xml).match(new RegExp("<" + tag + "(?:\\s[^>]*)?>[\\s\\S]*?</" + tag + "\\s*>", "gi")) || [];
}

async function fail(operation, response) {
  const body = (await response.text().catch(() => "")).slice(0, 12000);
  const code = xmlValue(body, "Code");
  const message = cleanText(xmlValue(body, "Message"), 200);
  const requestId = cleanText(xmlValue(body, "RequestId") || xmlValue(body, "RequestID"), 100);
  const details = [code && "code=" + cleanText(code, 80), message && "message=" + message, requestId && "requestId=" + requestId].filter(Boolean);
  throw new Error("ElasticLake " + operation + " failed (HTTP " + response.status + ")" +
    (details.length ? ": " + details.join("; ") : "."));
}

async function ensureOk(operation, response) {
  if (!response.ok) await fail(operation, response);
}

async function request(env, method, key = "", body, headers = {}, query = "") {
  const c = config(env);
  if (!c.bucket || !c.accessKey || !c.secretKey) throw new Error("ElasticLake bucket or credentials are missing.");
  const url = objectUrl(c, key, query);
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
  return fetch(await signer.sign(url, { method, headers: requestHeaders, body }));
}

function notReady(status, extra = {}) {
  return { ok: false, storageReady: false, status, ...extra };
}

export async function storeJsonObject(env, key, value) {
  if (!isStorageReady(env)) return notReady("storage-not-ready");
  const objectKey = keyOf(key);
  const body = JSON.stringify(value);
  if (body === undefined) throw new Error("ElasticLake JSON value must be serializable.");
  const response = await request(env, "PUT", objectKey, body, { "content-type": "application/json; charset=utf-8" });
  await ensureOk("JSON write", response);
  return { ok: true, storageReady: true, status: "stored", key: objectKey, storage: "ElasticLake" };
}

export async function getJsonObject(env, key) {
  if (!isStorageReady(env)) return notReady("storage-not-ready", { value: null });
  const response = await request(env, "GET", keyOf(key));
  if (response.status === 404) return { ok: true, storageReady: true, status: "not-found", value: null };
  await ensureOk("JSON read", response);
  try {
    return { ok: true, storageReady: true, status: "found", value: await response.json() };
  } catch {
    throw new Error("ElasticLake JSON read returned invalid JSON.");
  }
}

export async function deleteJsonObject(env, key) {
  if (!isStorageReady(env)) return notReady("storage-not-ready");
  const objectKey = keyOf(key);
  const response = await request(env, "DELETE", objectKey);
  if (response.status !== 404) await ensureOk("object delete", response);
  return {
    ok: true, storageReady: true,
    status: response.status === 404 ? "not-found" : "deleted",
    key: objectKey, storage: "ElasticLake"
  };
}

function sizeOf(body) {
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.size;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (typeof body === "string") return new TextEncoder().encode(body).byteLength;
  return null;
}

function sliceBody(body, start, end) {
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.slice(start, end);
  if (body instanceof ArrayBuffer) return body.slice(start, end);
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset + start, end - start);
  if (typeof body === "string") return new TextEncoder().encode(body).slice(start, end);
  throw new Error("Multipart uploads require a Blob, ArrayBuffer, string, or typed-array body.");
}

function xmlEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function abortUpload(env, key, uploadId) {
  const response = await request(env, "DELETE", key, undefined, {}, new URLSearchParams({ uploadId }).toString());
  if (!response.ok && response.status !== 404) {
    await response.body?.cancel?.().catch(() => {});
    throw new Error("ElasticLake multipart abort failed (HTTP " + response.status + ").");
  }
}

async function multipartVideo(env, key, body, size, headers) {
  const count = Math.ceil(size / PART_SIZE);
  if (count > MAX_PARTS) throw new Error("Video exceeds the supported multipart part limit.");
  const start = await request(env, "POST", key, undefined, headers, "uploads");
  await ensureOk("multipart initiation", start);
  const uploadId = xmlValue(await start.text(), "UploadId");
  if (!uploadId) throw new Error("ElasticLake did not return a multipart upload ID.");

  const parts = [];
  try {
    for (let number = 1, offset = 0; offset < size; number++, offset += PART_SIZE) {
      const end = Math.min(offset + PART_SIZE, size);
      const response = await request(env, "PUT", key, sliceBody(body, offset, end), {},
        new URLSearchParams({ partNumber: String(number), uploadId }).toString());
      await ensureOk("multipart part " + number, response);
      const etag = response.headers.get("etag");
      if (!etag) throw new Error("ElasticLake did not return an ETag for part " + number + ".");
      parts.push({ number, etag });
    }

    const xml = "<CompleteMultipartUpload>" + parts.map(p =>
      "<Part><PartNumber>" + p.number + "</PartNumber><ETag>" + xmlEscape(p.etag) + "</ETag></Part>"
    ).join("") + "</CompleteMultipartUpload>";
    const complete = await request(env, "POST", key, xml, { "content-type": "application/xml" },
      new URLSearchParams({ uploadId }).toString());
    await ensureOk("multipart completion", complete);
    const result = await complete.text().catch(() => "");
    if (/<Error(?:\s|>)/i.test(result)) throw new Error("ElasticLake returned an error during multipart completion.");
  } catch (error) {
    try { await abortUpload(env, key, uploadId); } catch { /* preserve original upload failure */ }
    throw error;
  }

  return { ok: true, storageReady: true, status: "stored", key, storage: "ElasticLake", uploadMode: "multipart", parts: parts.length };
}

export async function storeVideo(env, key, body, metadata = {}) {
  if (!isStorageReady(env)) return notReady("storage-not-ready");
  if (body === undefined || body === null) throw new Error("ElasticLake video body is required.");
  const objectKey = keyOf(key);
  const headers = {
    "content-type": cleanText(metadata.contentType || "application/octet-stream", 128),
    "x-amz-meta-filename": fileName(metadata.fileName),
    "x-amz-meta-title": cleanText(metadata.title, 180),
    "x-amz-meta-visibility": cleanText(metadata.visibility || "private", 32)
  };
  const size = sizeOf(body);
  if (size !== null && size > MULTIPART_THRESHOLD) return multipartVideo(env, objectKey, body, size, headers);
  const response = await request(env, "PUT", objectKey, body, headers);
  await ensureOk("video upload", response);
  return { ok: true, storageReady: true, status: "stored", key: objectKey, storage: "ElasticLake", uploadMode: "single" };
}

export async function listVideos(env, options = {}) {
  if (!isStorageReady(env)) return notReady("storage-not-ready", { videos: [], isTruncated: false, nextContinuationToken: null });
  const maxKeys = Number(options.maxKeys ?? 1000);
  if (!Number.isInteger(maxKeys) || maxKeys < 1 || maxKeys > 1000) {
    throw new Error("Video listing maxKeys must be an integer between 1 and 1000.");
  }

  const params = new URLSearchParams({ "list-type": "2", prefix: "videos/", "max-keys": String(maxKeys), "encoding-type": "url" });
  if (options.continuationToken) params.set("continuation-token", String(options.continuationToken));
  const response = await request(env, "GET", "", undefined, {}, params.toString());
  await ensureOk("video listing", response);
  const xml = await response.text();
  if (/<Error(?:\s|>)/i.test(xml) || !/<ListBucketResult(?:\s|>)/i.test(xml)) {
    throw new Error("ElasticLake returned an invalid ListObjectsV2 response.");
  }

  const videos = xmlBlocks(xml, "Contents").map(block => {
    let key;
    try { key = decodeURIComponent(xmlValue(block, "Key")); }
    catch { throw new Error("ElasticLake returned a malformed URL-encoded object key."); }
    const size = Number(xmlValue(block, "Size"));
    if (!key || !Number.isSafeInteger(size) || size < 0) throw new Error("ElasticLake returned invalid object metadata.");
    return {
      key, size, lastModified: xmlValue(block, "LastModified"),
      etag: xmlValue(block, "ETag").replace(/^"|"$/g, "")
    };
  }).filter(item => item.key.startsWith("videos/"));

  const isTruncated = xmlValue(xml, "IsTruncated").toLowerCase() === "true";
  const nextContinuationToken = isTruncated ? (xmlValue(xml, "NextContinuationToken") || null) : null;
  if (isTruncated && !nextContinuationToken) throw new Error("ElasticLake omitted the continuation token for a truncated listing.");

  return { ok: true, storageReady: true, status: "listed", videos, isTruncated, nextContinuationToken };
}
