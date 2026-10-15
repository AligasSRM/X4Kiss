export const X4KISS_MODULE_LIFECYCLE_RULES = Object.freeze({
  stage: "15.24",
  name: "Module Lifecycle Control",
  coreControlled: true,
  allowedTransitions: Object.freeze({
    registered: ["initialized", "destroyed"],
    initialized: ["active", "destroyed"],
    active: ["inactive"],
    inactive: ["active", "destroyed"],
    destroyed: []
  }),
  failClosed: true
});

export function validateX4KissModuleLifecycleRules() {
  const transitions = X4KISS_MODULE_LIFECYCLE_RULES.allowedTransitions;
  const ok =
    transitions.registered.includes("initialized") &&
    transitions.initialized.includes("active") &&
    transitions.active.includes("inactive") &&
    transitions.inactive.includes("active") &&
    transitions.destroyed.length === 0 &&
    X4KISS_MODULE_LIFECYCLE_RULES.coreControlled === true &&
    X4KISS_MODULE_LIFECYCLE_RULES.failClosed === true;

  return {
    ok,
    stage: X4KISS_MODULE_LIFECYCLE_RULES.stage,
    coreControlled: X4KISS_MODULE_LIFECYCLE_RULES.coreControlled,
    failClosed: X4KISS_MODULE_LIFECYCLE_RULES.failClosed
  };
}

