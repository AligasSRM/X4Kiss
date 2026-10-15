import { createX4KissModuleSecurity } from "./x4kiss-module-security-core.js";

export function installX4KissModuleSecurity(core) {
  if (!core) return { ok: false, error: "player-core-not-found" };
  if (core.moduleSecurity) {
    return { ok: true, reused: true, stage: "15.27", coreControlled: true, security: core.moduleSecurity };
  }

  if (!core.moduleContracts || !core.moduleLifecycle || !core.moduleOrchestrator) {
    return { ok: false, error: "required-core-controls-missing" };
  }

  const security = createX4KissModuleSecurity(core);
  core.moduleSecurity = security;
  security.captureIntegritySnapshot();

  return {
    ok: true,
    reused: false,
    stage: "15.27",
    coreControlled: true,
    security
  };
}

