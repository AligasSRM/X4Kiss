import { getX4KissPlayerRuntimeState, evaluateX4KissPlayerRuntimeState } from "./player-runtime-state-core.js";

export function runX4KissPlayerRuntimeStateSelfCheck() {
  const valid = evaluateX4KissPlayerRuntimeState({
    operation: "read_state",
    playerCoreConnected: true,
    videoElementReady: true,
    stateReadable: true
  });
  const denied = evaluateX4KissPlayerRuntimeState({
    operation: "read_state",
    playerCoreConnected: true,
    videoElementReady: false,
    stateReadable: true
  });
  const fakeVideo = {
    paused: true, currentTime: 0, duration: 10, readyState: 4, networkState: 1,
    ended: false, muted: false, volume: 1, playbackRate: 1, currentSrc: "test.mp4"
  };
  const state = getX4KissPlayerRuntimeState(fakeVideo);
  const checks = {
    stage: true,
    validAccepted: valid.allowed === true,
    invalidDenied: denied.allowed === false,
    stateReadable: state.ok === true && state.readyState === 4 && state.duration === 10
  };
  return { ok: Object.values(checks).every(Boolean), stage: "15.17", checks };
}
