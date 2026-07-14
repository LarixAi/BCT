import type { OperationalWorkflow } from "@/types/driver-focus";

export interface ActiveTripSnapshot {
  dutyId: string;
  workflow: OperationalWorkflow;
  tripStateLabel: string;
  nextStopStreet: string;
  etaLabel: string;
  distanceLabel: string;
  passengerProgressLabel: string;
  accessibilityIndicator?: string;
  hasNewInstruction: boolean;
  latitude?: number;
  longitude?: number;
  dutyLifecycleStatus: string;
  recordedAt: string;
}

export interface DriverFocusPermissions {
  keepAwakePromptSeen: boolean;
  overlayPromptSeen: boolean;
  backgroundLocationPromptSeen: boolean;
  notificationsGranted: boolean | null;
  locationGranted: boolean | null;
}

export const DEFAULT_DRIVER_FOCUS_PERMISSIONS: DriverFocusPermissions = {
  keepAwakePromptSeen: false,
  overlayPromptSeen: false,
  backgroundLocationPromptSeen: false,
  notificationsGranted: null,
  locationGranted: null,
};
