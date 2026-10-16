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
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("ElasticLake endpoint must be an HTTPS URL without credentials or query parameters.");
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

const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
const MULTIPART_PART_SIZE = 10 * 1024 * 1024;

function knownBodySize(body) {
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.size;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (typeof body === "string") return new TextEncoder().encode(body).byteLength;
  return null;
}

function bodyPart(body, start, end) {
  if (typeof Blob !== "undefined" && body instanceof Blob) return body.slice(start, end);
  if (body instanceof ArrayBuffer) return body.slice(start, end);
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset + start, end - start);
  if (typeof body === "string") return new TextEncoder().encode(body).slice(start, end);
  throw new Error("Large video uploads require a Blob, ArrayBuffer, or typed-array body to split safely.");
}

function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
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
  const size = knownBodySize(body);

  if (size === null || size <= MULTIPART_THRESHOLD) {
    const response = await requestObject(env, "PUT", keyName, body, headers);
    await requireSuccess("video upload", response);
    return {
      ok: true, storageReady: true, status: "stored", key: keyName,
      storage: "ElasticLake", uploadMode: "single"
    };
  }

  const partCount = Math.ceil(size / MULTIPART_PART_SIZE);
  if (partCount > 10000) throw new Error("Video exceeds the supported multipart upload part limit.");

  const initiate = await requestObject(env, "POST", keyName, undefined, headers, "?uploads");
  await requireSuccess("multipart upload initiation", initiate);
  const uploadId = xmlValue(await initiate.text(), "UploadId");
  if (!uploadId) throw new Error("ElasticLake did not return a multipart upload ID.");

  const parts = [];
  try {
    for (let partNumber = 1, offset = 0; offset < size; partNumber++, offset += MULTIPART_PART_SIZE) {
      const end = Math.min(offset + MULTIPART_PART_SIZE, size);
      const partResponse = await requestObject(
        env, "PUT", keyName, bodyPart(body, offset, end), {},
        "?partNumber=" + partNumber + "&uploadId=" + encodeURIComponent(uploadId)
      );
      await requireSuccess("multipart part " + partNumber, partResponse);
      const etag = partResponse.headers.get("etag");
      if (!etag) throw new Error("ElasticLake did not return an ETag for multipart part " + partNumber + ".");
      parts.push({ partNumber, etag });
    }

    const completionXml = "<CompleteMultipartUpload>" + parts.map(part =>
      "<Part><PartNumber>" + part.partNumber + "</PartNumber><ETag>" +
      escapeXml(part.etag) + "</ETag></Part>"
    ).join("") + "</CompleteMultipartUpload>";
    const complete = await requestObject(
      env, "POST", keyName, completionXml,
      { "content-type": "application/xml" },
      "?uploadId=" + encodeURIComponent(uploadId)
    );
    await requireSuccess("multipart upload completion", complete);
    const completionBody = await complete.text().catch(() => "");
    if (/<Error(?:\s|>)/i.test(completionBody)) {
      throw new Error("ElasticLake reported an error while completing the multipart upload.");
    }
  } catch (error) {
    try {
      const abort = await requestObject(
        env, "DELETE", keyName, undefined, {}, "?uploadId=" + encodeURIComponent(uploadId)
      );
      if (!abort.ok) await abort.body?.cancel?.().catch(() => {});
    } catch {
      // Preserve the original upload failure; cleanup is best effort.
    }
    throw error;
  }

  return {
    ok: true, storageReady: true, status: "stored", key: keyName,
    storage: "ElasticLake", uploadMode: "multipart", parts: parts.length
  };
}
function xmlValue(block, tag) {
  const match = block.match(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">"));
  if (!match) return "";
  return match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

export async function listVideos(env, options = {}) {
  if (!isStorageReady(env)) {
    return {
      ok: false, storageReady: false, status: "storage-not-ready",
      videos: [], isTruncated: false, nextContinuationToken: null
    };
  }
  const requestedMax = Number(options.maxKeys ?? 1000);
  if (!Number.isInteger(requestedMax) || requestedMax < 1 || requestedMax > 1000) {
    throw new Error("Video listing maxKeys must be an integer between 1 and 1000.");
  }
  const params = new URLSearchParams({
    "list-type": "2",
    prefix: "videos/",
    "max-keys": String(requestedMax)
  });
  if (options.continuationToken) params.set("continuation-token", String(options.continuationToken));
  const response = await requestObject(env, "GET", "", undefined, {}, "?" + params.toString());
  await requireSuccess("video listing", response);
  const xml = await response.text();
  const videos = (xml.match(/<Contents>[\\s\\S]*?<\\/Contents>/g) || [])
    .map(block => ({
      key: xmlValue(block, "Key"),
      size: Number(xmlValue(block, "Size") || 0),
      lastModified: xmlValue(block, "LastModified"),
      etag: xmlValue(block, "ETag").replace(/^"|"$/g, "")
    }))
    .filter(item => item.key.startsWith("videos/"));
  const isTruncated = xmlValue(xml, "IsTruncated").toLowerCase() === "true";
  const nextContinuationToken = isTruncated ? (xmlValue(xml, "NextContinuationToken") || null) : null;
  if (isTruncated && !nextContinuationToken) {
    throw new Error("ElasticLake marked the video listing as truncated but omitted the continuation token.");
  }
  return {
    ok: true, storageReady: true, status: "listed", videos,
    isTruncated, nextContinuationToken
  };
}