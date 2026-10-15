import { evaluateProductionPolicyConfiguration } from "./xkiss-production-policy-contract.js";

const validConfig = {
  monetization: {
    creatorSharePercent: 80,
    platformSharePercent: 20,
    providerFeePolicy: "deduct_before_share"
  },
  viewsRevenue: {
    minimumWatchSeconds: 30,
    minimumWatchPercent: 20
  },
  walletPayout: {
    minimumPayoutAmount: 50,
    payoutProvider: "provider-configured"
  }
};

export function runXKissProductionPolicyContractSelfTest() {
  const blocked = evaluateProductionPolicyConfiguration({});
  const ready = evaluateProductionPolicyConfiguration(validConfig);

  const invalidCases = [
    {
      name: "sharesDoNotTotal100",
      config: { ...validConfig, monetization: { ...validConfig.monetization, platformSharePercent: 19 } }
    },
    {
      name: "shareAbove100",
      config: { ...validConfig, monetization: { ...validConfig.monetization, creatorSharePercent: 101, platformSharePercent: 0 } }
    },
    {
      name: "nullCreatorShareRejected",
      config: { ...validConfig, monetization: { ...validConfig.monetization, creatorSharePercent: null, platformSharePercent: 100 } }
    },
    {
      name: "emptyShareRejected",
      config: { ...validConfig, monetization: { ...validConfig.monetization, creatorSharePercent: "", platformSharePercent: 100 } }
    },
    {
      name: "blankFeePolicyRejected",
      config: { ...validConfig, monetization: { ...validConfig.monetization, providerFeePolicy: "  " } }
    },
    {
      name: "nullWatchSecondsRejected",
      config: { ...validConfig, viewsRevenue: { ...validConfig.viewsRevenue, minimumWatchSeconds: null } }
    },
    {
      name: "emptyWatchPercentRejected",
      config: { ...validConfig, viewsRevenue: { ...validConfig.viewsRevenue, minimumWatchPercent: "" } }
    },
    {
      name: "watchPercentAbove100Rejected",
      config: { ...validConfig, viewsRevenue: { ...validConfig.viewsRevenue, minimumWatchPercent: 101 } }
    },
    {
      name: "negativeWatchSecondsRejected",
      config: { ...validConfig, viewsRevenue: { ...validConfig.viewsRevenue, minimumWatchSeconds: -1 } }
    },
    {
      name: "zeroPayoutRejected",
      config: { ...validConfig, walletPayout: { ...validConfig.walletPayout, minimumPayoutAmount: 0 } }
    },
    {
      name: "nullPayoutRejected",
      config: { ...validConfig, walletPayout: { ...validConfig.walletPayout, minimumPayoutAmount: null } }
    },
    {
      name: "blankPayoutProviderRejected",
      config: { ...validConfig, walletPayout: { ...validConfig.walletPayout, payoutProvider: " " } }
    }
  ].map(({ name, config }) => ({ name, result: evaluateProductionPolicyConfiguration(config) }));

  const cases = {
    emptyConfigurationBlocksAllPolicies:
      blocked.status === "BLOCKED" &&
      blocked.missingPolicies.length === 3 &&
      blocked.activationAllowed === false &&
      blocked.failClosed === true,
    completeConfigurationReadyForPolicyIntegrationOnly:
      ready.status === "READY_FOR_POLICY_INTEGRATION" &&
      ready.missingPolicies.length === 0 &&
      ready.activationAllowed === false &&
      ready.failClosed === true,
    invalidPolicyConfigurationsAreBlocked:
      invalidCases.every(({ result }) =>
        result.status === "BLOCKED" &&
        result.activationAllowed === false &&
        result.failClosed === true
      ),
    invalidCasesAreIndividuallyDiagnosable:
      invalidCases.every(({ result }) => result.missingPolicies.length > 0),
    activationAlwaysDisabled:
      blocked.activationAllowed === false &&
      ready.activationAllowed === false &&
      invalidCases.every(({ result }) => result.activationAllowed === false)
  };

  return {
    ok: Object.values(cases).every(Boolean),
    cases,
    counts: { invalidPolicyCases: invalidCases.length }
  };
}
