export const X4KISS_STORAGE_PRODUCTION_GATE = {
  stage: "AUDIT-03",
  name: "Video Storage Production Gate",
  failClosed: true,
  provider: "ElasticLake",
  requiredConfiguration: [
    "ELASTICLAKE_ENDPOINT",
    "ELASTICLAKE_BUCKET",
    "ELASTICLAKE_REGION",
    "ELASTICLAKE_ACCESS_KEY_ID",
    "ELASTICLAKE_SECRET_ACCESS_KEY"
  ]
};

function storageConfigPresent(env = {}) {
  return X4KISS_STORAGE_PRODUCTION_GATE.requiredConfiguration.every(
    (name) => Boolean(env && env[name])
  );
}

export function evaluateStorageProductionGate(env = {}) {
  const configurationPresent = storageConfigPresent(env);

  return {
    ok: true,
    stage: X4KISS_STORAGE_PRODUCTION_GATE.stage,
    status: configurationPresent ? "READY_FOR_STORAGE_TEST" : "BLOCKED",
    configurationPresent,
    activationAllowed: false,
    failClosed: true,
    provider: X4KISS_STORAGE_PRODUCTION_GATE.provider,
    missingConfiguration: X4KISS_STORAGE_PRODUCTION_GATE.requiredConfiguration.filter(
      (name) => !Boolean(env && env[name])
    )
  };
}

export function validateStorageProductionGate(env = {}) {
  const result = evaluateStorageProductionGate(env);
  return {
    ok:
      result.failClosed === true &&
      result.status === (result.configurationPresent ? "READY_FOR_STORAGE_TEST" : "BLOCKED") &&
      result.activationAllowed === false &&
      Array.isArray(result.missingConfiguration)
  };
}
