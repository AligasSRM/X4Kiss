import { randomUUID } from "node:crypto";
import {
  deleteJsonObject,
  getJsonObject,
  isStorageReady,
  storeJsonObject
} from "../storage/elasticlake-adapter.js";

const env = {
  ELASTICLAKE_ENDPOINT: process.env.ELASTICLAKE_ENDPOINT || "https://app.elasticlake.com",
  ELASTICLAKE_BUCKET: process.env.ELASTICLAKE_BUCKET || "x4kiss-storage--x4kiss-production--x4kiss-media",
  ELASTICLAKE_REGION: process.env.ELASTICLAKE_REGION || "auto",
  ELASTICLAKE_ACCESS_KEY_ID: process.env.ELASTICLAKE_ACCESS_KEY_ID || "",
  ELASTICLAKE_SECRET_ACCESS_KEY: process.env.ELASTICLAKE_SECRET_ACCESS_KEY || ""
};

if (!isStorageReady(env)) {
  console.error("BLOCKED: required ElasticLake settings are missing. Secret values were not printed.");
  process.exit(2);
}

const key = `diagnostics/elasticlake-live-test/${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`;
const expected = {
  purpose: "X4Kiss ElasticLake live write-read-delete verification",
  testId: randomUUID(),
  createdAt: new Date().toISOString(),
  disposable: true
};

let writePassed = false;
let readPassed = false;
let deletePassed = false;
let primaryError = null;

try {
  const write = await storeJsonObject(env, key, expected);
  writePassed = write.ok === true && write.status === "stored";
  console.log(`WRITE: ${writePassed ? "PASS" : "FAIL"}`);

  if (!writePassed) throw new Error("Storage write did not return the expected success status.");

  const read = await getJsonObject(env, key);
  readPassed = read.ok === true && read.status === "found"
    && JSON.stringify(read.value) === JSON.stringify(expected);
  console.log(`READ-BACK: ${readPassed ? "PASS (content matched)" : "FAIL"}`);

  if (!readPassed) throw new Error("Read-back content did not match the test payload.");
} catch (error) {
  primaryError = error;
  const message = String(error?.message || error);
  console.error(`TEST ERROR: ${message.slice(0, 500)}`);
} finally {
  try {
    const cleanup = await deleteJsonObject(env, key);
    deletePassed = cleanup.ok === true && ["deleted", "not-found"].includes(cleanup.status);
    console.log(`CLEANUP: ${deletePassed ? "PASS" : "FAIL"}`);
  } catch (error) {
    console.error(`CLEANUP: FAIL (${String(error?.message || error).slice(0, 300)})`);
  }
}

const verified = writePassed && readPassed && deletePassed && !primaryError;
console.log(`FINAL: ${verified ? "PASS — ElasticLake write/read/delete verified" : "FAIL — do not mark storage GREEN"}`);
process.exitCode = verified ? 0 : 1;
