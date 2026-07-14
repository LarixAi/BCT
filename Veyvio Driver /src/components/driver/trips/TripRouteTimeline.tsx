import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import type { TripDetail, TripStop } from "@/types/trips";
import { Badge } from "@/components/ui/badge";

function stopTypeLabel(type: TripStop["type"]): string {
  switch (type) {
    case "pickup":
      return "Pick up";
    case "dropoff":
      return "Drop off";
    case "depot":
      return "Depot";
    default:
      return "Stop";
  }
}

function stopProgress(stop: TripStop): "done" | "current" | "upcoming" {
  if (stop.status === "completed") return "done";
  if (stop.status === "arrived") return "current";
  return "upcoming";
}

export function TripJobSummaryCard({ trip }: { trip: TripDetail }) {
  const meta = trip.metadata;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Job information</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-widest text-muted">Job ref</dt>
          <dd className="mt-0.5 font-semibold tabular-nums">{trip.reference}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-widest text-muted">Type</dt>
          <dd className="mt-0.5 font-semibold capitalize">{trip.assignmentType.replace(/_/g, " ")}</dd>
        </div>
        {meta.estimatedDuration && (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted">Duration</dt>
            <dd className="mt-0.5 font-semibold">{meta.estimatedDuration}</dd>
          </div>
        )}
        {meta.pickupCount != null && meta.dropoffCount != null && (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted">Stops</dt>
            <dd className="mt-0.5 font-semibold">
              {meta.pickupCount} pick ups · {meta.dropoffCount} drop offs
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export function TripRouteTimeline({
  stops,
  title = "Full route — start to end",
  className,
}: {
  stops: TripStop[];
  title?: string;
  className?: string;
}) {
  const firstTime = stops[0]?.plannedTime;
  const lastTime = stops[stops.length - 1]?.plannedTime;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{title}</p>
        {firstTime && lastTime && (
          <p className="text-[10px] text-muted">
            {formatTime(firstTime)} → {formatTime(lastTime)}
          </p>
        )}
      </div>
      <ol className="space-y-0">
        {stops.map((stop, index) => {
          const progress = stopProgress(stop);
          const isLast = index === stops.length - 1;
          const isCurrent = progress === "current";
          const isDone = progress === "done";

          return (
            <li key={stop.id} className={cn("flex gap-3", progress === "upcoming" && "opacity-60")}>
              <div className="flex flex-col items-center pt-1">
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    isCurrent && "bg-link ring-2 ring-link/25",
                    isDone && "bg-ok",
                    !isCurrent && !isDone && "bg-border",
                  )}
                  aria-hidden
                />
                {!isLast && (
                  <span
                    className={cn("my-0.5 w-0.5 min-h-3 flex-1", isDone ? "bg-ok/40" : "bg-border")}
                    aria-hidden
                  />
                )}
              </div>
              <div
                className={cn(
                  "mb-3 min-w-0 flex-1 rounded-lg border p-3",
                  isCurrent ? "border-link bg-driver-blue-soft" : "border-border bg-card",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-xs font-bold tabular-nums", isCurrent ? "text-link" : "text-muted")}>
                    {stop.plannedTime ? formatTime(stop.plannedTime) : "—"}
                  </p>
                  <Badge variant={isCurrent ? "primary" : "default"}>{stopTypeLabel(stop.type)}</Badge>
                </div>
                <p className="mt-1 text-sm font-bold leading-snug">{stop.name}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{stop.address}</p>
                {isCurrent && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-link">Next stop</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
