export const X4KISS_PLAYER_RUNTIME_EVENTS_RULES = {
  section: "15.18",
  name: "X4Kiss Player Runtime Events Rules",
  version: "1.0.0",
  status: "prepared",
  operations: ["subscribe","emit","read_events"]
};

export function validateX4KissPlayerRuntimeEventsRequest(request = {}) {
  const operation = X4KISS_PLAYER_RUNTIME_EVENTS_RULES.operations.includes(request.operation);
  const core = request.playerCoreConnected === true;
  const state = request.runtimeStateConnected === true;
  return { allowed: operation && core && state, gates: { operation, playerCoreConnected: core, runtimeStateConnected: state } };
}
