import { getSystemSettingsCoreStatus, validateSystemSettingsCore } from "./system-settings-core.js";
import {
  getSystemSettingsRuntimeActivationStatus,
  evaluateSystemSettingsRuntimeActivation
} from "./system-settings-runtime-activation-core.js";

export const X4KISS_SETTINGS_RUNTIME_CORE = {
  section: "15.RUNTIME-SETTINGS",
  name: "X4Kiss Settings Runtime Core",
  status: "connected",
  backendOnly: true,
  frontendCannotAuthorize: true,
  frontendCannotStoreSecrets: true,
  activationRequiresBackend: true,
  activationStage: "15.15"
};

export function getX4KissSettingsRuntimeStatus() {
  const core = getSystemSettingsCoreStatus();
  const validation = validateSystemSettingsCore();
  const activation = getSystemSettingsRuntimeActivationStatus();
  const activationGate = evaluateSystemSettingsRuntimeActivation({
    operation: "validate_activation",
    backendConnected: false,
    providersVerified: false,
    authorizationVerified: false,
    auditVerified: false
  });

  return {
    ok: core.ok === true && validation.ok === true && activation.ok === true,
    service: X4KISS_SETTINGS_RUNTIME_CORE.name,
    status: X4KISS_SETTINGS_RUNTIME_CORE.status,
    backendOnly: X4KISS_SETTINGS_RUNTIME_CORE.backendOnly,
    coreStage: core.section,
    coreConnected: validation.coreConnected === true,
    rulesConnected: validation.rulesConnected === true,
    activationStage: activation.stage,
    activationGateConnected: activation.status === "connected",
    activationAllowed: activationGate.allowed === true && activation.activationAllowed === true,
    reason: "Settings Runtime Core is connected to the X4Kiss backend boundary. Production activation remains fail-closed until backend providers, authorization and audit verification are connected."
  };
}

export function validateX4KissSettingsRuntimeCore() {
  const status = getX4KissSettingsRuntimeStatus();

  return {
    ok: status.ok === true,
    runtimeConnected: status.coreConnected === true,
    backendOnly: status.backendOnly === true,
    activationGateConnected: status.activationGateConnected === true,
    activationAllowed: false
  };
}
