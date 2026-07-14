import { describe, expect, it } from "vitest";
import { shouldKeepScreenAwake, shouldShowTripNotification } from "@/platform/driver-focus/focus-controls";
import type { DriverFocusContext } from "@/types/driver-focus";
import { DEFAULT_DRIVER_FOCUS_SETTINGS } from "@/types/driver-focus";

function baseContext(overrides: Partial<DriverFocusContext> = {}): DriverFocusContext {
  return {
    settings: DEFAULT_DRIVER_FOCUS_SETTINGS,
    workflow: "navigation",
    appForeground: true,
    pathname: "/duties/duty_1/nav",
    activeDutyId: "duty_1",
    dutyLifecycleStatus: "in_progress",
    runStatus: "active",
    vehicleCheckInProgress: false,
    navigationOpen: true,
    dutyPaused: false,
    tripCompleted: false,
    runCompleted: false,
    isAuthenticated: true,
    platform: "web",
    tripPresentation: null,
    ...overrides,
  };
}

describe("shouldKeepScreenAwake", () => {
  it("enables during active navigation in foreground", () => {
    expect(shouldKeepScreenAwake(baseContext())).toBe(true);
  });

  it("disables when focus mode is off", () => {
    expect(
      shouldKeepScreenAwake(
        baseContext({
          settings: { ...DEFAULT_DRIVER_FOCUS_SETTINGS, enabled: false },
        }),
      ),
    ).toBe(false);
  });

  it("disables when app is in background", () => {
    expect(shouldKeepScreenAwake(baseContext({ appForeground: false }))).toBe(false);
  });

  it("disables when duty is paused", () => {
    expect(
      shouldKeepScreenAwake(
        baseContext({ workflow: "duty_paused", dutyPaused: true }),
      ),
    ).toBe(false);
  });

  it("disables when trip is completed", () => {
    expect(
      shouldKeepScreenAwake(
        baseContext({ tripCompleted: true, workflow: "idle" }),
      ),
    ).toBe(false);
  });

  it("enables during vehicle check", () => {
    expect(
      shouldKeepScreenAwake(
        baseContext({
          workflow: "vehicle_check",
          vehicleCheckInProgress: true,
          navigationOpen: false,
          pathname: "/checks/walkaround",
        }),
      ),
    ).toBe(true);
  });

  it("shows trip notification in background during navigation", () => {
    expect(
      shouldShowTripNotification(
        baseContext({ appForeground: false, workflow: "navigation", navigationOpen: true }),
      ),
    ).toBe(true);
    expect(shouldShowTripNotification(baseContext({ appForeground: true }))).toBe(false);
  });
});
