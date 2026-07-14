import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Navigation, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="space-y-4">
        <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Back to trips
        </Link>
        <p className="text-sm text-muted">Assignment not found.</p>
      </div>
    );
  }

  const title = trip.runName ?? assignmentTypeLabel(trip.assignmentType);
  const stops = routeStopsForTrip(trip);
  const passengers = trip.passengers ?? [];
  const instructions = trip.instructions ?? [];

  return (
    <div className="animate-in-up space-y-5 pb-6">
      <header className="space-y-3">
        <Link to="/trips" className="inline-flex items-center gap-1 text-sm text-link">
          <ArrowLeft className="size-4" />
          Trips
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{trip.reference}</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TripStatusBadge status={trip.status} />
            <Badge variant="default">{assignmentTypeLabel(trip.assignmentType)}</Badge>
          </div>
        </div>
      </header>

      {trip.hasOfficeChange && trip.officeChangeSummary && (
        <Card className="border-warn/30 bg-warn/5">
          <CardContent className="pt-4 text-sm text-warn">{trip.officeChangeSummary}</CardContent>
        </Card>
      )}

      <TripJobSummaryCard trip={trip} />

      <Card>
        <CardHeader>
          <CardTitle>Trip summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted">Scheduled</span>
            <span className="font-medium">
              {formatTime(trip.scheduledStart)}
              {trip.scheduledEnd ? ` – ${formatTime(trip.scheduledEnd)}` : ""}
            </span>
          </div>
          {trip.vehicleRegistration && (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Vehicle</span>
              <span className="font-mono font-bold">{trip.vehicleRegistration}</span>
            </div>
          )}
          {trip.dispatcherDepot && (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Operating depot</span>
              <span>{trip.dispatcherDepot}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="trip-full-route">
        <CardHeader>
          <CardTitle className="font-display text-lg font-extrabold">Full route</CardTitle>
        </CardHeader>
        <CardContent>
          <TripRouteTimeline stops={stops} title="Start to end" />
        </CardContent>
      </Card>

      {passengers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Passengers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  {p.wheelchairRequired && <p className="text-xs text-muted">Wheelchair required</p>}
                  {p.escortName && <p className="text-xs text-muted">Escort: {p.escortName}</p>}
                  {p.boardingInstructions && (
                    <p className="text-xs text-muted">{p.boardingInstructions}</p>
                  )}
                  {p.handoverRequirements && (
                    <p className="text-xs text-warn">{p.handoverRequirements}</p>
                  )}
                  {p.safeguardingWarning && (
                    <p className="text-xs font-medium text-vor">Safeguarding notice — see operations</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {instructions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {instructions.map((inst) => (
              <div key={inst.id}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  {inst.category}
                </p>
                <p className="text-sm font-medium">{inst.title}</p>
                <p className="text-sm text-muted">{inst.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-20 space-y-2 rounded-xl border border-border bg-card p-4 shadow-lg">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Actions</p>
        <div className="grid gap-2">
          {trip.dutyId && (
            <Button asChild size="lg" className="w-full font-bold uppercase tracking-widest">
              <Link to={`/duties/${trip.dutyId}/journey/open`}>Open journey</Link>
            </Button>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="lg" className="w-full">
              <Navigation className="size-4" />
              Navigate
            </Button>
            <Button variant="outline" size="lg" className="w-full">
              <Phone className="size-4" />
              Call contact
            </Button>
            <Button variant="secondary" className="w-full" asChild={Boolean(trip.primaryActionHref)}>
              {trip.primaryActionHref ? (
                <Link to={trip.primaryActionHref}>{trip.primaryActionLabel}</Link>
              ) : (
                trip.primaryActionLabel
              )}
            </Button>
            <Button variant="outline" className="w-full">
              Report delay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
