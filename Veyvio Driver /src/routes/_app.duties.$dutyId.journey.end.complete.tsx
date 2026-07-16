import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyFlowShell } from "@/components/driver/journey/JourneyFlowShell";
import { useDriverStore } from "@/store/driver";
import { getNextJourney } from "@/domain/journey/journey-helpers";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/end/complete")({
  head: () => ({ meta: [{ title: "Journey complete — Veyvio Driver" }] }),
  component: EndJourneyCompletePage,
});

function EndJourneyCompletePage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const setActiveJourney = useDriverStore((s) => s.setActiveJourney);

  if (!duty) return null;

  const next = getNextJourney(duty);
  const handbackDone = Boolean(duty.vehicleHandback?.completedAt);

  return (
    <JourneyFlowShell
      kind="end"
      step={3}
      total={3}
      routeLabel={duty.routeName}
      backTo={`/duties/${dutyId}`}
      backLabel="Duty"
      footer={
        <div className="space-y-2">
          {next ? (
            <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
              <Link
                to={`/duties/${dutyId}/journey/open`}
                onClick={() => setActiveJourney(next.journeyId ?? next.id)}
              >
                Start next journey
              </Link>
            </Button>
          ) : null}

          <Button
            asChild
            size="lg"
            className="h-12 w-full font-bold uppercase tracking-widest"
            variant={next ? "outline" : "default"}
          >
            <Link to={`/duties/${dutyId}`}>Duty overview</Link>
          </Button>

          {!next && !handbackDone ? (
            <Button asChild variant="ghost" className="w-full">
              <Link to={`/duties/${dutyId}/journey/return`}>Return to depot</Link>
            </Button>
          ) : null}

          <Button asChild variant="ghost" className="w-full text-muted">
            <Link to="/">Home</Link>
          </Button>
        </div>
      }
    >
      <div className="flex min-h-[240px] flex-col items-center justify-center text-center animate-in-up">
        <div className="grid size-12 place-items-center rounded-full bg-ok/10 text-ok">
          <CheckCircle2 className="size-7" strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Journey complete</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          {next
            ? "This journey is closed. Start the next journey when you are ready — vehicle custody stays with you."
            : handbackDone
              ? "Journey closed and vehicle handed back. Finish any end-of-duty steps, then complete the duty."
              : "Journey closed. Complete vehicle handback when custody ends, then complete the duty."}
        </p>
        <section className="mt-6 w-full rounded-xl border border-border bg-card p-4 text-left text-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Summary</p>
          <p className="mt-2 leading-relaxed">
            {duty.vehicle?.registrationNumber} · {duty.reference}
          </p>
          {next ? (
            <p className="mt-2 text-muted">Next: {next.name}</p>
          ) : null}
        </section>
      </div>
    </JourneyFlowShell>
  );
}
