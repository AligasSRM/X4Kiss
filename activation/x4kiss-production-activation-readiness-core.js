import {X4KISS_SECTION_19_EXTERNAL_DEPENDENCIES} from "./x4kiss-section-19-external-dependencies.js";
import {validateSection19Lock} from "./x4kiss-section-19-lock.js";

const REQUIRED_SECTIONS=Object.freeze(["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18"]);

export function runProductionActivationReadiness(){
  const inventory=X4KISS_SECTION_19_EXTERNAL_DEPENDENCIES;
  const deps=inventory.dependencies;
  const externalVerified=inventory.externalProviderKeys.every(key=>deps[key]===true);
  const integrationEvidenceVerified=inventory.verifiedIntegrationKeys.every(key=>deps[key]===true);
  const lock=validateSection19Lock();
  return {
    ok:lock.ok===true&&integrationEvidenceVerified===true,
    section:"19",
    status:"GREEN_CLOSED",
    readiness:externalVerified?"EXTERNAL_VERIFIED":"EXTERNAL_VERIFICATION_REQUIRED",
    requiredSections:REQUIRED_SECTIONS,
    dependencies:deps,
    verifiedIntegrationKeys:inventory.verifiedIntegrationKeys,
    integrationEvidenceVerified,
    externalProviderKeys:inventory.externalProviderKeys,
    allExternalVerified:externalVerified,
    productionActivationAllowed:false,
    failClosed:true,
    activationDecision:"BLOCKED_UNTIL_EXTERNAL_VERIFICATION"
  };
}
