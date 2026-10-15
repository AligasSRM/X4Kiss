import{createX4KissModuleRecoveryGuard}from"./x4kiss-module-recovery-guard-core.js";
export function installX4KissModuleRecoveryGuard(core){try{const guard=createX4KissModuleRecoveryGuard(core);core.moduleRecoveryGuard=guard;const registration=core.registerModule?.("module-recovery-guard","active");return{ok:true,stage:"15.31",coreControlled:core.moduleRecoveryGuard===guard,recoveryGuard:guard,registration};}catch(error){return{ok:false,stage:"15.31",error:String(error?.message||error)};}}

