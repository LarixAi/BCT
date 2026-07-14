import { registerPlugin } from "@capacitor/core";
import type { TripOverlayPayload } from "@/platform/driver-focus/adapters/stub-adapters";

export interface LiveActivityPayload {
  dutyId: string;
  tripStateLabel: string;
  nextStopLabel: string;
  etaLabel: string;
  distanceLabel: string;
  passengerProgressLabel: string;
  accessibilityIndicator?: string;
}

export interface TripOverlayPlugin {
  isPictureInPictureSupported(): Promise<{ supported: boolean }>;
  enterPictureInPicture(): Promise<void>;
  exitPictureInPicture(): Promise<void>;
  isInPictureInPicture(): Promise<{ active: boolean }>;
  updateLiveActivity(options: LiveActivityPayload): Promise<{ supported: boolean }>;
  endLiveActivity(): Promise<void>;
}

export const TripOverlayNative = registerPlugin<TripOverlayPlugin>("TripOverlay", {
  web: () => import("./trip-overlay-plugin.web").then((m) => new m.TripOverlayWeb()),
});

export function toLiveActivityPayload(payload: TripOverlayPayload): LiveActivityPayload {
  return {
    dutyId: payload.dutyId,
    tripStateLabel: payload.tripStateLabel,
    nextStopLabel: payload.nextStopLabel,
    etaLabel: payload.etaLabel,
    distanceLabel: payload.distanceLabel,
    passengerProgressLabel: payload.passengerProgressLabel,
    accessibilityIndicator: payload.accessibilityIndicator,
  };
}

export function tripNavDeepLink(dutyId: string): string {
  return `veyvio-driver://duties/${dutyId}/nav`;
}
