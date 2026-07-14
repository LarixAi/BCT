import type { ReportIncidentHubInput } from "./admin-bridge";

const STORAGE_KEY = "veyvio.driver.incident.ingest.v1";

/** In-process queue — shared within one JS runtime (tests / same-bundle demos). */
const memoryQueue: ReportIncidentHubInput[] = [];

function readStorage(): ReportIncidentHubInput[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReportIncidentHubInput[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(items: ReportIncidentHubInput[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (items.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / private mode */
  }
}

function localId(input: ReportIncidentHubInput): string | undefined {
  return input.driverReportMetadata?.localIncidentId;
}

/** Driver outbound: queue a hub-shaped incident for Admin ingest. */
export function queueDriverIncidentForAdmin(input: ReportIncidentHubInput): void {
  memoryQueue.push(input);
  const existing = readStorage();
  const id = localId(input);
  const next = id
    ? [...existing.filter((item) => localId(item) !== id), input]
    : [...existing, input];
  writeStorage(next);
}

/** Admin inbound: drain queued driver reports (memory + localStorage). */
export function drainDriverIncidentsForAdmin(): ReportIncidentHubInput[] {
  const fromMemory = memoryQueue.splice(0, memoryQueue.length);
  const fromStorage = readStorage();
  writeStorage([]);

  const byId = new Map<string, ReportIncidentHubInput>();
  const withoutId: ReportIncidentHubInput[] = [];

  for (const item of [...fromStorage, ...fromMemory]) {
    const id = localId(item);
    if (id) byId.set(id, item);
    else withoutId.push(item);
  }

  return [...byId.values(), ...withoutId];
}

export function peekDriverIncidentIngestCount(): number {
  return memoryQueue.length + readStorage().length;
}

export function resetDriverIncidentIngest(): void {
  memoryQueue.length = 0;
  writeStorage([]);
}
