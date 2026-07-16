import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPassengerProfile } from "@/domain/passenger/passenger-profiles";
import { PassengerProfileCard } from "@/components/driver/passengers/PassengerProfileCard";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/passengers/$passengerId")({
  head: () => ({ meta: [{ title: "Passenger — Veyvio Driver" }] }),
  component: PassengerDetailPage,
});

function PassengerDetailPage() {
  const { dutyId, passengerId } = Route.useParams();
  const navigate = useNavigate();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const profile = getPassengerProfile(passengerId);

  useEffect(() => {
    void loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  const tasks =
    duty?.runs.flatMap((run) =>
      run.stops.flatMap((stop) => stop.passengerTasks.filter((task) => task.passengerId === passengerId)),
    ) ?? [];

  if (!profile) {
    return (
      <FocusedPageShell
        title="Passenger"
        backLabel="Passengers"
        onBack={() =>
          void navigate({ to: "/duties/$dutyId/passengers", params: { dutyId } })
        }
      >
        <p className="text-sm text-muted">Passenger profile not found.</p>
      </FocusedPageShell>
    );
  }

  return (
    <FocusedPageShell
      title={profile.displayName}
      backLabel="Passengers"
      onBack={() =>
        void navigate({ to: "/duties/$dutyId/passengers", params: { dutyId } })
      }
      eyebrow="Passenger profile"
      subtitle={duty?.routeName ?? "Today's journey"}
    >
      <div className="animate-in-up space-y-4 pb-8">
        <PassengerProfileCard profile={profile} />

        {tasks.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              On this duty
            </h2>
            <div className="divide-y divide-border rounded-[14px] border border-border bg-background">
              {tasks.map((task) => (
                <div key={task.id} className="px-4 py-3 text-sm">
                  <p className="font-medium capitalize">{task.type}</p>
                  <p className="text-muted">
                    {task.plannedTime ?? "Time TBC"} · {task.status.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs text-muted">
          Training perspectives and barriers modules live in the Training Hub — not on live passenger
          cards.
        </p>
        <Link to="/more/training" className="inline-block text-sm font-bold text-link">
          Open Training Hub
        </Link>
      </div>
    </FocusedPageShell>
  );
}
