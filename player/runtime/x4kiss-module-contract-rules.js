export const X4KISS_MODULE_CONTRACT_RULES = Object.freeze({
  stage: "15.25",
  name: "Module Contract Registry",
  coreControlled: true,
  failClosed: true,
  maxNameLength: 80
});

function validName(name) {
  return typeof name === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(name);
}

export function validateX4KissModuleContract(contract = {}) {
  const dependencies = Array.isArray(contract.dependencies) ? contract.dependencies : [];
  const capabilities = Array.isArray(contract.capabilities) ? contract.capabilities : [];
  const validDependencies = dependencies.every(validName) && new Set(dependencies).size === dependencies.length;
  const validCapabilities = capabilities.every(value => typeof value === "string" && value.length > 0 && value.length <= 80) &&
    new Set(capabilities).size === capabilities.length;
  const validVersion = typeof contract.version === "string" && contract.version.length > 0 && contract.version.length <= 40;
  return {
    ok: validDependencies && validCapabilities && validVersion,
    validDependencies,
    validCapabilities,
    validVersion,
    coreControlled: true,
    failClosed: true
  };
}

export function validateX4KissModuleContractRules() {
  return {
    ok: X4KISS_MODULE_CONTRACT_RULES.coreControlled === true &&
      X4KISS_MODULE_CONTRACT_RULES.failClosed === true &&
      X4KISS_MODULE_CONTRACT_RULES.maxNameLength === 80,
    ...X4KISS_MODULE_CONTRACT_RULES
  };
}

