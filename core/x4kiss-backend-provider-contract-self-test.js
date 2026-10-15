import {
  X4KISS_BACKEND_PROVIDER_CONTRACT,
  evaluateBackendProviderContract
} from "./x4kiss-backend-provider-contract.js";

const EXPECTED_CAPABILITIES = {
  safety: ["identity", "age_verification", "creator_verification", "moderation", "reporting", "audit", "privacy"],
  admin: ["admin_auth", "authorization", "admin_audit", "secure_data_access"],
  superAdmin: ["authentication", "mfa", "session", "reauthentication", "privileged_authorization", "security_audit"],
  settings: ["settings_read", "settings_write", "authorization", "audit"]
};

const complete = Object.fromEntries(
  Object.entries(EXPECTED_CAPABILITIES).map(([key, capabilities]) => [
    key,
    { connected: true, capabilities: [...capabilities] }
  ])
);

export function runX4KissBackendProviderContractSelfTest() {
  const blocked = evaluateBackendProviderContract({});
  const ready = evaluateBackendProviderContract(complete);

  const individuallyMissingProviders = Object.keys(EXPECTED_CAPABILITIES).map((key) => {
    const providers = { ...complete };
    delete providers[key];
    return { key, result: evaluateBackendProviderContract(providers) };
  });

  const disconnectedProviders = Object.keys(EXPECTED_CAPABILITIES).map((key) =>
    evaluateBackendProviderContract({
      ...complete,
      [key]: { ...complete[key], connected: false }
    })
  );

  const missingCapabilityCases = Object.entries(EXPECTED_CAPABILITIES).flatMap(([key, capabilities]) =>
    capabilities.map((capability) => {
      const providers = {
        ...complete,
        [key]: {
          connected: true,
          capabilities: complete[key].capabilities.filter((item) => item !== capability)
        }
      };
      return { key, capability, result: evaluateBackendProviderContract(providers) };
    })
  );

  const strictConnectionCases = [1, "true", null, undefined].map((connected) =>
    evaluateBackendProviderContract({
      ...complete,
      safety: { ...complete.safety, connected }
    })
  );
  const validConnectionFlag = evaluateBackendProviderContract({
    ...complete,
    safety: { ...complete.safety, connected: true }
  });

  const cases = {
    contractDeclaresFourProviders:
      Object.keys(X4KISS_BACKEND_PROVIDER_CONTRACT.providers).length === 4,
    emptyEnvironmentBlocks:
      blocked.status === "BLOCKED" &&
      blocked.missingProviders.length === 4 &&
      blocked.activationAllowed === false &&
      blocked.failClosed === true,
    completeEnvironmentReadyForIntegrationOnly:
      ready.status === "READY_FOR_INTEGRATION_TEST" &&
      ready.missingProviders.length === 0 &&
      ready.activationAllowed === false &&
      ready.failClosed === true,
    everyProviderIsIndividuallyRequired:
      individuallyMissingProviders.every(({ key, result }) =>
        result.status === "BLOCKED" &&
        result.missingProviders.includes(key) &&
        result.activationAllowed === false
      ),
    disconnectedProvidersAreRejected:
      disconnectedProviders.every((result) =>
        result.status === "BLOCKED" && result.activationAllowed === false
      ),
    everyRequiredCapabilityIsIndividuallyRequired:
      missingCapabilityCases.length === Object.values(EXPECTED_CAPABILITIES).reduce((n, list) => n + list.length, 0) &&
      missingCapabilityCases.every(({ key, result }) =>
        result.status === "BLOCKED" &&
        result.missingProviders.includes(key) &&
        result.activationAllowed === false
      ),
    connectionMustBeStrictBooleanTrue:
      validConnectionFlag.status === "READY_FOR_INTEGRATION_TEST" &&
      strictConnectionCases.every((result) =>
        result.status === "BLOCKED" &&
        result.missingProviders.includes("safety") &&
        result.activationAllowed === false
      ),
    activationAlwaysDisabled:
      blocked.activationAllowed === false &&
      ready.activationAllowed === false &&
      validConnectionFlag.activationAllowed === false &&
      individuallyMissingProviders.every(({ result }) => result.activationAllowed === false) &&
      disconnectedProviders.every((result) => result.activationAllowed === false) &&
      missingCapabilityCases.every(({ result }) => result.activationAllowed === false) &&
      strictConnectionCases.every((result) => result.activationAllowed === false)
  };

  return {
    ok: Object.values(cases).every(Boolean),
    cases,
    counts: {
      providers: Object.keys(EXPECTED_CAPABILITIES).length,
      requiredCapabilities: Object.values(EXPECTED_CAPABILITIES).reduce((n, list) => n + list.length, 0),
      missingCapabilityCases: missingCapabilityCases.length
    }
  };
}
