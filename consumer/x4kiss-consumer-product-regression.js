import {validateConsumerProductFoundation} from "./x4kiss-consumer-product-section-core.js";
import {validateConsumerModules} from "./x4kiss-consumer-product-modules.js";
import {validatePlaylist} from "./x4kiss-playlists-core.js";
import {validateSubscription} from "./x4kiss-subscriptions-core.js";
import {validatePPV} from "./x4kiss-ppv-core.js";
import {validateTip} from "./x4kiss-tips-gifting-core.js";
import {validateMessage} from "./x4kiss-messaging-core.js";
import {validateNotification} from "./x4kiss-notifications-core.js";
import {validateRecommendationContext} from "./x4kiss-recommendations-core.js";
import {validateWatchEvent} from "./x4kiss-watch-history-core.js";
import {validateSavedItem} from "./x4kiss-saved-favorites-core.js";
import {validateInteraction} from "./x4kiss-viewer-creator-interactions-core.js";
import {validatePrivacyAction} from "./x4kiss-privacy-blocking-core.js";
import {validateDiscoveryQuery} from "./x4kiss-discovery-core.js";
const checks=[
()=>validatePlaylist({title:"Test"}).ok,()=>validateSubscription({creatorId:"creator"}).ok,
()=>validatePPV({contentId:"video"}).ok,()=>validateTip({creatorId:"creator",amount:1}).ok,
()=>validateMessage({recipientId:"user",body:"test"}).ok,()=>validateNotification({type:"creator"}).ok,
()=>validateRecommendationContext({history:[],preferences:[]}).ok,()=>validateWatchEvent({videoId:"video",position:0}).ok,
()=>validateSavedItem({videoId:"video"}).ok,()=>validateInteraction({creatorId:"creator",action:"follow"}).ok,
()=>validatePrivacyAction({targetId:"user"}).ok,()=>validateDiscoveryQuery({query:"video"}).ok];
export function runConsumerProductRegression(){const foundation=validateConsumerProductFoundation();const modules=validateConsumerModules();const results=checks.map(fn=>fn());return {ok:foundation.ok&&modules.ok&&results.every(Boolean),foundation,modules,checksPassed:results.filter(Boolean).length,checksTotal:results.length,failClosed:true,productionActivationAllowed:false};}