import { createX4KissModuleOrchestrator } from "./x4kiss-module-orchestration-core.js";

export function installX4KissModuleOrchestrator(core) {
  if (!core) return { ok: false, error: "player-core-not-found" };
  if (core.moduleOrchestrator) return { ok: true, reused: true, orchestrator: core.moduleOrchestrator };
  if (!core.moduleContracts || !core.moduleLifecycle) {
    return { ok: false, error: "required-core-modules-missing" };
  }
  const orchestrator = createX4KissModuleOrchestrator(core);
  core.moduleOrchestrator = orchestrator;
  return { ok: true, reused: false, stage: "15.26", coreControlled: true, orchestrator };
}

