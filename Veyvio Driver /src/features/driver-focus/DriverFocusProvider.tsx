import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { buildDriverFocusContext } from "@/platform/driver-focus/operational-workflow";
import { buildTripOverlayPayload } from "@/platform/driver-focus/build-trip-presentation";
import { driverFocusCoordinator } from "@/platform/driver-focus/driver-focus-coordinator";
import { recoverActiveTripFromSnapshot } from "@/platform/driver-focus/trip-recovery";
import type { DriverFocusRuntimeState } from "@/types/driver-focus";
import { formatNavDistance, formatNavDuration } from "@/domain/journey/turn-by-turn-types";
import { useDriverStore } from "@/store/driver";
import { useDriverFocusStore } from "@/store/driver-focus";
import { useNavigationRoute } from "@/store/navigation";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { useSessionStore } from "@/platform/auth/session-store";

function detectPlatform(): "web" | "ios" | "android" {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "web";
}

export function DriverFocusProvider() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const settings = useDriverFocusStore((state) => state.settings);
  const setRecoverySnapshot = useDriverFocusStore((state) => state.setRecoverySnapshot);
  const activeDutyId = useDriverStore((state) => state.activeDutyId);
  const duty = useDriverStore((state) =>
    state.activeDutyId ? state.getDuty(state.activeDutyId) : null,
  );
  const homeOperationalState = useDriverStore((state) => state.homeSummary.operationalState);
  const navRoute = useNavigationRoute(activeDutyId ?? "");
  const vehicleCheckInProgress = useVehicleCheckStore(
    (state) =>
      Boolean(state.activeSession) ||
      state.checksHome.vehicle.gateStatus === "check_in_progress" ||
      duty?.vehicleCheck.status === "in_progress",
  );
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated());
  const [appForeground, setAppForeground] = useState(true);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || recovered) return;
    void recoverActiveTripFromSnapshot().then((result) => {
      setRecovered(true);
      if (result.snapshot) setRecoverySnapshot(result.snapshot);
    });
  }, [isAuthenticated, recovered, setRecoverySnapshot]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      const onVisibility = () => setAppForeground(document.visibilityState === "visible");
      document.addEventListener("visibilitychange", onVisibility);
      onVisibility();
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }

    const sub = App.addListener("appStateChange", ({ isActive }) => {
      setAppForeground(isActive);
    });
    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, []);

  useEffect(() => {
    if (!("getBattery" in navigator)) return;
    const readBattery = async () => {
      try {
        const battery = await (
          navigator as Navigator & {
            getBattery?: () => Promise<{ level: number; charging: boolean }>;
          }
        ).getBattery?.();
        if (!battery) return;
        driverFocusCoordinator.setBatteryState(
          Math.round(battery.level * 100),
          battery.charging,
        );
      } catch {
        // Battery API unavailable — non-blocking.
      }
    };
    void readBattery();
    const interval = window.setInterval(() => void readBattery(), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const dutyPaused =
    homeOperationalState === "on_break" ||
    duty?.runs.some((run) => run.status === "paused") === true;

  const tripPresentation = useMemo(() => {
    if (!duty || !activeDutyId) return null;
    if (duty.lifecycleStatus !== "in_progress") return null;

    const ctx = buildDriverFocusContext({
      settings,
      appForeground,
      pathname,
      activeDutyId,
      duty,
      vehicleCheckInProgress,
      dutyPaused,
      isAuthenticated,
      platform: detectPlatform(),
      tripPresentation: null,
    });

    return buildTripOverlayPayload({
      duty,
      dutyId: activeDutyId,
      workflow: ctx.workflow,
      dutyPaused,
      etaLabel: navRoute ? formatNavDuration(navRoute.totalDurationS) : undefined,
      distanceLabel: navRoute ? formatNavDistance(navRoute.totalDistanceM) : undefined,
    });
  }, [
    duty,
    activeDutyId,
    settings,
    appForeground,
    pathname,
    vehicleCheckInProgress,
    dutyPaused,
    isAuthenticated,
    navRoute,
  ]);

  useEffect(() => {
    const ctx = buildDriverFocusContext({
      settings,
      appForeground,
      pathname,
      activeDutyId,
      duty,
      vehicleCheckInProgress,
      dutyPaused,
      isAuthenticated,
      platform: detectPlatform(),
      tripPresentation,
    });

    void driverFocusCoordinator.evaluate(ctx);
  }, [
    settings,
    appForeground,
    pathname,
    activeDutyId,
    duty,
    vehicleCheckInProgress,
    dutyPaused,
    homeOperationalState,
    isAuthenticated,
    tripPresentation,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      void driverFocusCoordinator.shutdown("DRIVER_LOGGED_OUT");
    }
  }, [isAuthenticated]);

  return null;
}

export function useDriverFocusRuntime(): DriverFocusRuntimeState {
  const [runtime, setRuntime] = useState(driverFocusCoordinator.getRuntimeState());
  useEffect(() => driverFocusCoordinator.subscribe(setRuntime), []);
  return runtime;
}

export function ActiveTripRecoveryBanner() {
  const snapshot = useDriverFocusStore((state) => state.recoverySnapshot);
  const setRecoverySnapshot = useDriverFocusStore((state) => state.setRecoverySnapshot);

  if (!snapshot) return null;

  return (
    <div className="fixed inset-x-0 top-safe z-[55] mx-auto max-w-lg px-4 pt-2">
      <div className="rounded-xl border border-link/30 bg-card px-4 py-3 shadow-lg">
        <p className="text-sm font-bold">Active trip restored</p>
        <p className="mt-1 text-xs text-muted">
          {snapshot.tripStateLabel} · Next: {snapshot.nextStopStreet}
        </p>
        <div className="mt-3 flex gap-3">
          <Link
            to="/duties/$dutyId/nav"
            params={{ dutyId: snapshot.dutyId }}
            className="text-xs font-bold text-link"
            onClick={() => setRecoverySnapshot(null)}
          >
            Open navigation
          </Link>
          <button
            type="button"
            className="text-xs text-muted"
            onClick={() => setRecoverySnapshot(null)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
