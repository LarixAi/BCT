/** Overlay + alert adapter types. Platform implementations live in sibling adapter files. */

export interface TripOverlayPayload {
  tripStateLabel: string;
  nextStopLabel: string;
  etaLabel: string;
  distanceLabel: string;
  passengerProgressLabel: string;
  accessibilityIndicator?: string;
  hasNewInstruction: boolean;
  dutyId: string;
}

export interface TripOverlayAdapter {
  readonly platform: "android" | "ios" | "web";
  readonly supported: boolean;
  prepare(): Promise<void>;
  show(payload: TripOverlayPayload): Promise<void>;
  hide(): Promise<void>;
}

export interface AudioAlertAdapter {
  readonly supported: boolean;
  playInstruction(text?: string): Promise<void>;
  playOperationalAlert(text?: string): Promise<void>;
}

export { createTripOverlayAdapter } from "./trip-overlay-adapter";
export { createBackgroundLocationAdapter } from "./background-location-adapter";
export { createTripNotificationAdapter } from "./trip-notification-adapter";
export { createAudioAlertAdapter } from "./audio-alert-adapter";
