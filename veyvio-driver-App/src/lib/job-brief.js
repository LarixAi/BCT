/** Driver-safe job brief fields per job_type */

const DRIVER_BRIEF_FIELDS = {
  school_run: ["school_id", "am_pm", "safeguardingNotes", "passenger_count"],
  private_hire: ["journey_type", "passenger_count", "luggageCount", "pickup", "dropoff"],
  airport_transfer: ["flight_number", "terminal", "waiting_time_minutes", "luggage_count", "passenger_count"],
  maintenance_movement: ["garage_id", "mot_ref", "reason"],
  depot_transfer: ["from_depot_id", "to_depot_id", "reason"],
  council_contract: ["passenger_count"],
  corporate_event: ["event_name", "venue", "delegate_count", "dress_code", "multi_pickup", "passenger_count"],
  rail_replacement: ["rail_operator", "line_name", "disruption_ref", "passenger_count"],
  local_service: ["service_number", "route_reference", "frequency", "community_route", "passenger_count"],
  tour_day_trip: ["destination", "pickup_location", "return_time", "tour_guide_required", "passenger_count"],
  accessible_transport: ["wheelchair_spaces", "ramp_required", "passenger_assistant_required", "passenger_count", "wheelchair_count"],
  medical_transport: ["appointment_time", "pickup_type", "escort_required", "passenger_count"],
  empty_vehicle_movement: ["reason", "from_location", "to_location"],
};

const RESTRICTED_KEYS = new Set([
  "confidential_notes",
  "patient_notes",
  "medical_notes",
  "mobility_notes",
  "billing_reference",
  "internal_reference",
  "purchase_order_number",
  "quote_amount",
  "restricted_details",
]);

export function filterJobBriefForDriver(jobType, details = {}, jobRow = {}) {
  const allowed = new Set(DRIVER_BRIEF_FIELDS[jobType] ?? ["passenger_count"]);
  const brief = {};

  const normalized = {};
  for (const [key, value] of Object.entries(details)) {
    const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
    normalized[snake] = value;
    normalized[key] = value;
  }

  for (const [key, value] of Object.entries(normalized)) {
    if (RESTRICTED_KEYS.has(key)) continue;
    if (allowed.has(key) && value != null && value !== "") {
      brief[key] = value;
    }
  }

  if (jobRow.passenger_count != null) brief.passenger_count = jobRow.passenger_count;
  if (jobRow.wheelchair_count != null) brief.wheelchair_count = jobRow.wheelchair_count;
  if (jobRow.escort_required != null) brief.escort_required = jobRow.escort_required;
  if (jobRow.job_number) brief.job_number = jobRow.job_number;
  if (jobRow.title) brief.title = jobRow.title;
  if (jobRow.description) brief.description = jobRow.description;

  return brief;
}

export function formatBriefLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
