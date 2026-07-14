import type { DriverAssignment } from "@/types/trips";
import type { TripsPageState } from "@/types/trips";
import type { CheckHistoryFilter, TripsTodayFilter } from "@/types/driver-filters";

export function matchesTripsAssignmentFilter(
  assignment: DriverAssignment,
  filter: TripsPageState["completedFilter"] | TripsTodayFilter,
): boolean {
  switch (filter) {
    case "school_runs":
      return assignment.assignmentType === "school_run";
    case "passenger":
      return assignment.assignmentType === "single_trip";
    case "movements":
      return assignment.assignmentType === "vehicle_movement";
    case "incidents":
      return Boolean(assignment.hadIncident);
    case "all":
    case "7d":
    case "30d":
    default:
      return true;
  }
}

export function matchesCheckHistoryFilter(
  result: "nil_defects" | "defects_reported" | string,
  filter: CheckHistoryFilter,
): boolean {
  switch (filter) {
    case "nil_defects":
      return result === "nil_defects";
    case "defects":
      return result !== "nil_defects";
    default:
      return true;
  }
}
