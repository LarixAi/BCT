import type { DriverFocusCapabilities } from "@/types/driver-focus";
import type { DriverFocusPermissions } from "@/types/active-trip";

export type ReadinessStatus = "ready" | "attention" | "blocked";

export interface DeviceReadinessCheck {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export interface DeviceReadinessReport {
  status: ReadinessStatus;
  checks: DeviceReadinessCheck[];
  checkedAt: string;
  readyForRelease: boolean;
  blockers: string[];
}

export function assessDeviceReadiness(input: {
  capabilities: DriverFocusCapabilities;
  permissions: DriverFocusPermissions;
  focusModeEnabled: boolean;
  batteryPercent?: number;
  isCharging?: boolean;
  appVersion?: string;
}): DeviceReadinessReport {
  const checks: DeviceReadinessCheck[] = [
    {
      id: "focus_mode",
      label: "Driver Focus Mode",
      status: input.focusModeEnabled ? "ready" : "attention",
      detail: input.focusModeEnabled ? "Enabled" : "Disabled — screen may lock during active work",
    },
    {
      id: "keep_awake",
      label: "Keep Awake",
      status: input.capabilities.keepAwakeSupported ? "ready" : "blocked",
      detail: input.capabilities.keepAwakeSupported ? "Supported" : "Not supported on this device",
    },
    {
      id: "notifications",
      label: "Notifications",
      status:
        input.permissions.notificationsGranted === false
          ? "blocked"
          : input.capabilities.notificationsEnabled
            ? "ready"
            : "attention",
      detail:
        input.permissions.notificationsGranted === false
          ? "Denied — trip updates may be missed in background"
          : input.capabilities.notificationsEnabled
            ? "Enabled"
            : "Not yet confirmed",
    },
    {
      id: "location",
      label: "Background location",
      status:
        input.permissions.locationGranted === false
          ? "blocked"
          : input.capabilities.backgroundLocationSupported
            ? "ready"
            : "attention",
      detail:
        input.permissions.locationGranted === false
          ? "Denied — active trip tracking unavailable"
          : input.capabilities.backgroundLocationSupported
            ? "Supported"
            : "Unavailable",
    },
    {
      id: "overlay",
      label: "Trip overlay",
      status:
        input.capabilities.androidPipSupported || input.capabilities.iosLiveActivitySupported
          ? "ready"
          : "attention",
      detail:
        input.capabilities.androidPipSupported
          ? "Android PiP available"
          : input.capabilities.iosLiveActivitySupported
            ? "iOS Live Activity available"
            : "Using notification fallback on this device",
    },
    {
      id: "battery",
      label: "Battery",
      status:
        input.batteryPercent != null && input.batteryPercent <= 10 && !input.isCharging
          ? "blocked"
          : input.batteryPercent != null && input.batteryPercent <= 20 && !input.isCharging
            ? "attention"
            : "ready",
      detail:
        input.batteryPercent != null
          ? `${input.batteryPercent}%${input.isCharging ? " · charging" : ""}`
          : "Unknown",
    },
  ];

  const blockers = checks.filter((check) => check.status === "blocked").map((check) => check.label);
  const hasAttention = checks.some((check) => check.status === "attention");

  return {
    status: blockers.length > 0 ? "blocked" : hasAttention ? "attention" : "ready",
    checks,
    checkedAt: new Date().toISOString(),
    readyForRelease: blockers.length === 0,
    blockers,
  };
}
