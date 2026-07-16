import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { getPassengerProfile, uniquePassengerIdsFromDuty } from "@/domain/passenger/passenger-profiles";
import { PassengerProfileCard } from "@/components/driver/passengers/PassengerProfileCard";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/passengers/")({
  head: () => ({ meta: [{ title: "Passengers — Veyvio Driver" }] }),
  component: PassengersPage,
});

function PassengersPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  const passengerIds = useMemo(
    () => (duty ? uniquePassengerIdsFromDuty(duty.runs) : []),
    [duty],
  );

  return (
    <FocusedPageShell
      title="Passengers on this journey"
      backLabel="Duties"
      onBack={() =>
        void navigate({ to: "/trips", search: { demo: "normal", dutyId } })
      }
      eyebrow="Before departure"
      subtitle="Review accessibility and assistance needs before each pickup."
    >
      <div className="animate-in-up space-y-4">
        <section className="rounded-[14px] border border-[rgba(47,107,255,0.18)] bg-[rgba(239,246,255,0.96)] p-4">
          <p className="text-sm font-extrabold">Passenger-centred journeys</p>
          <p className="mt-2 text-sm leading-snug text-muted">
            Each person may need different communication, boarding help, or handover arrangements.
            Open a passenger profile before you arrive.
          </p>
          <Link to="/more/training" className="mt-3 inline-block text-sm font-bold text-link">
            Open passenger-centred training
          </Link>
        </section>

        <div className="space-y-2">
          {passengerIds.length === 0 ? (
            <p className="text-sm text-muted">No passenger profiles linked to this duty yet.</p>
          ) : null}
          {passengerIds.map((passengerId) => {
            const profile = getPassengerProfile(passengerId);
            if (!profile) {
              return (
                <div
                  key={passengerId}
                  className="rounded-[14px] border border-border bg-background p-4 text-sm text-muted"
                >
                  Passenger record not available
                </div>
              );
            }

            return (
              <Link
                key={passengerId}
                to="/duties/$dutyId/passengers/$passengerId"
                params={{ dutyId, passengerId }}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-background p-4 transition-colors hover:bg-secondary/40"
              >
                <PassengerProfileCard profile={profile} compact className="border-0 bg-transparent p-0" />
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            );
          })}
        </div>
      </div>
    </FocusedPageShell>
  );
}
