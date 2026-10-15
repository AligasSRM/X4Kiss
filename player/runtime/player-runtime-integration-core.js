import { validateX4KissPlayerRuntimeIntegrationRequest } from "./player-runtime-integration-rules.js";

export const X4KISS_PLAYER_RUNTIME_INTEGRATION_CORE = {
  section: "15.16",
  name: "X4Kiss Player Runtime Integration Core",
  version: "1.0.0",
  status: "connected",
  failClosed: true
};

export const X4KISS_APPROVED_QUALITIES = ["340p", "460p", "720p", "1080p"];

export function getX4KissPlayerRuntimeIntegrationStatus() {
  return {
    ok: true,
    stage: "15.16",
    service: X4KISS_PLAYER_RUNTIME_INTEGRATION_CORE.name,
    status: X4KISS_PLAYER_RUNTIME_INTEGRATION_CORE.status,
    approvedQualities: [...X4KISS_APPROVED_QUALITIES]
  };
}

export function evaluateX4KissPlayerRuntimeIntegration(request = {}) {
  const validation = validateX4KissPlayerRuntimeIntegrationRequest(request);
  return { allowed: validation.allowed === true, gates: validation.gates };
}
