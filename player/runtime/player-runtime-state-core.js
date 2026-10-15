import { validateX4KissPlayerRuntimeStateRequest } from "./player-runtime-state-rules.js";

export const X4KISS_PLAYER_RUNTIME_STATE_CORE = {
  section: "15.17",
  name: "X4Kiss Player Runtime State Core",
  version: "1.0.0",
  status: "connected",
  failClosed: true
};

export function getX4KissPlayerRuntimeState(video) {
  if (!video) return { ok: false, reason: "video_element_missing" };
  return {
    ok: true,
    paused: video.paused,
    currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    duration: Number.isFinite(video.duration) ? video.duration : null,
    readyState: video.readyState,
    networkState: video.networkState,
    ended: video.ended,
    muted: video.muted,
    volume: video.volume,
    playbackRate: video.playbackRate,
    currentSrc: video.currentSrc || ""
  };
}

export function evaluateX4KissPlayerRuntimeState(request = {}) {
  const validation = validateX4KissPlayerRuntimeStateRequest(request);
  return { allowed: validation.allowed === true, gates: validation.gates };
}
