import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { NavShell } from "@/components/driver/journey/NavShell";
import { getActiveRun, getCurrentStopIndex } from "@/domain/journey/journey-helpers";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/nav/overview")({
  head: () => ({ meta: [{ title: "Route overview — Veyvio Driver" }] }),
  component: NavOverviewPage,
});

function NavOverviewPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const run = duty ? getActiveRun(duty) : null;
  const remaining = run ? run.stops.length - getCurrentStopIndex(run.stops) : 0;

  return (
    <NavShell
      dutyId={dutyId}
      eta="—"
      nextStop="Full journey"
      mapClassName="h-32 shrink-0"
      footer={
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg font-extrabold">{run?.name ?? duty?.routeName}</p>
              <p className="text-sm text-muted">{run?.stops.length ?? 0} stops · {remaining} remaining</p>
            </div>
            <Badge variant="ok">In service</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md bg-secondary p-2">
              <p className="text-[10px] uppercase text-muted">Completed</p>
              <p className="font-extrabold">{run ? getCurrentStopIndex(run.stops) : 0}</p>
            </div>
            <div className="rounded-md bg-secondary p-2">
              <p className="text-[10px] uppercase text-muted">Remaining</p>
              <p className="font-extrabold">{remaining}</p>
            </div>
            <div className="rounded-md bg-secondary p-2">
              <p className="text-[10px] uppercase text-muted">Return</p>
              <p className="font-extrabold">{duty?.endTime.slice(0, 5)}</p>
            </div>
          </div>
          <Link to={`/duties/${dutyId}/nav`} className="block text-center text-xs font-bold uppercase tracking-widest text-link">
            Back to navigation
          </Link>
        </div>
      }
    />
  );
}
