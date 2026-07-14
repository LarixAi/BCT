import type { OutboxMutation, OutboxMutationStatus, OutboxMutationType } from "@/types/sync";

export const OUTBOX_MUTATION_LABELS: Record<OutboxMutationType, string> = {
  "duty.acknowledge": "Duty acknowledgement",
  "duty.clock_in": "Duty clock-in",
  "duty.start": "Duty start (legacy)",
  "duty.complete": "Duty completion",
  "vehicle.verify": "Vehicle verification",
  "vehicle.check.submit": "Walkaround check submission",
  "vehicle.handback": "Vehicle handback",
  "journey.start": "Journey start",
  "journey.complete": "Journey completion",
  "journey.break.start": "Break started",
  "journey.break.end": "Break ended",
  "journey.note.add": "Journey note",
  "delay.report": "Delay report",
  "stop.arrive": "Stop arrival",
  "passenger.outcome": "Passenger boarding outcome",
  "incident.report": "Incident report",
  "defect.report": "Defect report",
};

export function outboxMutationLabel(type: OutboxMutationType): string {
  return OUTBOX_MUTATION_LABELS[type] ?? type;
}

export function outboxStatusLabel(status: OutboxMutationStatus): string {
  const labels: Record<OutboxMutationStatus, string> = {
    pending: "Waiting to sync",
    syncing: "Syncing now",
    synced: "Up to date",
    failed: "Needs retry",
    conflict: "Assignment conflict — review before continuing",
  };
  return labels[status];
}

export function outboxStatusTone(
  status: OutboxMutationStatus,
): "ok" | "warn" | "vor" | "muted" | "link" {
  switch (status) {
    case "synced":
      return "ok";
    case "pending":
    case "syncing":
      return "link";
    case "failed":
    case "conflict":
      return "vor";
    default:
      return "muted";
  }
}

export function formatQueueTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function summariseQueue(mutations: OutboxMutation[]) {
  const active = mutations.filter((item) => item.status !== "synced");
  return {
    pending: active.filter((item) => item.status === "pending" || item.status === "syncing").length,
    failed: active.filter((item) => item.status === "failed" || item.status === "conflict").length,
    total: active.length,
  };
}

export function groupQueueItems(mutations: OutboxMutation[]) {
  const active = mutations
    .filter((item) => item.status !== "synced")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const failed = active.filter((item) => item.status === "failed" || item.status === "conflict");
  const pending = active.filter((item) => item.status === "pending" || item.status === "syncing");

  return { failed, pending, empty: active.length === 0 };
}
