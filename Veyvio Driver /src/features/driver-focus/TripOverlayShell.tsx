import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTripOverlayStore } from "@/store/trip-overlay";
import { useDrivingSafety } from "@/features/driver-focus/use-driving-safety";

const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
type Corner = (typeof CORNERS)[number];

export function TripOverlayShell() {
  const visible = useTripOverlayStore((s) => s.visible);
  const mode = useTripOverlayStore((s) => s.mode);
  const payload = useTripOverlayStore((s) => s.payload);
  const [corner, setCorner] = useState<Corner>("bottom-right");

  const compact = mode === "android_pip" || mode === "ios_live_activity";

  if (!visible || !payload) return null;

  if (compact) {
    return (
      <div className="fixed inset-0 z-[100] flex min-h-dvh flex-col bg-accent text-white">
        <TripOverlayCard payload={payload} compact onCornerChange={setCorner} corner={corner} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[100]",
        corner === "top-left" && "left-3 top-safe",
        corner === "top-right" && "right-3 top-safe",
        corner === "bottom-left" && "bottom-24 left-3",
        corner === "bottom-right" && "bottom-24 right-3",
      )}
    >
      <div className="pointer-events-auto w-[min(92vw,320px)]">
        <TripOverlayCard payload={payload} compact={false} onCornerChange={setCorner} corner={corner} />
      </div>
    </div>
  );
}

function TripOverlayCard({
  payload,
  compact,
  corner,
  onCornerChange,
}: {
  payload: NonNullable<ReturnType<typeof useTripOverlayStore.getState>["payload"]>;
  compact: boolean;
  corner: Corner;
  onCornerChange: (corner: Corner) => void;
}) {
  const { canPerform } = useDrivingSafety();
  const alertAllowed = canPerform("report_urgent_problem");
  const nextCorner = useMemo(() => {
    const index = CORNERS.indexOf(corner);
    return CORNERS[(index + 1) % CORNERS.length];
  }, [corner]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-accent shadow-2xl",
        compact ? "min-h-dvh rounded-none border-0" : "border-border/20",
      )}
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-driver-sky">
          Veyvio · {payload.tripStateLabel}
        </p>
        {payload.hasNewInstruction && (
          <p className="mt-1 text-[10px] font-semibold text-warn">New instruction</p>
        )}
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/55">Next</p>
          <p className="mt-1 text-lg font-extrabold leading-tight">{payload.nextStopLabel}</p>
          <p className="mt-1 text-sm text-driver-sky">
            {payload.etaLabel} · {payload.distanceLabel}
          </p>
        </div>

        <p className="text-xs text-white/75">Passenger: {payload.passengerProgressLabel}</p>
        {payload.accessibilityIndicator && (
          <p className="text-xs font-semibold text-driver-sky">{payload.accessibilityIndicator}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-3">
        <Link
          to="/duties/$dutyId/nav"
          params={{ dutyId: payload.dutyId }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-driver-sky px-3 py-2.5 text-xs font-bold text-accent"
        >
          <Navigation className="size-4" />
          Open Veyvio
        </Link>
        <button
          type="button"
          disabled={!alertAllowed}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold",
            alertAllowed
              ? "border-white/15 text-white"
              : "cursor-not-allowed border-white/10 text-white/35",
          )}
        >
          <AlertTriangle className="size-4" />
          {alertAllowed ? "Alert" : "Stop to alert"}
        </button>
      </div>

      {!compact && (
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2">
          <button
            type="button"
            className="text-[10px] font-semibold uppercase tracking-widest text-white/45"
            onClick={() => onCornerChange(nextCorner)}
          >
            Move window
          </button>
          <a href="tel:999" className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/55">
            <Phone className="size-3" />
            Dispatch
          </a>
        </div>
      )}
    </div>
  );
}

export function useTripOverlayCompactLayout(): boolean {
  const mode = useTripOverlayStore((s) => s.mode);
  const visible = useTripOverlayStore((s) => s.visible);
  return visible && (mode === "android_pip" || mode === "ios_live_activity");
}

export function TripOverlayLayoutEffect() {
  const compact = useTripOverlayCompactLayout();

  useEffect(() => {
    document.documentElement.classList.toggle("trip-overlay-compact", compact);
    return () => document.documentElement.classList.remove("trip-overlay-compact");
  }, [compact]);

  return null;
}
