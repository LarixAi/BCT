import { op } from "@/lib/driver-operational-theme";
import { driverSpeedStatus } from "@/lib/fleet-tracking-rules";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  safe: { label: "Within limit", tone: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  warning: { label: "Over limit", tone: "bg-amber-100 text-amber-900 border-amber-200" },
  danger: { label: "Speeding", tone: "bg-red-100 text-red-800 border-red-200" },
  unknown: { label: "Tracking", tone: "bg-slate-100 text-slate-600 border-slate-200" },
  weak_gps: { label: "GPS weak", tone: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function DriverSpeedCard({
  speedMph,
  speedLimitMph,
  accuracyMeters,
  trackingActive,
  vehicleRegistration,
  jobLabel,
  compact = false,
  mapOverlay = false,
}) {
  const speedLabel = typeof speedMph === "number" ? `${Math.round(speedMph)} mph` : "— mph";
  const limitLabel =
    typeof speedLimitMph === "number" ? `${Math.round(speedLimitMph)} mph limit` : "Limit unknown";
  const statusKey = driverSpeedStatus(speedMph, speedLimitMph, accuracyMeters);
  const status = STATUS_STYLES[statusKey] ?? STATUS_STYLES.unknown;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/95 backdrop-blur-sm shadow-sm pointer-events-auto",
        mapOverlay ? "px-3 py-2" : compact ? "px-3 py-2" : "px-4 py-3",
        !trackingActive && !mapOverlay && "opacity-70",
        statusKey === "danger" && trackingActive && "border-red-300",
        statusKey === "warning" && trackingActive && "border-amber-300",
        statusKey === "safe" && trackingActive && "border-emerald-300",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "font-bold tabular-nums text-foreground",
              mapOverlay ? "text-lg leading-none" : compact ? "text-xl" : "text-2xl",
            )}
          >
            {speedLabel}
          </p>
          <p className={cn("text-muted-foreground", mapOverlay ? "text-[11px] mt-0.5" : "text-xs mt-0.5")}>
            {limitLabel}
          </p>
        </div>
        <span
          className={cn(
            "font-semibold rounded-full border shrink-0",
            mapOverlay ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1",
            status.tone,
          )}
        >
          {trackingActive ? status.label : "Off duty"}
        </span>
      </div>
      {(vehicleRegistration || jobLabel) && !compact && !mapOverlay ? (
        <p className="text-xs text-muted-foreground mt-2 truncate">
          {[vehicleRegistration, jobLabel].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      {!trackingActive && !mapOverlay ? (
        <p className={`text-[11px] mt-2 ${op.tealAccent}`}>Sign on to duty to start tracking</p>
      ) : null}
    </div>
  );
}
