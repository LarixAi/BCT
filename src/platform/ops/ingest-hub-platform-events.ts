import type { PlatformEvent } from "@veyvio/ops";
import { queuePlatformEventForConsumers } from "@veyvio/ops";

export type HubPlatformEventPayload = {
  eventId: string;
  eventType: string;
  occurredAt: string;
  tenantId: string;
  depotId: string;
  actorId: string;
  correlationId: string;
  aggregateId: string;
  aggregateVersion: number;
  payload: unknown;
  consumers?: string[];
};

const SEEN_HUB_EVENTS_KEY = "veyvio.yard.hub.platform-events.seen.v1";

function readSeen(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_HUB_EVENTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SEEN_HUB_EVENTS_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    /* ignore */
  }
}

function toPlatformEvent(row: HubPlatformEventPayload): PlatformEvent {
  return {
    eventId: row.eventId,
    eventType: row.eventType as PlatformEvent["eventType"],
    occurredAt: row.occurredAt,
    tenantId: row.tenantId,
    depotId: row.depotId,
    actorId: row.actorId,
    correlationId: row.correlationId,
    aggregateId: row.aggregateId,
    aggregateVersion: row.aggregateVersion,
    payload: row.payload,
    consumers: (row.consumers ?? ["yard"]) as PlatformEvent["consumers"],
  };
}

/** Queue new hub platform events (e.g. vehicle.returned from driver parking). */
export function ingestHubPlatformEvents(events: HubPlatformEventPayload[] | undefined): number {
  if (!events?.length) return 0;
  const seen = readSeen();
  let added = 0;
  for (const row of events) {
    if (!row?.eventId || seen.has(row.eventId)) continue;
    queuePlatformEventForConsumers(toPlatformEvent(row));
    seen.add(row.eventId);
    added += 1;
  }
  if (added > 0) writeSeen(seen);
  return added;
}
