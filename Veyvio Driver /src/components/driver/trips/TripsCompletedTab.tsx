import { Link } from "@tanstack/react-router";
import { TripAssignmentCard } from "./TripAssignmentCard";
import { FilterChipBar } from "@/components/driver/shared/FilterChipBar";
import { formatUpcomingDateHeader } from "@/domain/trips/trip-helpers";
import { matchesTripsAssignmentFilter } from "@/domain/driver/assignment-filters";
import type { DriverAssignment } from "@/types/trips";
import type { TripsPageState } from "@/types/trips";

const filters: { id: TripsPageState["completedFilter"]; label: string }[] = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "school_runs", label: "School runs" },
  { id: "passenger", label: "Passenger trips" },
  { id: "movements", label: "Vehicle movements" },
  { id: "incidents", label: "With incidents" },
];

export function TripsCompletedTab({
  grouped,
  filter,
  onFilterChange,
}: {
  grouped: Record<string, DriverAssignment[]>;
  filter: TripsPageState["completedFilter"];
  onFilterChange: (filter: TripsPageState["completedFilter"]) => void;
}) {
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div className="space-y-4">
      <FilterChipBar
        label="Completed trip filters"
        size="sm"
        options={filters}
        active={filter}
        onChange={onFilterChange}
      />

      {dates.length === 0 ? (
        <p className="text-sm text-muted">No completed assignments.</p>
      ) : (
        dates.map((date) => {
          const items = (grouped[date] ?? []).filter((a) => matchesTripsAssignmentFilter(a, filter));
          if (items.length === 0) return null;
          return (
            <section key={date} className="space-y-3">
              <h2 className="text-xs font-bold tracking-wide text-muted">
                {formatUpcomingDateHeader(date)}
              </h2>
              {items.map((assignment) => (
                <article key={assignment.id} className="space-y-2">
                  <TripAssignmentCard assignment={assignment} variant="compact" />
                  <div className="flex flex-wrap gap-2 px-1 text-xs text-muted">
                    {assignment.actualStart && assignment.actualEnd && (
                      <span>
                        Actual: {assignment.actualStart}–{assignment.actualEnd}
                      </span>
                    )}
                    {assignment.delayLabel && <span className="text-warn">{assignment.delayLabel}</span>}
                    {assignment.hadIncident && <span className="text-vor">Incident reported</span>}
                    {assignment.debriefRequired && !assignment.debriefCompleted && (
                      <span className="text-warn">Debrief required</span>
                    )}
                  </div>
                  <Link
                    to={`/trips/history/${assignment.id}`}
                    className="text-xs font-semibold text-link"
                  >
                    View record
                  </Link>
                </article>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
