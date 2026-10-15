import {validateConsumerProductFoundation} from "./x4kiss-consumer-product-section-core.js";
import {validateConsumerModules} from "./x4kiss-consumer-product-modules.js";
import {runConsumerProductRegression} from "./x4kiss-consumer-product-regression.js";
import {validateSection17Lock} from "./x4kiss-section-17-lock.js";
import {validateSection17ExternalDependencies} from "./x4kiss-section-17-external-dependencies.js";
export function runConsumerProductIntegration(){const foundation=validateConsumerProductFoundation();const modules=validateConsumerModules();const regression=runConsumerProductRegression();const lock=validateSection17Lock();const external=validateSection17ExternalDependencies();return {ok:foundation.ok&&modules.ok&&regression.ok&&lock.ok&&external.ok,section:"17",status:"GREEN_CLOSED",locked:true,failClosed:true,productionActivationAllowed:false,externalActivationRequired:true,foundation,modules,regression,lock,external};}