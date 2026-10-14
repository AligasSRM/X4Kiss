import { createX4KissModuleLifecycle } from "./xkiss-module-lifecycle-core.js";
import { validateX4KissModuleLifecycleRules } from "./xkiss-module-lifecycle-rules.js";

export function installX4KissModuleLifecycle(core) {
  if (!core) return { ok: false, error: "player-core-not-found" };
  if (core.moduleLifecycle) return { ok: true, reused: true, lifecycle: core.moduleLifecycle };

  const rules = validateX4KissModuleLifecycleRules();
  if (!rules.ok) return { ok: false, error: "lifecycle-rules-invalid" };

  const lifecycle = createX4KissModuleLifecycle(core);
  core.moduleLifecycle = lifecycle;

  return {
    ok: true,
    reused: false,
    stage: "15.24",
    coreControlled: true,
    lifecycle
  };
}

// Backward-compatible alias for existing lifecycle workflows.
export const installXKissModuleLifecycle = installX4KissModuleLifecycle;
