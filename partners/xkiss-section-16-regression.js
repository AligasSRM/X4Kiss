import {validatePartnerAccount} from "./x4kiss-partner-accounts-core.js";
import {validateOrganizationVerification} from "./x4kiss-organization-verification-core.js";
import {validateRightsRecord} from "./x4kiss-rights-consent-core.js";
import {validateIngestionRequest} from "./x4kiss-enterprise-ingestion-core.js";
import {validateMediaProcessingStatus} from "./x4kiss-media-processing-delivery-core.js";
import {validateContentDecision} from "./x4kiss-moderation-copyright-takedown-core.js";
import {evaluateGeoPolicy} from "./x4kiss-distribution-geo-policy-core.js";
import {createEnterpriseAuditEvent} from "./x4kiss-enterprise-analytics-audit-core.js";
import {validateSettlementInstruction} from "./x4kiss-contract-revenue-settlement-core.js";
import {validateApiCredential} from "./x4kiss-partner-api-security-core.js";
export function runSection16Regression(){
  const checks=[
    validatePartnerAccount({organizationId:"org",legalName:"Company",accountType:"company",country:"SY",contactEmail:"x@example.invalid"}).ok,
    validateOrganizationVerification({status:"PENDING"}).ok,
    validateRightsRecord({rightsBasis:"LICENSED",consentRecorded:true}).ok,
    validateIngestionRequest({source:"api",metadata:{}}).ok,
    validateMediaProcessingStatus({status:"QUEUED",delivery:"UNAVAILABLE"}).ok,
    validateContentDecision({state:"REVIEW_REQUIRED"}).ok,
    evaluateGeoPolicy({country:"SY"}).allowed===true,
    createEnterpriseAuditEvent({action:"partner.created",actorId:"system"}).ok,
    validateSettlementInstruction({contractId:"contract",amount:0}).ok,
    validateApiCredential({scopes:["partner.read"],issuedByBackend:true}).ok
  ];
  return {ok:checks.every(Boolean),checksPassed:checks.filter(Boolean).length,checksTotal:checks.length,failClosed:true,productionActivationAllowed:false};
}