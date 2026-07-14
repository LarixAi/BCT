import type { DriverFacingStatus, IncidentStatus } from "./types";

const ADMIN_TO_DRIVER_STATUS: Record<IncidentStatus, DriverFacingStatus> = {
  draft: "draft",
  submitted: "submitted",
  awaiting_triage: "received_by_control",
  immediate_response: "action_being_taken",
  contained: "action_being_taken",
  under_investigation: "under_review",
  awaiting_evidence: "more_information_requested",
  awaiting_external: "under_review",
  corrective_actions_open: "action_being_taken",
  pending_final_review: "under_review",
  closed: "closed",
  reopened: "under_review",
  cancelled_duplicate: "closed",
};

export function mapAdminStatusToDriver(status: IncidentStatus): DriverFacingStatus {
  return ADMIN_TO_DRIVER_STATUS[status] ?? "under_review";
}

export const DRIVER_STATUS_LABELS: Record<DriverFacingStatus, string> = {
  draft: "Draft",
  sending: "Sending",
  submitted: "Submitted",
  received_by_control: "Received by control",
  more_information_requested: "More information requested",
  under_review: "Under review",
  action_being_taken: "Action being taken",
  closed: "Closed",
};
