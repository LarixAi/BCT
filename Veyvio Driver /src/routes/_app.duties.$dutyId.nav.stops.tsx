import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { NavShell } from "@/components/driver/journey/NavShell";
import { getActiveRun, getCurrentStopIndex } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/nav/stops")({
  head: () => ({ meta: [{ title: "Stop list — Veyvio Driver" }] }),
  component: NavStopsPage,
});

function NavStopsPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const run = duty ? getActiveRun(duty) : null;
  const currentIdx = run ? getCurrentStopIndex(run.stops) : 0;

  return (
    <NavShell dutyId={dutyId} eta="2 min" nextStop="Full route" mapClassName="h-36 shrink-0">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Full route</p>
          {duty && (
            <p className="text-[10px] text-muted">
              {formatTime(duty.startTime)} → {formatTime(duty.endTime)}
            </p>
          )}
        </div>
        {run?.stops.map((stop, index) => {
          const isCurrent = index === currentIdx;
          const isDone = index < currentIdx;
          const task = stop.passengerTasks[0];
          return (
            <div
              key={stop.id}
              className={`rounded-md border p-3 ${isCurrent ? "border-link bg-driver-blue-soft" : "border-border bg-card"}`}
            >
              <div className="flex gap-3">
                <p className={`w-10 text-xs font-bold tabular-nums ${isCurrent ? "text-link" : "text-muted"}`}>
                  {formatTime(stop.plannedArrival)}
                </p>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold">{stop.name}</p>
                    {task?.type === "pickup" && <Badge variant="primary">Pick up</Badge>}
                    {task?.type === "dropoff" && <Badge variant="default">Drop off</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{stop.address}</p>
                  <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${isCurrent ? "text-link" : "text-muted"}`}>
                    {isDone ? "Completed" : isCurrent ? "Next stop" : "Upcoming"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <Link to={`/duties/${dutyId}/nav/arrive`} className="block pt-2 text-center text-xs font-bold uppercase tracking-widest text-link">
          Simulate arrival at stop
        </Link>
      </div>
    </NavShell>
  );
}
