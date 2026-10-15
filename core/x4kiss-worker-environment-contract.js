export const X4KISS_WORKER_ENVIRONMENT_CONTRACT = {
  stage: "AUDIT-04",
  name: "X4Kiss Worker Environment Contract",
  version: "1.1.0",
  failClosed: true,
  requiredBindings: [
    { name: "ELASTICLAKE_ENDPOINT", purpose: "video_storage_endpoint", requiredFor: "storage" },
    { name: "ELASTICLAKE_BUCKET", purpose: "video_storage_bucket", requiredFor: "storage" },
    { name: "ELASTICLAKE_REGION", purpose: "video_storage_region", requiredFor: "storage" },
    { name: "ELASTICLAKE_ACCESS_KEY_ID", purpose: "video_storage_access_key", requiredFor: "storage" },
    { name: "ELASTICLAKE_SECRET_ACCESS_KEY", purpose: "video_storage_secret_key", requiredFor: "storage" }
  ],
  providerBoundary: "Cloudflare Worker environment",
  secretsPolicy: "backend_only"
};

export function evaluateWorkerEnvironment(env = {}) {
  const bindings = Object.fromEntries(
    X4KISS_WORKER_ENVIRONMENT_CONTRACT.requiredBindings.map((item) => [
      item.name,
      Boolean(env && env[item.name])
    ])
  );
  const missing = Object.keys(bindings).filter((name) => !bindings[name]);

  return {
    ok: true,
    stage: X4KISS_WORKER_ENVIRONMENT_CONTRACT.stage,
    status: missing.length === 0 ? "READY_FOR_PROVIDER_VERIFICATION" : "BLOCKED",
    activationAllowed: false,
    failClosed: true,
    bindings,
    missingBindings: missing,
    providerBoundary: X4KISS_WORKER_ENVIRONMENT_CONTRACT.providerBoundary,
    secretsPolicy: X4KISS_WORKER_ENVIRONMENT_CONTRACT.secretsPolicy
  };
}

export function validateWorkerEnvironmentContract(env = {}) {
  const result = evaluateWorkerEnvironment(env);
  return {
    ok:
      result.failClosed === true &&
      result.activationAllowed === false &&
      Array.isArray(result.missingBindings),
    stage: result.stage
  };
}
