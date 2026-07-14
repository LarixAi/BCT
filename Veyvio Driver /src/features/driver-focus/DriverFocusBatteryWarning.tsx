import { useDriverFocusRuntime } from "./DriverFocusProvider";
import { useDriverFocusStore } from "@/store/driver-focus";

const LOW_BATTERY_THRESHOLD = 15;

export function DriverFocusBatteryWarning() {
  const runtime = useDriverFocusRuntime();
  const updateSettings = useDriverFocusStore((state) => state.updateSettings);

  if (!runtime.keepScreenAwake) return null;
  if (runtime.isCharging) return null;
  if (runtime.batteryPercent == null || runtime.batteryPercent > LOW_BATTERY_THRESHOLD) return null;

  return (
    <div className="fixed inset-x-0 top-safe z-[60] mx-auto max-w-lg px-4 pt-2">
      <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 shadow-lg backdrop-blur-sm">
        <p className="text-sm font-bold text-warn">Battery at {runtime.batteryPercent}%</p>
        <p className="mt-1 text-xs text-muted">
          Your screen is being kept awake for the active trip. Connect the phone to a charger when
          safe.
        </p>
        <button
          type="button"
          className="mt-3 text-xs font-bold text-link"
          onClick={() => updateSettings({ reduceBrightnessWhenStationary: true })}
        >
          Reduce brightness preference
        </button>
      </div>
    </div>
  );
}
