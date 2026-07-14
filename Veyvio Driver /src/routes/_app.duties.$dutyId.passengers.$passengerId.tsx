import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPassengerProfile } from "@/domain/passenger/passenger-profiles";
import { PassengerProfileCard } from "@/components/driver/passengers/PassengerProfileCard";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/passengers/$passengerId")({
  head: () => ({ meta: [{ title: "Passenger — Veyvio Driver" }] }),
  component: PassengerDetailPage,
});

function PassengerDetailPage() {
  const { dutyId, passengerId } = Route.useParams();
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
      <div className="space-y-4">
        <Link to="/duties/$dutyId/passengers" params={{ dutyId }} className="text-sm text-link">
          ‹ Passengers
        </Link>
        <p className="text-sm text-muted">Passenger profile not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-in-up space-y-4 pb-8">
      <header>
        <Link to="/duties/$dutyId/passengers" params={{ dutyId }} className="text-sm text-link">
          ‹ Passengers
        </Link>
        <h1 className="mt-2 font-display text-xl font-extrabold tracking-tight">{profile.displayName}</h1>
        <p className="text-sm text-muted">{duty?.routeName ?? "Today's journey"}</p>
      </header>

      <PassengerProfileCard profile={profile} />

      {tasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">On this duty</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {tasks.map((task) => (
              <div key={task.id} className="px-4 py-3 text-sm">
                <p className="font-medium capitalize">{task.type}</p>
                <p className="text-muted">{task.plannedTime ?? "Time TBC"} · {task.status.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted">
        Training perspectives and barriers modules live in the Training Hub — not on live passenger cards.
      </p>
      <Link to="/more/training" className="inline-block text-sm font-bold text-link">
        Open Training Hub
      </Link>
    </div>
  );
}
