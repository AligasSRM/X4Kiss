import { getX4KissSettingsRuntimeStatus, validateX4KissSettingsRuntimeCore } from "../settings/xkiss-settings-runtime-core.js";
import { getSystemSettingsRuntimeActivationStatus } from "../settings/system-settings-runtime-activation-core.js";

export const XKISS_PLATFORM_CORE = {
  section: "XKISS-PLATFORM-CORE",
  name: "X4Kiss Platform Core",
  version: "1.0.0",
  status: "connected",
  backendOnly: true,
  frontendCannotAuthorize: true,
  frontendCannotStoreSecrets: true,
  activationRequiresBackend: true,
  activationStage: "15.15"
};

export function getX4KissPlatformCoreStatus() {
  const settings = getX4KissSettingsRuntimeStatus();
  const settingsValidation = validateX4KissSettingsRuntimeCore();
  const activation = getSystemSettingsRuntimeActivationStatus();

  return {
    ok:
      settings.ok === true &&
      settingsValidation.ok === true &&
      activation.ok === true,
    service: XKISS_PLATFORM_CORE.name,
    version: XKISS_PLATFORM_CORE.version,
    status: XKISS_PLATFORM_CORE.status,
    backendOnly: XKISS_PLATFORM_CORE.backendOnly,
    settingsRuntimeConnected: settingsValidation.runtimeConnected === true,
    settingsBackendOnly: settings.backendOnly === true,
    activationGateConnected:
      settingsValidation.activationGateConnected === true &&
      activation.status === "connected",
    activationAllowed: false
  };
}

export function validateX4KissPlatformCore() {
  const status = getX4KissPlatformCoreStatus();

  return {
    ok:
      status.ok === true &&
      status.settingsRuntimeConnected === true &&
      status.settingsBackendOnly === true &&
      status.activationGateConnected === true &&
      status.activationAllowed === false,
    platformCoreConnected: true,
    settingsRuntimeConnected: status.settingsRuntimeConnected,
    activationGateConnected: status.activationGateConnected,
    activationAllowed: false
  };
}
