import {runAutonomousControl} from "./x4kiss-control-runner.js";
export async function runControlSectionSelfTest(){
  const r=await runAutonomousControl();
  return {...r,ok:r.ok===true&&r.failClosed===true&&r.productionActivationAllowed===false,status:r.ok?"GREEN_CLOSED":"FAULT_FAIL_CLOSED",test:"X4Kiss Section 18 Autonomous Control operational self-test"};
}
