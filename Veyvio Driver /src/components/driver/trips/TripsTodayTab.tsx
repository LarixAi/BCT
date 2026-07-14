import {
  ActiveTripCard,
  CompactTripCard,
  NextTripCard,
  TripAssignmentCard,
} from "./TripAssignmentCard";
import { OperationalAlertCard } from "./OperationalAlertCard";
import { FilterChipBar } from "@/components/driver/shared/FilterChipBar";
import {
  findActiveAssignment,
  findNextAssignment,
  scheduleAssignmentsExcluding,
} from "@/domain/trips/trip-helpers";
import { matchesTripsAssignmentFilter } from "@/domain/driver/assignment-filters";
import { TRIPS_TODAY_FILTERS, type TripsTodayFilter } from "@/types/driver-filters";
import type { DriverAssignment, OperationalAlert } from "@/types/trips";

export function TripsTodayTab({
  alerts,
  assignments,
  filter,
  onFilterChange,
}: {
  alerts: OperationalAlert[];
  assignments: DriverAssignment[];
  filter: TripsTodayFilter;
  onFilterChange: (filter: TripsTodayFilter) => void;
}) {
  const filteredAssignments = assignments.filter((assignment) =>
    matchesTripsAssignmentFilter(assignment, filter),
  );

  const active = findActiveAssignment(filteredAssignments);
  const next = active ? undefined : findNextAssignment(filteredAssignments);
  const schedule = scheduleAssignmentsExcluding(filteredAssignments, active?.id, next?.id);

  const upcoming = schedule.filter((a) => a.status !== "completed" && a.status !== "cancelled");
  const completed = schedule.filter((a) => a.status === "completed" || a.status === "cancelled");

  return (
    <div className="space-y-4">
      <FilterChipBar
        label="Today's trip filters"
        size="sm"
        options={TRIPS_TODAY_FILTERS}
        active={filter}
        onChange={onFilterChange}
      />

      {alerts.map((alert) => (
        <OperationalAlertCard key={alert.id} alert={alert} />
      ))}

      {active && <ActiveTripCard assignment={active} />}

      {!active && next && <NextTripCard assignment={next} />}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Today&apos;s schedule</h2>
          {upcoming.map((assignment) => (
            <TripAssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Completed today</h2>
          {completed.map((assignment) => (
            <CompactTripCard key={assignment.id} assignment={assignment} />
          ))}
        </section>
      )}

      {filteredAssignments.length === 0 && alerts.length === 0 && (
        <p className="text-sm text-muted">No assignments match this filter for today.</p>
      )}
    </div>
  );
}
