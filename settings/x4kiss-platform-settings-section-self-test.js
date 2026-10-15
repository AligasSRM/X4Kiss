import { runPlatformSettingsSectionCheck } from "./x4kiss-platform-settings-section-core.js";

export function runX4KissPlatformSettingsSectionSelfTest() {
  const result = runPlatformSettingsSectionCheck();

  return {
    ok: result.ok === true &&
      result.section === "15" &&
      result.status === "GREEN_CLOSED" &&
      result.failClosed === true &&
      result.productionActivationAllowed === false,
    section: "15",
    test: "X4Kiss Platform Settings Section 15 complete self-test",
    status: result.status,
    productionActivationAllowed: result.productionActivationAllowed,
    externalActivationRequired: result.externalActivationRequired,
    reason: result.reason
  };
}

