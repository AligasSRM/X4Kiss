import { getX4KissProductionReadiness, validateX4KissProductionReadiness } from "./x4kiss-production-readiness-core.js";

export function runX4KissProductionReadinessSelfTest() {
  const status = getX4KissProductionReadiness();
  const validation = validateX4KissProductionReadiness();

  return {
    ok:
      status.ok === true &&
      status.status === "BLOCKED" &&
      status.productionActivationAllowed === false &&
      status.blockerCount >= 1 &&
      validation.ok === true &&
      validation.activationAllowed === false
  };
}
