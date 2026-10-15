import { createX4KissModuleLifecycle } from "./x4kiss-module-lifecycle-core.js";
import { validateX4KissModuleLifecycleRules } from "./x4kiss-module-lifecycle-rules.js";

export function runX4KissModuleLifecycleSelfCheck() {
  const rules = validateX4KissModuleLifecycleRules();
  const core = {
    modules: {},
    registerModule(name, status) {
      this.modules[name] = { status };
      return true;
    }
  };

  const lifecycle = createX4KissModuleLifecycle(core);
  const calls = [];
  const hooks = {
    init: () => calls.push("init"),
    start: () => calls.push("start"),
    stop: () => calls.push("stop"),
    destroy: () => calls.push("destroy")
  };

  const registered = lifecycle.register("test-module", hooks);
  const duplicate = lifecycle.register("test-module", hooks);
  const initialized = lifecycle.initialize("test-module");
  const active = lifecycle.activate("test-module");
  const activeDeactivate = lifecycle.deactivate("test-module");
  const reactivated = lifecycle.activate("test-module");
  const invalidDestroy = lifecycle.destroy("test-module");
  const stopped = lifecycle.deactivate("test-module");
  const destroyed = lifecycle.destroy("test-module");
  const invalidActivate = lifecycle.activate("test-module");

  const status = lifecycle.getStatus("test-module");

  const ok =
    rules.ok === true &&
    registered.ok === true &&
    duplicate.ok === false &&
    initialized.ok === true &&
    active.ok === true &&
    activeDeactivate.ok === true &&
    reactivated.ok === true &&
    invalidDestroy.ok === false &&
    stopped.ok === true &&
    destroyed.ok === true &&
    invalidActivate.ok === false &&
    status.state === "destroyed" &&
    calls.join(",") === "init,start,stop,start,stop,destroy" &&
    core.modules["test-module"].status === "destroyed";

  return {
    ok,
    stage: "15.24",
    rules,
    transitions: {
      registered: registered.ok,
      initialized: initialized.ok,
      active: active.ok,
      deactivate: activeDeactivate.ok,
      reactivated: reactivated.ok,
      invalidDestroyRejected: invalidDestroy.ok === false,
      stopped: stopped.ok,
      destroyed: destroyed.ok,
      invalidActivateRejected: invalidActivate.ok === false
    },
    finalState: status.state,
    hookSequence: calls,
    coreStatus: core.modules["test-module"]?.status || null
  };
}
