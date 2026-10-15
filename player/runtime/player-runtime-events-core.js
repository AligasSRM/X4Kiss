import { validateX4KissPlayerRuntimeEventsRequest } from "./player-runtime-events-rules.js";

export const X4KISS_PLAYER_RUNTIME_EVENTS_CORE = {
  section: "15.18",
  name: "X4Kiss Player Runtime Events Core",
  version: "1.0.0",
  status: "connected",
  failClosed: true
};

const events = [];

export function recordX4KissPlayerRuntimeEvent(type, detail = {}) {
  if (!type) return { ok: false, reason: "event_type_missing" };
  const event = { type, timestamp: Date.now(), detail: { ...detail } };
  events.push(event);
  if (events.length > 100) events.shift();
  return { ok: true, event };
}

export function readX4KissPlayerRuntimeEvents() {
  return events.map(event => ({ ...event, detail: { ...event.detail } }));
}

export function evaluateX4KissPlayerRuntimeEvents(request = {}) {
  const validation = validateX4KissPlayerRuntimeEventsRequest(request);
  return { allowed: validation.allowed === true, gates: validation.gates };
}
