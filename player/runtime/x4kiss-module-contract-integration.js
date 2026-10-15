import { createX4KissModuleContractRegistry } from "./x4kiss-module-contract-core.js";
import { validateX4KissModuleContractRules } from "./x4kiss-module-contract-rules.js";

export function installX4KissModuleContractRegistry(core) {
  if (!core) return { ok: false, error: "player-core-not-found" };
  if (core.moduleContracts) return { ok: true, reused: true, registry: core.moduleContracts };

  const rules = validateX4KissModuleContractRules();
  if (!rules.ok) return { ok: false, error: "contract-rules-invalid" };

  const registry = createX4KissModuleContractRegistry(core);
  core.moduleContracts = registry;

  return {
    ok: true,
    reused: false,
    stage: "15.25",
    coreControlled: true,
    registry
  };
}

