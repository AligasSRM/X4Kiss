import { getX4KissPlayerRuntimeIntegrationStatus, evaluateX4KissPlayerRuntimeIntegration, X4KISS_APPROVED_QUALITIES } from "./player-runtime-integration-core.js";

export function runX4KissPlayerRuntimeIntegrationSelfCheck() {
  const status = getX4KissPlayerRuntimeIntegrationStatus();
  const valid = evaluateX4KissPlayerRuntimeIntegration({
    operation: "validate_video_runtime",
    homepageVerified: true,
    playerPageVerified: true,
    playerCoreConnected: true,
    modulesConnected: true,
    qualitiesVerified: true,
    videoRuntimeVerified: true
  });
  const incomplete = evaluateX4KissPlayerRuntimeIntegration({
    operation: "validate_video_runtime",
    homepageVerified: true,
    playerPageVerified: true,
    playerCoreConnected: true,
    modulesConnected: false,
    qualitiesVerified: true,
    videoRuntimeVerified: true
  });
  const checks = {
    stage: status.stage === "15.16",
    connected: status.status === "connected",
    qualitySet: JSON.stringify(X4KISS_APPROVED_QUALITIES) === JSON.stringify(["340p","460p","720p","1080p"]),
    validAccepted: valid.allowed === true,
    incompleteDenied: incomplete.allowed === false
  };
  return { ok: Object.values(checks).every(Boolean), stage: "15.16", checks };
}
