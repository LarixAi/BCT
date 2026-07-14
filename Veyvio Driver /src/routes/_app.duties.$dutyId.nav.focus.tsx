import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { NavShell } from "@/components/driver/journey/NavShell";
import { TurnByTurnPanel } from "@/components/driver/journey/TurnByTurnPanel";
import { getHeadingStop, nextPassengerDetail } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/nav/focus")({
  head: () => ({ meta: [{ title: "Focus navigation — Veyvio Driver" }] }),
  component: NavFocusPage,
});

function NavFocusPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;
  const name = stop?.name.split("—")[0]?.trim() ?? "Next stop";

  return (
    <NavShell dutyId={dutyId} eta="—" nextStop={name}>
      <div className="space-y-4">
        <div className="rounded-xl bg-accent p-5 text-center text-white">
          <Badge variant="primary" className="mx-auto bg-link/20 text-driver-sky">
            Pick up
          </Badge>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-driver-sky">Next pick up</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold">{name}</h1>
          {stop && (
            <>
              <p className="mt-2 text-sm text-white/70">{nextPassengerDetail(stop)}</p>
              <p className="mt-1 text-sm text-white/70">Scheduled {formatTime(stop.plannedArrival)}</p>
            </>
          )}
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <TurnByTurnPanel dutyId={dutyId} variant="compact" showActions={false} />
        </section>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest">
          <Link to={`/duties/${dutyId}/nav/stops`} className="rounded-md border border-border py-3 text-center text-muted">
            Stop list
          </Link>
          <Link to={`/duties/${dutyId}/nav`} className="rounded-md bg-link py-3 text-center text-white">
            Map view
          </Link>
        </div>
      </div>
    </NavShell>
  );
}
