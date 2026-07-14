import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OpenJourneyShell } from "@/components/driver/journey/OpenJourneyShell";
import { TripRouteTimeline } from "@/components/driver/trips/TripRouteTimeline";
import { dutyStopsToTripStops, firstPickupStop } from "@/domain/journey/open-journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/open/confirm")({
  head: () => ({ meta: [{ title: "Confirm journey — Veyvio Driver" }] }),
  component: OpenJourneyConfirmPage,
});

function OpenJourneyConfirmPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  if (!duty) return <p className="p-4 text-sm text-muted">Loading duty…</p>;

  const stops = dutyStopsToTripStops(duty);
  const pickup = firstPickupStop(duty);
  const vehicle = duty.vehicle;

  return (
    <OpenJourneyShell
      step={2}
      routeLabel={duty.routeName}
      backTo={`/duties/${dutyId}/journey/open`}
      backLabel="Back"
    >
      <div className="animate-in-up space-y-4">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Confirm journey details</h1>
          <p className="mt-1 text-sm text-muted">Review before opening {duty.routeName}.</p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Route</p>
          <p className="mt-1 font-display text-lg font-extrabold">{duty.runs[0]?.name ?? duty.routeName}</p>
          <p className="mt-0.5 text-xs text-muted">
            {duty.passengerCount} passengers · {formatTime(duty.startTime)}–{formatTime(duty.endTime)}
          </p>
        </section>

        {stops.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-4">
            <TripRouteTimeline stops={stops} title="Confirm full route" />
          </section>
        )}

        {vehicle && (
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Vehicle</p>
            <p className="mt-1 font-mono text-lg font-extrabold tracking-wide">{vehicle.registrationNumber}</p>
            <p className="mt-0.5 text-xs text-muted">
              {vehicle.make} {vehicle.model} · Fleet {vehicle.fleetNumber} · {duty.reportingLocation}
            </p>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Scheduled depart</p>
            <p className="mt-1 font-display text-lg font-extrabold">{formatTime(duty.startTime)}</p>
          </div>
          {pickup && (
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">First pick up</p>
              <p className="mt-1 text-sm font-extrabold">{pickup.name.split("—")[0]?.trim() ?? pickup.name}</p>
              <p className="mt-0.5 text-[10px] text-muted">
                {pickup.address.split(",")[0]} · {formatTime(pickup.plannedArrival)}
              </p>
            </div>
          )}
        </div>

        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() => void navigate({ to: "/duties/$dutyId/journey/open/readings", params: { dutyId } })}
        >
          Continue
        </Button>
      </div>
    </OpenJourneyShell>
  );
}
