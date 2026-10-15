import {
  XKISS_WORKER_ENVIRONMENT_CONTRACT,
  evaluateWorkerEnvironment,
  validateWorkerEnvironmentContract
} from "./xkiss-worker-environment-contract.js";

const TEST_ENV = {
  ELASTICLAKE_ENDPOINT: "https://app.elasticlake.com",
  ELASTICLAKE_BUCKET: "xkiss-storage--xkiss-production--xkiss-midea",
  ELASTICLAKE_REGION: "auto",
  ELASTICLAKE_ACCESS_KEY_ID: "test-access-key",
  ELASTICLAKE_SECRET_ACCESS_KEY: "test-secret-key"
};

export function runXKissWorkerEnvironmentContractSelfTest() {
  const empty = evaluateWorkerEnvironment({});
  const complete = evaluateWorkerEnvironment(TEST_ENV);
  const missingBindingCases = XKISS_WORKER_ENVIRONMENT_CONTRACT.requiredBindings.map(({ name }) => {
    const env = { ...TEST_ENV };
    delete env[name];
    return evaluateWorkerEnvironment(env);
  });
  const falseyBindingCases = XKISS_WORKER_ENVIRONMENT_CONTRACT.requiredBindings.map(({ name }) =>
    evaluateWorkerEnvironment({ ...TEST_ENV, [name]: "" })
  );

  const ok =
    empty.status === "BLOCKED" &&
    empty.activationAllowed === false &&
    empty.failClosed === true &&
    empty.missingBindings.length === XKISS_WORKER_ENVIRONMENT_CONTRACT.requiredBindings.length &&
    complete.status === "READY_FOR_PROVIDER_VERIFICATION" &&
    complete.missingBindings.length === 0 &&
    complete.activationAllowed === false &&
    complete.failClosed === true &&
    missingBindingCases.every((result) =>
      result.status === "BLOCKED" &&
      result.activationAllowed === false &&
      result.missingBindings.length === 1
    ) &&
    falseyBindingCases.every((result) =>
      result.status === "BLOCKED" &&
      result.activationAllowed === false &&
      result.missingBindings.length === 1
    ) &&
    validateWorkerEnvironmentContract({}).ok === true &&
    validateWorkerEnvironmentContract(TEST_ENV).ok === true;

  return {
    ok,
    cases: {
      emptyEnvironmentBlocks: empty.status === "BLOCKED",
      completeTestEnvironmentReadyForProviderVerification:
        complete.status === "READY_FOR_PROVIDER_VERIFICATION",
      everyRequiredBindingIsIndividuallyRequired:
        missingBindingCases.every((result) => result.missingBindings.length === 1),
      falseyBindingsAreRejected:
        falseyBindingCases.every((result) => result.missingBindings.length === 1),
      activationAlwaysDisabled:
        empty.activationAllowed === false &&
        complete.activationAllowed === false &&
        missingBindingCases.every((result) => result.activationAllowed === false) &&
        falseyBindingCases.every((result) => result.activationAllowed === false),
      contractValidationPasses: validateWorkerEnvironmentContract(TEST_ENV).ok === true
    }
  };
}
