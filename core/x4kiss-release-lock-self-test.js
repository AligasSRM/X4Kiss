import { getX4KissReleaseLockStatus } from "./x4kiss-release-lock.js";

export function runX4KissReleaseLockSelfTest() {
  const status = getX4KissReleaseLockStatus();
  return {
    ok:
      status.locked === true &&
      status.state === "FINAL_LOCKED" &&
      status.sourceCode === "LOCKED" &&
      status.productionActivation === "BLOCKED_UNTIL_EXTERNAL_VERIFICATION" &&
      status.failClosed === true &&
      status.lockBypass === false
  };
}
