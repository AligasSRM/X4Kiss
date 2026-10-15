export const X4KISS_PLAYER_RUNTIME_STATE_RULES = {
  section: "15.17",
  name: "X4Kiss Player Runtime State Rules",
  version: "1.0.0",
  status: "prepared",
  operations: ["read_state","validate_state"]
};

export function validateX4KissPlayerRuntimeStateRequest(request = {}) {
  const operation = X4KISS_PLAYER_RUNTIME_STATE_RULES.operations.includes(request.operation);
  const playerCore = request.playerCoreConnected === true;
  const videoElement = request.videoElementReady === true;
  const stateReadable = request.stateReadable === true;
  return {
    allowed: operation && playerCore && videoElement && stateReadable,
    gates: { operation, playerCoreConnected: playerCore, videoElementReady: videoElement, stateReadable }
  };
}
