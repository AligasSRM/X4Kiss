import { recordX4KissPlayerRuntimeEvent, readX4KissPlayerRuntimeEvents, evaluateX4KissPlayerRuntimeEvents } from "./player-runtime-events-core.js";

export function runX4KissPlayerRuntimeEventsSelfCheck() {
  const before = readX4KissPlayerRuntimeEvents().length;
  const emitted = recordX4KissPlayerRuntimeEvent("test", { ok: true });
  const after = readX4KissPlayerRuntimeEvents();
  const valid = evaluateX4KissPlayerRuntimeEvents({
    operation: "emit", playerCoreConnected: true, runtimeStateConnected: true
  });
  const denied = evaluateX4KissPlayerRuntimeEvents({
    operation: "emit", playerCoreConnected: true, runtimeStateConnected: false
  });
  const checks = {
    stage: true,
    eventRecorded: emitted.ok === true && after.length === before + 1,
    payloadPreserved: after.at(-1)?.detail?.ok === true,
    validAccepted: valid.allowed === true,
    invalidDenied: denied.allowed === false
  };
  return { ok: Object.values(checks).every(Boolean), stage: "15.18", checks };
}
