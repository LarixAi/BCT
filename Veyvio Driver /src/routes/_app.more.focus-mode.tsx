import { useMemo } from "react";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { useDriverFocusRuntime } from "@/features/driver-focus/DriverFocusProvider";
import { driverFocusCoordinator } from "@/platform/driver-focus/driver-focus-coordinator";
import { assessDeviceReadiness } from "@/platform/driver-focus/device-readiness";
import { useDriverFocusStore } from "@/store/driver-focus";
import { useTripOverlayStore } from "@/store/trip-overlay";
import { useVehicleMotionStore } from "@/store/vehicle-motion";
import type { DriverFocusSettings } from "@/types/driver-focus";
import type { ReadinessStatus } from "@/platform/driver-focus/device-readiness";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/more/focus-mode")({
  head: () => ({ meta: [{ title: "Driver Focus Mode — Veyvio Driver" }] }),
  component: DriverFocusModePage,
});

function DriverFocusModePage() {
  const settings = useDriverFocusStore((state) => state.settings);
  const permissions = useDriverFocusStore((state) => state.permissions);
  const updateSettings = useDriverFocusStore((state) => state.updateSettings);
  const resetSettings = useDriverFocusStore((state) => state.resetSettings);
  const runtime = useDriverFocusRuntime();
  const overlayMode = useTripOverlayStore((s) => s.mode);
  const pipDenied = useTripOverlayStore((s) => s.pipDenied);
  const speedKmh = useVehicleMotionStore((s) => s.speedKmh);
  const vehicleMoving = useVehicleMotionStore((s) => s.vehicleMoving);
  const capabilities = driverFocusCoordinator.getCapabilities();

  const readiness = useMemo(
    () =>
      assessDeviceReadiness({
        capabilities,
        permissions,
        focusModeEnabled: settings.enabled,
        batteryPercent: runtime.batteryPercent,
        isCharging: runtime.isCharging,
        appVersion: "0.1.0",
      }),
    [capabilities, permissions, settings.enabled, runtime.batteryPercent, runtime.isCharging],
  );

  const toggles: Array<{
    key: keyof DriverFocusSettings;
    label: string;
    hint?: string;
    requiresMaster?: boolean;
  }> = [
    {
      key: "keepScreenAwakeDuringActiveWork",
      label: "Keep screen awake during active work",
      hint: "Prevents automatic lock while completing checks, pickups and drop-offs. You can still lock with the power button.",
      requiresMaster: true,
    },
    {
      key: "automaticallyShowTripOverlay",
      label: "Automatically show trip overlay",
      hint: "Android PiP or iOS Live Activity when you leave Veyvio during an active trip.",
      requiresMaster: true,
    },
    {
      key: "openOverlayWhenLeavingVeyvio",
      label: "Open overlay when leaving Veyvio",
      requiresMaster: true,
    },
    {
      key: "reduceBrightnessWhenStationary",
      label: "Reduce screen brightness when stationary",
    },
    {
      key: "audioAlerts",
      label: "Audio alerts",
    },
    {
      key: "vibrationAlerts",
      label: "Vibration alerts",
    },
  ];

  return (
    <MoreSubpageLayout title="Driver Focus Mode">
      <p className="text-sm text-muted">
        During active work, keep Veyvio visible and awake. When you leave the app, keep essential
        trip information visible without exposing passenger details.
      </p>

      <div className="rounded-xl border border-border bg-card p-4">
        <label className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Driver Focus Mode</p>
            <p className="text-xs text-muted">Activates only during vehicle checks, runs and trips.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => updateSettings({ enabled: e.target.checked })}
            className="size-5 accent-primary"
          />
        </label>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {toggles.map(({ key, label, hint, requiresMaster }) => {
          const disabled = requiresMaster && !settings.enabled;
          return (
            <label
              key={key}
              className={`flex items-start justify-between gap-3 px-4 py-3 ${disabled ? "opacity-50" : ""}`}
            >
              <div className="min-w-0">
                <span className="text-sm">{label}</span>
                {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                disabled={disabled}
                onChange={(e) => updateSettings({ [key]: e.target.checked })}
                className="mt-0.5 size-5 shrink-0 accent-primary"
              />
            </label>
          );
        })}
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-4 text-xs text-muted">
        <p className="font-bold uppercase tracking-widest text-[10px]">Current status</p>
        <p>Phase: <span className="font-medium text-foreground">{runtime.phase}</span></p>
        <p>Workflow: <span className="font-medium text-foreground">{runtime.workflow}</span></p>
        <p>Keep awake: <span className="font-medium text-foreground">{runtime.keepScreenAwake ? "On" : "Off"}</span></p>
        <p>Vehicle: <span className="font-medium text-foreground">{vehicleMoving ? `Moving${speedKmh != null ? ` · ${Math.round(speedKmh)} km/h` : ""}` : "Stationary"}</span></p>
        <p>Overlay mode: <span className="font-medium text-foreground">{overlayMode}</span></p>
        {pipDenied && <p className="text-warn">PiP unavailable — using trip notification fallback.</p>}
        {runtime.lastError && <p className="text-vor">Last error: {runtime.lastError}</p>}
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-xs">
        <p className="font-bold uppercase tracking-widest text-muted">Device readiness</p>
        <p className={readinessTone(readiness.status)}>
          {readiness.status === "ready"
            ? "Ready for release"
            : readiness.status === "attention"
              ? "Attention needed before duty"
              : "Blocked — resolve before release"}
        </p>
        {readiness.checks.map((check) => (
          <p key={check.id} className="flex justify-between gap-3">
            <span className="text-muted">{check.label}</span>
            <span className={readinessTone(check.status)}>{check.detail}</span>
          </p>
        ))}
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-xs">
        <p className="font-bold uppercase tracking-widest text-muted">Device capabilities</p>
        <CapabilityRow label="Keep Awake" supported={capabilities.keepAwakeSupported} />
        <CapabilityRow label="Trip notifications" supported={capabilities.notificationsEnabled} />
        <CapabilityRow label="Background location" supported={capabilities.backgroundLocationSupported} />
        <CapabilityRow label="Android PiP" supported={capabilities.androidPipSupported} />
        <CapabilityRow label="iOS Live Activity" supported={capabilities.iosLiveActivitySupported} />
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-4 text-xs text-muted">
        <p className="font-bold uppercase tracking-widest text-[10px]">Permission health</p>
        <p>Notifications: {permissionLabel(permissions.notificationsGranted)}</p>
        <p>Location: {permissionLabel(permissions.locationGranted)}</p>
        <p>Keep awake onboarding: {permissions.keepAwakePromptSeen ? "Seen" : "Pending"}</p>
        <p>Overlay onboarding: {permissions.overlayPromptSeen ? "Seen" : "Pending"}</p>
      </div>

      <button
        type="button"
        onClick={() => resetSettings()}
        className="text-sm font-medium text-link"
      >
        Reset to defaults
      </button>
    </MoreSubpageLayout>
  );
}

function CapabilityRow({ label, supported }: { label: string; supported: boolean }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={supported ? "font-medium text-ready" : "text-muted"}>
        {supported ? "Supported" : "Not yet available"}
      </span>
    </p>
  );
}

function permissionLabel(value: boolean | null): string {
  if (value === true) return "Granted";
  if (value === false) return "Denied";
  return "Not checked";
}

function readinessTone(status: ReadinessStatus): string {
  if (status === "ready") return "font-medium text-ready";
  if (status === "attention") return "font-medium text-warn";
  return "font-medium text-vor";
}
