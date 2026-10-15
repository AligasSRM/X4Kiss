import {installX4KissModuleLifecycle} from "./x4kiss-module-lifecycle-integration.js";
import {installX4KissModuleContractRegistry} from "./x4kiss-module-contract-integration.js";
import {installX4KissModuleHealth} from "./x4kiss-module-health-integration.js";
import {installX4KissModuleDiagnostics} from "./x4kiss-module-diagnostics-integration.js";
import {installX4KissModuleRecovery} from "./x4kiss-module-recovery-integration.js";
export async function runX4KissModuleRecoverySelfCheck(){
  const core={modules:{},registerModule(n,s="ready"){this.modules[n]=s;},getModuleStatus(){return{...this.modules}}};
  const lifecycle=installX4KissModuleLifecycle(core); const contracts=installX4KissModuleContractRegistry(core);
  const reg=lifecycle.lifecycle.register("repairable"); lifecycle.lifecycle.initialize("repairable"); lifecycle.lifecycle.activate("repairable");
  contracts.registry.register("repairable",{version:"1.0.0",dependencies:[],capabilities:["repair"]});
  const health=installX4KissModuleHealth(core); const diagnostics=installX4KissModuleDiagnostics(core); const recovery=installX4KissModuleRecovery(core);
  const handler=recovery.recovery.registerRepair("repairable",async()=>({ok:true}));
  health.health.report({module:"repairable",status:"FAULT",severity:"HIGH",timestamp:Date.now(),reason:"test"});
  const recovered=await recovery.recovery.recover({module:"repairable",reason:"test"});
  const brokenContract=contracts.registry.register("broken",{version:"1.0.0",dependencies:[],capabilities:["repair"]});
  health.health.report({module:"broken",status:"FAULT",severity:"HIGH",timestamp:Date.now()});
  const failed=await recovery.recovery.recover({module:"broken"});
  return{ok: lifecycle.ok&&contracts.ok&&reg.ok&&health.ok&&diagnostics.ok&&recovery.ok&&handler.ok&&recovered.ok&&recovered.status==="RECOVERED"&&brokenContract.ok&&failed.ok===false&&failed.requiresManualIntervention===true,stage:"15.30",recovered,failed};
}
// Backward-compatible alias for established recovery workflow commands.
export const runX4KissModuleRecoverySelfCheck = runX4KissModuleRecoverySelfCheck;
