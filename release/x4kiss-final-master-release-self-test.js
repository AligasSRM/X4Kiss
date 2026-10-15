import fs from "node:fs";
import path from "node:path";
import {validateFinalMasterLock} from "./x4kiss-final-master-lock.js";
import {runSection19SelfTest} from "../activation/x4kiss-production-activation-readiness-self-test.js";

const root=process.cwd();
const required=[
  "audit/x4kiss-section-20-master-spec.md",
  "release/x4kiss-final-master-lock.js",
  "release/x4kiss-final-master-release-self-test.js",
  "activation/x4kiss-production-activation-readiness-self-test.js"
];

export function runSection20SelfTest(){
  const lock=validateFinalMasterLock();
  const section19=runSection19SelfTest();
  const presence=required.every(p=>fs.existsSync(path.join(root,p)));
  const ok=presence&&lock.ok===true&&section19.ok===true;
  return {
    ok,
    test:"X4Kiss Section 20 Final Master Release self-test",
    section:"20",
    status:ok?"GREEN_CLOSED":"FAULT_FAIL_CLOSED",
    locked:ok,
    failClosed:true,
    productionActivationAllowed:false,
    protectedSections:19,
    section19Verified:section19.ok===true
  };
}
