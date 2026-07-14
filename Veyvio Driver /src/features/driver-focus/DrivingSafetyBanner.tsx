import { useDrivingSafety } from "./use-driving-safety";

export function DrivingSafetyBanner() {
  const { isRestricted, speedKmh } = useDrivingSafety();
  if (!isRestricted) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-[54] mx-auto max-w-lg px-4">
      <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 shadow-lg backdrop-blur-sm">
        <p className="text-sm font-bold text-warn">Vehicle moving</p>
        <p className="mt-1 text-xs text-muted">
          {speedKmh != null ? `About ${Math.round(speedKmh)} km/h. ` : ""}
          Only navigation, next instruction, and emergency actions are available until you stop
          safely.
        </p>
      </div>
    </div>
  );
}
