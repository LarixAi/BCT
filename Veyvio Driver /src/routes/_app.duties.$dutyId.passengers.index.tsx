import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { getPassengerProfile, uniquePassengerIdsFromDuty } from "@/domain/passenger/passenger-profiles";
import { PassengerProfileCard } from "@/components/driver/passengers/PassengerProfileCard";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/passengers/")({
  head: () => ({ meta: [{ title: "Passengers — Veyvio Driver" }] }),
  component: PassengersPage,
});

function PassengersPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  const passengerIds = useMemo(
    () => (duty ? uniquePassengerIdsFromDuty(duty.runs) : []),
    [duty],
  );

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <h1 className="font-display text-xl font-extrabold tracking-tight">Passengers on this journey</h1>
        <p className="mt-1 text-sm text-muted">
          Review accessibility and assistance needs before each pickup.
        </p>
      </header>

      <HomeCard tone="teal">
        <p className="text-sm font-semibold">Passenger-centred journeys</p>
        <p className="mt-2 text-sm text-muted">
          Each person may need different communication, boarding help, or handover arrangements. Open a passenger profile before you arrive.
        </p>
        <Link to="/more/training" className="mt-3 inline-block text-sm font-bold text-link">
          Open passenger-centred training
        </Link>
      </HomeCard>

      <div className="space-y-2">
        {passengerIds.length === 0 && (
          <p className="text-sm text-muted">No passenger profiles linked to this duty yet.</p>
        )}
        {passengerIds.map((passengerId) => {
          const profile = getPassengerProfile(passengerId);
          if (!profile) {
            return (
              <div key={passengerId} className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
                Passenger record not available
              </div>
            );
          }

          return (
            <Link
              key={passengerId}
              to="/duties/$dutyId/passengers/$passengerId"
              params={{ dutyId, passengerId }}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/40"
            >
              <PassengerProfileCard profile={profile} compact className="border-0 bg-transparent p-0" />
              <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
