import type { PassengerTaskStatus } from "@/types/duty";

export const PICKUP_OUTCOMES: { value: PassengerTaskStatus; label: string; safeguarding?: boolean }[] = [
  { value: "boarded", label: "Boarded" },
  { value: "not_ready", label: "Passenger not ready" },
  { value: "no_show", label: "No-show" },
  { value: "cancelled", label: "Cancelled by operations" },
  { value: "refused", label: "Refused transport" },
  { value: "unwell", label: "Passenger unwell" },
  { value: "escalated", label: "Unsafe pickup — escalate", safeguarding: true },
];

export const DROPOFF_OUTCOMES: { value: PassengerTaskStatus; label: string; safeguarding?: boolean }[] = [
  { value: "handed_over", label: "Handed to authorised adult" },
  { value: "dropped_off", label: "Entered destination independently" },
  { value: "escalated", label: "Unsafe handover — escalate", safeguarding: true },
];

export function requiresSafeguardingEscalation(status: PassengerTaskStatus): boolean {
  return status === "escalated";
}

export function blocksUnsafeComplete(status: PassengerTaskStatus): boolean {
  return status === "escalated";
}
