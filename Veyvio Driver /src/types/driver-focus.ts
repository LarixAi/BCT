import type { TripOverlayPayload } from "@/platform/driver-focus/adapters/stub-adapters";

export type DriverFocusPhase =
  | "off"
  | "preparing"
  | "active"
  | "background"
  | "paused"
  | "completing";

export type DriverFocusEvent =
  | "DRIVER_DUTY_STARTED"
  | "VEHICLE_CHECK_STARTED"
  | "VEHICLE_CHECK_COMPLETED"
  | "TRIP_ACCEPTED"
  | "NAVIGATION_STARTED"
  | "NAVIGATION_ENDED"
  | "APP_ENTERED_FOREGROUND"
  | "APP_ENTERED_BACKGROUND"
  | "DRIVER_ARRIVED"
  | "PASSENGER_BOARDED"
  | "TRIP_COMPLETED"
  | "RUN_COMPLETED"
  | "DUTY_PAUSED"
  | "DUTY_RESUMED"
  | "DUTY_ENDED"
  | "DRIVER_LOGGED_OUT"
  | "FOCUS_MODE_MANUALLY_DISABLED"
  | "FOCUS_MODE_MANUALLY_ENABLED"
  | "FATAL_ERROR";

export type OperationalWorkflow =
  | "idle"
  | "vehicle_check"
  | "active_run"
  | "en_route_pickup"
  | "at_pickup"
  | "passenger_boarding"
  | "en_route_dropoff"
  | "passenger_dropoff"
  | "navigation"
  | "incident"
  | "duty_paused";

export type DriverFocusAuditEvent =
  | "DRIVER_FOCUS_ENABLED"
  | "DRIVER_FOCUS_DISABLED"
  | "KEEP_AWAKE_ENABLED"
  | "KEEP_AWAKE_DISABLED"
  | "KEEP_AWAKE_FAILED"
  | "OVERLAY_PERMISSION_GRANTED"
  | "OVERLAY_PERMISSION_REVOKED"
  | "BACKGROUND_LOCATION_STARTED"
  | "BACKGROUND_LOCATION_STOPPED"
  | "FOCUS_MODE_FAILED";

export interface DriverFocusSettings {
  /** Master switch for Driver Focus Mode. */
  enabled: boolean;
  keepScreenAwakeDuringActiveWork: boolean;
  automaticallyShowTripOverlay: boolean;
  openOverlayWhenLeavingVeyvio: boolean;
  reduceBrightnessWhenStationary: boolean;
  audioAlerts: boolean;
  vibrationAlerts: boolean;
}

export const DEFAULT_DRIVER_FOCUS_SETTINGS: DriverFocusSettings = {
  enabled: true,
  keepScreenAwakeDuringActiveWork: true,
  automaticallyShowTripOverlay: true,
  openOverlayWhenLeavingVeyvio: true,
  reduceBrightnessWhenStationary: true,
  audioAlerts: true,
  vibrationAlerts: true,
};

export interface DriverFocusCapabilities {
  keepAwakeSupported: boolean;
  androidPipSupported: boolean;
  iosLiveActivitySupported: boolean;
  backgroundLocationSupported: boolean;
  notificationsEnabled: boolean;
}

export interface DriverFocusRuntimeState {
  phase: DriverFocusPhase;
  workflow: OperationalWorkflow;
  keepScreenAwake: boolean;
  showTripOverlay: boolean;
  trackLocationInBackground: boolean;
  playOperationalAlerts: boolean;
  vehicleMoving: boolean;
  speedKmh: number | null;
  lastError?: string;
  batteryPercent?: number;
  isCharging?: boolean;
}

export interface DriverFocusContext {
  settings: DriverFocusSettings;
  workflow: OperationalWorkflow;
  appForeground: boolean;
  pathname: string;
  activeDutyId: string | null;
  dutyLifecycleStatus: string | null;
  runStatus: string | null;
  vehicleCheckInProgress: boolean;
  navigationOpen: boolean;
  dutyPaused: boolean;
  tripCompleted: boolean;
  runCompleted: boolean;
  isAuthenticated: boolean;
  platform: "web" | "ios" | "android";
  tripPresentation: TripOverlayPayload | null;
}
