import {createX4KissModuleRecovery} from "./x4kiss-module-recovery-core.js";
export function installX4KissModuleRecovery(core){
  if(!core)return{ok:false,error:"player-core-required",stage:"15.30"};
  if(!core.moduleHealth||!core.moduleDiagnostics||!core.moduleLifecycle||!core.moduleContracts)return{ok:false,error:"recovery-prerequisite-missing",stage:"15.30"};
  if(core.moduleRecovery)return{ok:true,stage:"15.30",coreControlled:true,reused:true,recovery:core.moduleRecovery};
  try{const recovery=createX4KissModuleRecovery(core);core.moduleRecovery=recovery;core.registerModule("module-recovery","active");return{ok:true,stage:"15.30",coreControlled:core.moduleRecovery===recovery,recovery};}
  catch(error){return{ok:false,error:String(error?.message||error),stage:"15.30"};}
}
// Backward-compatible alias for existing recovery workflows.
export const installX4KissModuleRecovery = installX4KissModuleRecovery;
