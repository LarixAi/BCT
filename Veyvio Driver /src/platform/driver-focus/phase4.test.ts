import { describe, expect, it } from "vitest";
import { deriveSpeedKmh, isSafeDrivingAction } from "@/domain/safety/vehicle-motion";
import { assessDeviceReadiness } from "@/platform/driver-focus/device-readiness";
import { DEFAULT_DRIVER_FOCUS_PERMISSIONS } from "@/types/active-trip";

describe("deriveSpeedKmh", () => {
  it("uses reported GPS speed when available", () => {
    expect(
      deriveSpeedKmh({
        current: {
          latitude: 51.5,
          longitude: -0.1,
          recordedAt: new Date().toISOString(),
        },
        reportedSpeedMps: 10,
      }),
    ).toBe(36);
  });
});

describe("isSafeDrivingAction", () => {
  it("allows hear instruction while moving", () => {
    expect(isSafeDrivingAction("hear_instruction", true)).toBe(true);
  });

  it("blocks typing while moving", () => {
    expect(isSafeDrivingAction("type_message", true)).toBe(false);
  });
});

describe("assessDeviceReadiness", () => {
  it("blocks release when notifications are denied", () => {
    const report = assessDeviceReadiness({
      capabilities: {
        keepAwakeSupported: true,
        androidPipSupported: false,
        iosLiveActivitySupported: false,
        backgroundLocationSupported: true,
        notificationsEnabled: true,
      },
      permissions: {
        ...DEFAULT_DRIVER_FOCUS_PERMISSIONS,
        notificationsGranted: false,
      },
      focusModeEnabled: true,
    });

    expect(report.readyForRelease).toBe(false);
    expect(report.blockers).toContain("Notifications");
  });
});
