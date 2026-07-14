import { TripAssignmentCard } from "./TripAssignmentCard";
import { formatUpcomingDateHeader } from "@/domain/trips/trip-helpers";
import type { DriverAssignment } from "@/types/trips";

export function TripsUpcomingTab({ grouped }: { grouped: Record<string, DriverAssignment[]> }) {
  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    return <p className="text-sm text-muted">No upcoming assignments.</p>;
  }

  return (
    <div className="space-y-6">
      {dates.map((date) => {
        const items = grouped[date] ?? [];
        return (
          <section key={date} className="space-y-3">
            <header>
              <h2 className="text-xs font-bold tracking-wide text-muted">
                {formatUpcomingDateHeader(date)}
              </h2>
              <p className="text-sm text-muted">
                {items.length} assignment{items.length === 1 ? "" : "s"}
              </p>
            </header>
            {items.map((assignment) => (
              <TripAssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
