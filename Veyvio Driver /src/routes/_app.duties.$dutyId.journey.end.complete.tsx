import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyFlowShell } from "@/components/driver/journey/JourneyFlowShell";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/end/complete")({
  head: () => ({ meta: [{ title: "Journey complete — Veyvio Driver" }] }),
  component: EndJourneyCompletePage,
});

function EndJourneyCompletePage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  if (!duty) return null;

  return (
    <JourneyFlowShell
      kind="end"
      step={3}
      total={3}
      routeLabel={duty.routeName}
      backTo="/trips"
      backLabel="Trips"
    >
      <div className="flex min-h-[360px] flex-col items-center justify-center text-center animate-in-up">
        <div className="grid size-12 place-items-center rounded-full bg-ok/10 text-ok">
          <CheckCircle2 className="size-7" strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Journey complete</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          {duty.routeName} closed. Record synced to operations and yard.
        </p>
        <section className="mt-6 w-full rounded-xl border border-border bg-card p-4 text-left text-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Summary</p>
          <p className="mt-2 leading-relaxed">
            {duty.vehicle?.registrationNumber} · {duty.passengerCount} passengers · On time
          </p>
        </section>
        <Button asChild size="lg" className="mt-6 h-12 w-full font-bold uppercase tracking-widest">
          <Link to="/trips">Back to trips</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link to={`/duties/${dutyId}/journey/return`}>Return to depot</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-1 w-full text-muted">
          <Link to="/trips">View trip history</Link>
        </Button>
      </div>
    </JourneyFlowShell>
  );
}
