import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavShell } from "@/components/driver/journey/NavShell";
import { getHeadingStop, nextPassengerDetail, stopProgressLabel } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { useNavigationStore } from "@/store/navigation";

export const Route = createFileRoute("/_app/duties/$dutyId/nav/depart")({
  head: () => ({ meta: [{ title: "Depart stop — Veyvio Driver" }] }),
  component: NavDepartPage,
});

function NavDepartPage() {
  const { dutyId } = Route.useParams();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  useEffect(() => {
    void loadDuty(dutyId).then((loaded) => {
      useNavigationStore.getState().clearRoute(dutyId);
      void useNavigationStore.getState().loadRoute(dutyId, loaded);
    });
  }, [dutyId, loadDuty]);

  const next = duty ? getHeadingStop(duty) : null;
  const nextLabel = next?.name.split("—")[0]?.trim() ?? "Next stop";
  const isDropoff = next?.passengerTasks.some((t) => t.type === "dropoff") &&
    !next?.passengerTasks.some((t) => t.type === "pickup");

  return (
    <NavShell dutyId={dutyId} eta="Now" nextStop={nextLabel} mapHighlight="current">
      <div className="rounded-md bg-accent p-3 text-center text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-driver-sky">Time to move</p>
        <p className="mt-1 text-sm font-extrabold">
          {next
            ? `${isDropoff ? "Next drop off" : "Next pick up"} · ${nextLabel}`
            : "No further stops on this run"}
        </p>
        {duty && <p className="mt-1 text-xs text-driver-sky">{stopProgressLabel(duty)}</p>}
      </div>
      {next ? (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-link">
              {isDropoff ? "Next drop off" : "Next pick up"}
            </p>
            <p className="mt-1 font-display text-lg font-extrabold">{nextLabel}</p>
            <p className="text-sm text-muted">Scheduled {formatTime(next.plannedArrival)}</p>
            {nextPassengerDetail(next) && (
              <p className="mt-1 text-sm text-foreground/80">{nextPassengerDetail(next)}</p>
            )}
          </div>
          <Badge variant="primary">{isDropoff ? "Drop off" : "Pick up"}</Badge>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted">
          All stops complete. Return to the journey to end the run.
        </div>
      )}
      <Button asChild size="lg" className="mt-4 h-12 w-full font-bold uppercase tracking-widest">
        <Link
          to={isDropoff ? "/duties/$dutyId/nav/dropoff" : next ? "/duties/$dutyId/nav/arrive" : "/duties/$dutyId/nav"}
          params={{ dutyId }}
        >
          {next ? (isDropoff ? "Arrive at drop-off" : "Arrive at pickup") : "Back to map"}
        </Link>
      </Button>
      {!next && (
        <Button asChild variant="outline" className="mt-2 h-12 w-full font-bold uppercase tracking-widest">
          <Link to="/duties/$dutyId/journey/end" params={{ dutyId }}>
            End journey
          </Link>
        </Button>
      )}
    </NavShell>
  );
}
