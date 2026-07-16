import { createFileRoute, Link } from "@tanstack/react-router";
import { Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { TripStatusBadge } from "@/components/driver/trips/TripAssignmentCard";
import { TripJobSummaryCard, TripRouteTimeline } from "@/components/driver/trips/TripRouteTimeline";
import { PassengerProfileCard } from "@/components/driver/passengers/PassengerProfileCard";
import { assignmentTypeLabel } from "@/domain/trips/trip-helpers";
import { getPassengerProfile } from "@/domain/passenger/passenger-profiles";
import { formatTime } from "@/lib/utils";
import type { TripDetail, TripStop } from "@/types/trips";
import { getTripDetail as loadTripDetail } from "@/data/mocks/trips-schedule";

function routeStopsForTrip(trip: TripDetail): TripStop[] {
  if (trip.stopTimeline?.length) return trip.stopTimeline;
  return [
    {
      id: "start",
      order: 1,
      name: trip.origin,
      address: trip.origin,
      plannedTime: trip.scheduledStart,
      status: "pending",
      type: "depot",
    },
    {
      id: "end",
      order: 2,
      name: trip.destination,
      address: trip.destination,
      plannedTime: trip.scheduledEnd,
      status: "pending",
      type: "dropoff",
    },
  ];
}

export const Route = createFileRoute("/_app/trips/$assignmentId")({
  head: () => ({ meta: [{ title: "Trip details — Veyvio Driver" }] }),
  loader: ({ params }) => ({ trip: loadTripDetail(params.assignmentId) }),
  component: TripDetailsPage,
});

function TripDetailsPage() {
  const { assignmentId } = Route.useParams();
  const loaderTrip = Route.useLoaderData()?.trip;
  const trip = loaderTrip ?? loadTripDetail(assignmentId);

  if (!trip) {
    return (
      <FocusedPageShell title="Trip not found" backTo="/trips" backLabel="Duties">
        <p className="text-sm text-muted">This assignment is not available.</p>
      </FocusedPageShell>
    );
  }

  const title = trip.runName ?? assignmentTypeLabel(trip.assignmentType);
  const stops = routeStopsForTrip(trip);
  const passengers = trip.passengers ?? [];
  const instructions = trip.instructions ?? [];

  const footer = (
    <div className="space-y-2">
      {trip.dutyId ? (
        <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
          <Link to={`/duties/${trip.dutyId}/journey/open`}>Open journey</Link>
        </Button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {trip.dutyId ? (
          <Button asChild variant="outline" size="lg" className="h-11 w-full">
            <Link to={`/duties/${trip.dutyId}/nav`}>
              <Navigation className="size-4" />
              Navigate
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="lg" className="h-11 w-full" disabled>
            <Navigation className="size-4" />
            Navigate
          </Button>
        )}
        {trip.dutyId ? (
          <Button asChild variant="outline" size="lg" className="h-11 w-full">
            <Link to={`/duties/${trip.dutyId}/journey/delay`}>Report delay</Link>
          </Button>
        ) : (
          <Button variant="outline" size="lg" className="h-11 w-full" disabled>
            Report delay
          </Button>
        )}
      </div>
      <Button asChild variant="ghost" className="w-full text-muted">
        <Link to="/more/support">
          <Phone className="size-4" />
          Call Operations
        </Link>
      </Button>
    </div>
  );

  return (
    <FocusedPageShell
      title={title}
      subtitle={trip.reference}
      backTo="/trips"
      backLabel="Duties"
      footer={footer}
    >
      <div className="animate-in-up space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <TripStatusBadge status={trip.status} />
          <Badge variant="default">{assignmentTypeLabel(trip.assignmentType)}</Badge>
        </div>

        {trip.hasOfficeChange && trip.officeChangeSummary ? (
          <section className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">
            {trip.officeChangeSummary}
          </section>
        ) : null}

        <TripJobSummaryCard trip={trip} />

        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Trip summary</p>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Scheduled</dt>
              <dd className="font-medium tabular-nums">
                {formatTime(trip.scheduledStart)}
                {trip.scheduledEnd ? ` – ${formatTime(trip.scheduledEnd)}` : ""}
              </dd>
            </div>
            {trip.vehicleRegistration ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Vehicle</dt>
                <dd className="font-mono font-bold">{trip.vehicleRegistration}</dd>
              </div>
            ) : null}
            {trip.dispatcherDepot ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Operating depot</dt>
                <dd>{trip.dispatcherDepot}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section data-testid="trip-full-route" className="rounded-xl border border-border bg-card p-4">
          <TripRouteTimeline stops={stops} title="Start to end" />
        </section>

        {passengers.length > 0 ? (
          <section className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Passengers</p>
            {passengers.map((p) => {
              const profile = p.passengerProfileId ? getPassengerProfile(p.passengerProfileId) : null;

              if (profile && trip.dutyId) {
                return (
                  <Link
                    key={p.id}
                    to="/duties/$dutyId/passengers/$passengerId"
                    params={{ dutyId: trip.dutyId, passengerId: profile.id }}
                    className="block"
                  >
                    <PassengerProfileCard profile={profile} compact className="hover:bg-secondary/40" />
                  </Link>
                );
              }

              return (
                <div key={p.id} className="space-y-1 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{p.name}</p>
                    <Badge variant="default">{p.status.replace(/_/g, " ")}</Badge>
                  </div>
                  {p.wheelchairRequired ? <p className="text-xs text-muted">Wheelchair required</p> : null}
                  {p.escortName ? <p className="text-xs text-muted">Escort: {p.escortName}</p> : null}
                  {p.boardingInstructions ? (
                    <p className="text-xs text-muted">{p.boardingInstructions}</p>
                  ) : null}
                  {p.handoverRequirements ? (
                    <p className="text-xs text-warn">{p.handoverRequirements}</p>
                  ) : null}
                  {p.safeguardingWarning ? (
                    <p className="text-xs font-medium text-vor">Safeguarding notice — see operations</p>
                  ) : null}
                </div>
              );
            })}
          </section>
        ) : null}

        {instructions.length > 0 ? (
          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Instructions</p>
            {instructions.map((inst) => (
              <div key={inst.id}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{inst.category}</p>
                <p className="text-sm font-medium">{inst.title}</p>
                <p className="text-sm text-muted">{inst.body}</p>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </FocusedPageShell>
  );
}
