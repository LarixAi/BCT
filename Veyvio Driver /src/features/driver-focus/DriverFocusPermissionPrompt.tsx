import { useDriverFocusRuntime } from "./DriverFocusProvider";
import { useDriverFocusStore } from "@/store/driver-focus";
import { Capacitor } from "@capacitor/core";
import { isActiveOperationalWorkflow } from "@/platform/driver-focus/operational-workflow";

export function DriverFocusPermissionPrompt() {
  const runtime = useDriverFocusRuntime();
  const settings = useDriverFocusStore((state) => state.settings);
  const permissions = useDriverFocusStore((state) => state.permissions);
  const updatePermissions = useDriverFocusStore((state) => state.updatePermissions);

  if (!settings.enabled) return null;
  if (!isActiveOperationalWorkflow(runtime.workflow)) return null;

  const platform = Capacitor.getPlatform();
  const showKeepAwake =
    !permissions.keepAwakePromptSeen && settings.keepScreenAwakeDuringActiveWork;
  const showOverlay =
    !permissions.overlayPromptSeen &&
    settings.openOverlayWhenLeavingVeyvio &&
    platform !== "web";
  const showLocation =
    !permissions.backgroundLocationPromptSeen && platform !== "web";

  if (!showKeepAwake && !showOverlay && !showLocation) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-[58] mx-auto max-w-lg px-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl">
        {showKeepAwake && (
          <PromptBlock
            title="Keep Veyvio active during trips"
            body="Veyvio can keep your screen awake while you complete vehicle checks, pickups and drop-offs. You can still lock the phone with the power button."
            primaryLabel="Enable Driver Focus Mode"
            secondaryLabel="Not now"
            onPrimary={() =>
              updatePermissions({ keepAwakePromptSeen: true, notificationsGranted: true })
            }
            onSecondary={() => updatePermissions({ keepAwakePromptSeen: true })}
          />
        )}

        {showOverlay && !showKeepAwake && (
          <PromptBlock
            title="Show active trip while using Maps"
            body={
              platform === "android"
                ? "Veyvio can display a small trip window when you leave the app during an active journey."
                : "Veyvio can show your active trip on the Lock Screen and Dynamic Island when you leave the app."
            }
            primaryLabel="Allow"
            secondaryLabel="Not now"
            onPrimary={() => updatePermissions({ overlayPromptSeen: true })}
            onSecondary={() => updatePermissions({ overlayPromptSeen: true })}
          />
        )}

        {showLocation && !showKeepAwake && !showOverlay && (
          <PromptBlock
            title="Background location for active duty"
            body="Location is collected only during active duty for trip safety, dispatch visibility and verified journey records."
            primaryLabel="Allow location"
            secondaryLabel="Not now"
            onPrimary={() =>
              updatePermissions({ backgroundLocationPromptSeen: true, locationGranted: true })
            }
            onSecondary={() => updatePermissions({ backgroundLocationPromptSeen: true })}
          />
        )}
      </div>
    </div>
  );
}

function PromptBlock({
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs text-muted">{body}</p>
      <div className="flex gap-3">
        <button type="button" className="text-xs font-bold text-link" onClick={onPrimary}>
          {primaryLabel}
        </button>
        <button type="button" className="text-xs text-muted" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
