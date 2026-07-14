/** Structured delay events — chat replies must not be the only record. */

export type DelayReason =
  | "traffic"
  | "passenger_not_ready"
  | "road_closure"
  | "vehicle_issue"
  | "weather"
  | "other";

export interface DelayEvent {
  id: string;
  dutyId: string;
  journeyId: string;
  stopId?: string;
  reason: DelayReason;
  expectedDelayMinutes: number;
  locationLabel?: string;
  assistanceRequired: boolean;
  reportedAt: string;
  reportedBy: string;
  chatMessageGenerated?: string;
}

export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  traffic: "Traffic",
  passenger_not_ready: "Passenger not ready",
  road_closure: "Road closure",
  vehicle_issue: "Vehicle issue",
  weather: "Weather",
  other: "Other",
};

export function createDelayEvent(input: {
  dutyId: string;
  journeyId: string;
  reason: DelayReason;
  expectedDelayMinutes: number;
  reportedBy: string;
  stopId?: string;
  locationLabel?: string;
  assistanceRequired?: boolean;
}): DelayEvent {
  const reasonLabel = DELAY_REASON_LABELS[input.reason];
  const chatMessageGenerated = `Running late — ${reasonLabel.toLowerCase()}, about ${input.expectedDelayMinutes} min.`;
  return {
    id: `delay_${crypto.randomUUID?.() ?? Date.now()}`,
    dutyId: input.dutyId,
    journeyId: input.journeyId,
    stopId: input.stopId,
    reason: input.reason,
    expectedDelayMinutes: input.expectedDelayMinutes,
    locationLabel: input.locationLabel,
    assistanceRequired: Boolean(input.assistanceRequired),
    reportedAt: new Date().toISOString(),
    reportedBy: input.reportedBy,
    chatMessageGenerated,
  };
}
