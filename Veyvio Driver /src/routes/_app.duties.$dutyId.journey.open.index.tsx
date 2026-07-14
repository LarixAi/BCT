import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpenJourneyShell } from "@/components/driver/journey/OpenJourneyShell";
import { ReadinessRow } from "@/components/driver/journey/ReadinessRow";
import { buildJourneyReadiness } from "@/domain/journey/open-journey-helpers";
import { useDriverStore } from "@/store/driver";
import { useVehicleCheckStore } from "@/store/vehicle-check";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/open/")({
  head: () => ({ meta: [{ title: "Journey readiness — Veyvio Driver" }] }),
  component: OpenJourneyReadinessPage,
});

function OpenJourneyReadinessPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const checksHome = useVehicleCheckStore((s) => s.checksHome);

  if (!duty) {
    return <p className="p-4 text-sm text-muted">Loading duty…</p>;
  }

  const readiness = buildJourneyReadiness(duty, checksHome);
  const routeLabel = duty.routeName;
  const backTo = dutyId === "duty_1" ? "/trips/asgn_school_am" : "/trips";

  if (readiness.blocked) {
    return (
      <OpenJourneyShell step={1} routeLabel={routeLabel} backTo={backTo} backLabel="Back to trip">
        <div className="animate-in-up space-y-4">
          <header>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Journey cannot open yet</h1>
            <p className="mt-1 text-sm text-muted">
              Resolve the items below before {routeLabel} can enter service.
            </p>
          </header>

          <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
            <Badge variant="default" className="border-warn/40 bg-warn/10 text-warn">
              Blocked
            </Badge>
            <p className="mt-2 text-sm font-bold">{readiness.blockTitle}</p>
            {readiness.blockDetail && <p className="mt-1 text-sm text-muted">{readiness.blockDetail}</p>}
          </div>

          <div className="space-y-2">
            {readiness.items.map((item) => (
              <ReadinessRow key={item.id} label={item.label} detail={item.detail} passed={item.passed} />
            ))}
          </div>

          <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to={`/duties/${dutyId}`}>Go to Duty Hub</Link>
          </Button>
          <p className="text-center text-xs text-muted">
            Finish prep on the Duty Hub: acknowledge, vehicle, check, then clock in.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/checks">Open vehicle check</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full text-muted">
            <Link to={backTo}>Back to trip</Link>
          </Button>
        </div>
      </OpenJourneyShell>
    );
  }

  return (
    <OpenJourneyShell step={1} routeLabel={routeLabel} backTo={backTo} backLabel="Back to trip">
      <div className="animate-in-up space-y-4">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Journey readiness</h1>
          <p className="mt-1 text-sm text-muted">
            Confirm everything is in place before opening {routeLabel}
            {duty.vehicle ? ` on ${duty.vehicle.registrationNumber}` : ""}.
          </p>
        </header>

        <div className="space-y-2">
          {readiness.items.map((item) => (
            <ReadinessRow key={item.id} label={item.label} detail={item.detail} passed={item.passed} />
          ))}
        </div>

        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() => void navigate({ to: "/duties/$dutyId/journey/open/confirm", params: { dutyId } })}
        >
          Continue
        </Button>
      </div>
    </OpenJourneyShell>
  );
}
