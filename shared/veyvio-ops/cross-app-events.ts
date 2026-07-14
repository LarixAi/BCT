import type { PlatformEvent } from "./events";

const STORAGE_KEY = "veyvio.ops.platform.events.v1";
const YARD_STORAGE_KEY = "veyvio.ops.platform.events.yard.v1";

/** In-process queues — shared within one JS runtime (tests / same-bundle demos). */
const memoryQueue: PlatformEvent[] = [];
const memoryYardQueue: PlatformEvent[] = [];

function readStorage(key: string): PlatformEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlatformEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(key: string, items: PlatformEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (items.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Driver outbound: queue a platform event for Admin and Yard (separate durable copies). */
export function queuePlatformEventForConsumers(event: PlatformEvent): void {
  memoryQueue.push(event);
  memoryYardQueue.push(event);

  const existing = readStorage(STORAGE_KEY);
  writeStorage(STORAGE_KEY, [...existing.filter((e) => e.eventId !== event.eventId), event]);

  const yardExisting = readStorage(YARD_STORAGE_KEY);
  writeStorage(YARD_STORAGE_KEY, [
    ...yardExisting.filter((e) => e.eventId !== event.eventId),
    event,
  ]);
}

/** Admin inbound: drain shared queue (memory + Admin storage). */
export function drainPlatformEventsForConsumers(): PlatformEvent[] {
  const fromMemory = memoryQueue.splice(0, memoryQueue.length);
  const fromStorage = readStorage(STORAGE_KEY);
  writeStorage(STORAGE_KEY, []);

  const byId = new Map<string, PlatformEvent>();
  for (const item of [...fromStorage, ...fromMemory]) {
    byId.set(item.eventId, item);
  }
  return [...byId.values()];
}

/** Yard inbound: drain Yard-specific copy (survives Admin drain). */
export function drainPlatformEventsForYard(): PlatformEvent[] {
  const fromMemory = memoryYardQueue.splice(0, memoryYardQueue.length);
  const fromStorage = readStorage(YARD_STORAGE_KEY);
  writeStorage(YARD_STORAGE_KEY, []);

  const byId = new Map<string, PlatformEvent>();
  for (const item of [...fromStorage, ...fromMemory]) {
    byId.set(item.eventId, item);
  }
  return [...byId.values()];
}

export function peekPlatformEventIngestCount(): number {
  return memoryQueue.length + readStorage(STORAGE_KEY).length;
}

export function resetPlatformEventIngest(): void {
  memoryQueue.length = 0;
  memoryYardQueue.length = 0;
  writeStorage(STORAGE_KEY, []);
  writeStorage(YARD_STORAGE_KEY, []);
}
