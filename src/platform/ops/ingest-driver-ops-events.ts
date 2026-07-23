import { drainPlatformEventsForYard, type PlatformEvent } from "@veyvio/ops";
import type { OperationalDayPlan } from "@/types/plan";

const YARD_NOTICE_KEY = "veyvio.yard.driver.ops.notices.v1";

export type YardDriverOpsNotice = {
  id: string;
  eventType: string;
  vehicleId: string;
  summary: string;
  receivedAt: string;
  payload: unknown;
};

function readNotices(): YardDriverOpsNotice[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(YARD_NOTICE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as YardDriverOpsNotice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotices(items: YardDriverOpsNotice[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(YARD_NOTICE_KEY, JSON.stringify(items.slice(0, 100)));
  } catch {
    /* ignore */
  }
}

function noticeFromEvent(event: PlatformEvent): YardDriverOpsNotice | null {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const vehicleId = String(payload.vehicleId ?? event.aggregateId);
  if (
    event.eventType !== "defect.reported" &&
    event.eventType !== "journey.started" &&
    event.eventType !== "vehicle.returned" &&
    event.eventType !== "vehicle_check.submitted" &&
    event.eventType !== "vehicle_swap.requested" &&
    event.eventType !== "vehicle.held" &&
    event.eventType !== "plan.published"
  ) {
    return null;
  }
  const summary: Record<string, string> = {
    "defect.reported": "Driver defect — review vehicle readiness",
    "journey.started": "Vehicle departed for service — bay released",
    "vehicle.returned": "Driver handed vehicle back — confirm bay custody",
    "vehicle_check.submitted": "Driver walkaround submitted",
    "vehicle_swap.requested": "Driver requested vehicle swap",
    "vehicle.held": "Vehicle held after driver defect",
    "plan.published": "Next-day operational plan published — review staging order",
  };
  return {
    id: event.eventId,
    eventType: event.eventType,
    vehicleId,
    summary: summary[event.eventType] ?? event.eventType,
    receivedAt: event.occurredAt,
    payload: event.payload,
  };
}

/** Drain Driver/Admin platform events into Yard operational notices. */
export function ingestDriverOpsEventsForYard(): YardDriverOpsNotice[] {
  const events = drainPlatformEventsForYard();
  const existing = readNotices();
  const added: YardDriverOpsNotice[] = [];
  for (const event of events) {
    const notice = noticeFromEvent(event);
    if (!notice) continue;
    if (existing.some((n) => n.id === notice.id)) continue;
    added.push(notice);
  }
  if (added.length > 0) {
    writeNotices([...added, ...existing]);
  }
  return added;
}

export function listYardDriverOpsNotices(): YardDriverOpsNotice[] {
  return readNotices();
}

export function planFromNoticePayload(payload: unknown): OperationalDayPlan | null {
  if (!payload || typeof payload !== "object") return null;
  const plan = payload as Partial<OperationalDayPlan>;
  if (!plan.id || !plan.operationalDate || !Array.isArray(plan.staging)) return null;
  return plan as OperationalDayPlan;
}
