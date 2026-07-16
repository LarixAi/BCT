import { Link } from "@tanstack/react-router";
import type { DriverHomeSummary, DriverTripSummary } from "@/types/home";
import { getMockDutyDetail } from "@/data/mocks/duties";
import { uniquePassengerIdsFromDuty } from "@/domain/passenger/passenger-profiles";
import { PassengerManifestHomeCard } from "@/components/driver/passengers/PassengerPickupBrief";
import { Button } from "@/components/ui/button";
import { HomeCard, HomeCardLabel, HomeCardTitle, HomeDetailRow } from "./HomeCard";

function PassengerNeedsSection({ trip }: { trip: DriverTripSummary }) {
  const duty = getMockDutyDetail(trip.dutyId);
  if (!duty) return null;
  const passengerIds = uniquePassengerIdsFromDuty(duty.runs);
  if (passengerIds.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <PassengerManifestHomeCard dutyId={trip.dutyId} passengerIds={passengerIds} />
    </div>
  );
}

function TripDetails({ trip, mode }: { trip: DriverTripSummary; mode: "next" | "active" }) {
  const dutyId = trip.dutyId;

  if (mode === "next" || trip.phase === "not_started") {
    return (
      <>
        <HomeCardLabel>Next journey</HomeCardLabel>
        <HomeCardTitle>{trip.name}</HomeCardTitle>
        <dl className="mt-3 space-y-2">
          <HomeDetailRow label="Start" value={trip.startTime} />
          <HomeDetailRow label="Vehicle" value={trip.vehicleRegistration} />
          {trip.firstPickupTime && <HomeDetailRow label="First pickup" value={trip.firstPickupTime} />}
          <HomeDetailRow label="Passengers" value={trip.passengerCount} />
          {trip.wheelchairPassengerCount > 0 && (
            <HomeDetailRow label="Wheelchair passengers" value={trip.wheelchairPassengerCount} />
          )}
          {trip.passengerAssistantName && (
            <HomeDetailRow label="Passenger assistant" value={trip.passengerAssistantName} />
          )}
          {trip.endTime && <HomeDetailRow label="Estimated completion" value={trip.endTime} />}
        </dl>
        <div className="mt-4 flex flex-col gap-2">
          <Button asChild className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to="/trips" search={{ demo: "normal", dutyId }}>
              Open on Duties
            </Link>
          </Button>
          <p className="text-center text-xs text-muted">
            Acknowledge → confirm vehicle → check → clock in → then open journey
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/duties/$dutyId/run" params={{ dutyId }}>
                View route
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/duties/$dutyId/passengers" params={{ dutyId }}>
                View passengers
              </Link>
            </Button>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-vor">
            <Link to="/incidents/report">Report a problem</Link>
          </Button>
        </div>
        <PassengerNeedsSection trip={trip} />
      </>
    );
  }

  if (trip.phase === "en_route_pickup") {
    return (
      <>
        <HomeCardLabel>Journey in progress</HomeCardLabel>
        <HomeCardTitle>{trip.name}</HomeCardTitle>
        <p className="mt-1 text-sm font-medium text-link">Heading to first pickup</p>
        <dl className="mt-3 space-y-2">
          {trip.estimatedArrival && <HomeDetailRow label="Estimated arrival" value={trip.estimatedArrival} />}
          {trip.scheduledArrival && <HomeDetailRow label="Scheduled arrival" value={trip.scheduledArrival} />}
          {trip.delayLabel && <HomeDetailRow label="Current delay" value={trip.delayLabel} />}
          {trip.milesRemaining != null && (
            <HomeDetailRow label="Remaining" value={`${trip.milesRemaining} miles`} />
          )}
        </dl>
        <div className="mt-4 flex flex-col gap-2">
          <Button asChild className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to="/duties/$dutyId/nav" params={{ dutyId }}>
              Open navigation
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/duties/$dutyId/journey/delay" params={{ dutyId }}>
              Report delay
            </Link>
          </Button>
        </div>
      </>
    );
  }

  if (trip.phase === "at_pickup" && trip.activePassengerName) {
    return (
      <>
        <HomeCardLabel>
          Pickup {trip.currentPickupIndex} of {trip.totalPickups}
        </HomeCardLabel>
        <HomeCardTitle>{trip.activePassengerName}</HomeCardTitle>
        <dl className="mt-3 space-y-2">
          {trip.scheduledArrival && <HomeDetailRow label="Scheduled" value={trip.scheduledArrival} />}
          {trip.boardingRequirement && (
            <HomeDetailRow label="Boarding requirement" value={trip.boardingRequirement} />
          )}
          {trip.escortRequired && <HomeDetailRow label="Escort" value="Passenger assistant required" />}
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild className="h-12 font-bold">
            <Link to="/duties/$dutyId/nav/arrive" params={{ dutyId }}>
              Passenger onboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/duties/$dutyId/nav/arrive" params={{ dutyId }}>
              Passenger absent
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/duties/$dutyId/journey/defect" params={{ dutyId }}>
              Boarding issue
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/incidents/report">Contact operations</Link>
          </Button>
        </div>
      </>
    );
  }

  if (trip.phase === "at_destination") {
    return (
      <>
        <HomeCardLabel>Destination reached</HomeCardLabel>
        <HomeCardTitle>{trip.name}</HomeCardTitle>
        <dl className="mt-3 space-y-2">
          <HomeDetailRow label="Passengers expected" value={trip.passengersExpected ?? "—"} />
          <HomeDetailRow label="Passengers onboard" value={trip.passengersOnboard ?? "—"} />
          <HomeDetailRow label="Passengers handed over" value={trip.passengersHandedOver ?? "—"} />
        </dl>
        <div className="mt-4 flex flex-col gap-2">
          <Button asChild className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to="/duties/$dutyId/nav/dropoff" params={{ dutyId }}>
              Complete drop-off
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/duties/$dutyId/journey/end" params={{ dutyId }}>
              Complete journey
            </Link>
          </Button>
        </div>
      </>
    );
  }

  return null;
}

export function CurrentWorkCard({ summary }: { summary: DriverHomeSummary }) {
  const trip = summary.activeTrip ?? summary.nextTrip;
  if (!trip) return null;

  const mode = summary.activeTrip ? "active" : "next";

  return (
    <HomeCard tone={summary.activeTrip ? "teal" : "navy"}>
      <TripDetails trip={trip} mode={mode} />
    </HomeCard>
  );
}
