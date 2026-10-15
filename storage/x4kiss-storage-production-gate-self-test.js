import {
  evaluateStorageProductionGate,
  validateStorageProductionGate
} from "./x4kiss-storage-production-gate.js";

const complete = {
  ELASTICLAKE_ENDPOINT: "https://app.elasticlake.com",
  ELASTICLAKE_BUCKET: "x4kiss-storage--x4kiss-production--x4kiss-midea",
  ELASTICLAKE_REGION: "auto",
  ELASTICLAKE_ACCESS_KEY_ID: "test-access-key",
  ELASTICLAKE_SECRET_ACCESS_KEY: "test-secret-key"
};

export function runX4KissStorageProductionGateSelfTest() {
  const missing = evaluateStorageProductionGate({});
  const partial = evaluateStorageProductionGate({
    ELASTICLAKE_ENDPOINT: complete.ELASTICLAKE_ENDPOINT
  });
  const present = evaluateStorageProductionGate(complete);

  return {
    ok:
      missing.status === "BLOCKED" &&
      missing.activationAllowed === false &&
      missing.missingConfiguration.length === 5 &&
      partial.status === "BLOCKED" &&
      partial.activationAllowed === false &&
      partial.missingConfiguration.length === 4 &&
      present.status === "READY_FOR_STORAGE_TEST" &&
      present.activationAllowed === false &&
      present.missingConfiguration.length === 0 &&
      validateStorageProductionGate({}).ok === true &&
      validateStorageProductionGate(complete).ok === true
  };
}
