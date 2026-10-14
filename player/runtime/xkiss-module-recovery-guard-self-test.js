import{installX4KissModuleRecoveryGuard}from"./xkiss-module-recovery-guard-integration.js";
export async function runX4KissModuleRecoveryGuardSelfCheck(){
const calls=[];
const core={moduleRecovery:{recover:async r=>{calls.push(r.module);return calls.length<4?{ok:false,status:"FAILED"}:{ok:true,status:"RECOVERED",module:r.module};}},registerModule(){return{ok:true}}};
const installed=installX4KissModuleRecoveryGuard(core),g=core.moduleRecoveryGuard;
const a=await g.recover({module:"loop-test"}),b=await g.recover({module:"loop-test"}),c=await g.recover({module:"loop-test"}),d=await g.recover({module:"loop-test"});
const exceptionCore={moduleRecovery:{recover:async()=>{throw new Error("simulated-recovery-exception");}},registerModule(){return{ok:true}}};
const exceptionGuard=installX4KissModuleRecoveryGuard(exceptionCore).recoveryGuard;
const exceptionResult=await exceptionGuard.recover({module:"exception-test"});
const checks={
installed:installed.ok&&installed.coreControlled===true,
firstThreeAttempted:c.status==="FAILED"&&calls.length===3,
blocked:d.status==="LOCKED"&&calls.length===3,
status:g.getStatus().guardReady===true,
exceptionFailsClosed:exceptionResult?.ok===false&&exceptionResult?.status==="FAILED"&&exceptionGuard.getEvents().some(e=>e.type==="recovery-failed")
};
return{ok:Object.values(checks).every(Boolean),stage:"15.31",checks,status:g.getStatus()};
}
