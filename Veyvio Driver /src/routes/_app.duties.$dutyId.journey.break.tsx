import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getHeadingStop } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/break")({
  head: () => ({ meta: [{ title: "Rest break — Veyvio Driver" }] }),
  component: JourneyBreakPage,
});

function JourneyBreakPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const next = duty ? getHeadingStop(duty) : null;

  return (
    <div className="animate-in-up space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Rest break</p>
          <h1 className="font-display text-xl font-extrabold">Journey paused</h1>
        </div>
        <Badge variant="default" className="border-warn/40 bg-warn/10 text-warn">
          On break
        </Badge>
      </header>
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Break started</p>
        <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">
          {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {next && (
          <p className="mt-2 text-sm text-muted">
            Minimum 30 min · Next stop {next.name.split("—")[0]?.trim()} at {formatTime(next.plannedArrival)}
          </p>
        )}
      </section>
      <div className="rounded-md border border-ok/30 bg-ok/5 p-3 text-sm text-ok">
        Vehicle secure · passengers off board · {duty?.vehicle?.registrationNumber} at lay-by
      </div>
      <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
        <Link to={`/duties/${dutyId}/journey/active`}>End break and resume</Link>
      </Button>
    </div>
  );
}
