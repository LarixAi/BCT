/**
 * Canonical incident category codes — stable IDs stored in the database.
 * Display labels live in DRIVER_CATEGORY_OPTIONS and admin CATEGORY_LABELS.
 */
export const INCIDENT_CATEGORY_CODES = [
  "road_collision",
  "passenger_injury",
  "driver_injury",
  "passenger_illness",
  "passenger_fall",
  "safeguarding",
  "passenger_left_on_vehicle",
  "passenger_missing",
  "vehicle_fire",
  "vehicle_breakdown",
  "equipment_failure",
  "wheelchair_restraint_failure",
  "accessibility_failure",
  "assault",
  "near_miss",
  "vehicle_damage",
  "depot_incident",
  "data_security",
  "other",
] as const;

export type IncidentCategoryCode = (typeof INCIDENT_CATEGORY_CODES)[number];

/** Driver-facing category picker — maps simple wording to canonical codes. */
export const DRIVER_CATEGORY_OPTIONS: {
  code: IncidentCategoryCode;
  label: string;
  description: string;
  critical?: boolean;
}[] = [
  { code: "road_collision", label: "I have been in a collision", description: "Contact with another vehicle, object, or person", critical: true },
  { code: "passenger_injury", label: "A passenger is injured", description: "Injury during the journey", critical: true },
  { code: "passenger_illness", label: "A passenger is unwell", description: "Illness or medical concern", critical: true },
  { code: "passenger_missing", label: "I cannot find a passenger", description: "Missing or unaccounted for", critical: true },
  { code: "passenger_left_on_vehicle", label: "A passenger was left onboard", description: "Passenger not collected at drop-off", critical: true },
  { code: "safeguarding", label: "Safeguarding concern", description: "Welfare or safety concern about a passenger", critical: true },
  { code: "vehicle_breakdown", label: "The vehicle has broken down", description: "Mechanical failure preventing continuation" },
  { code: "wheelchair_restraint_failure", label: "Wheelchair equipment failed", description: "Ramp, restraint, or accessibility equipment" },
  { code: "vehicle_fire", label: "Fire or smoke", description: "Fire, smoke, or burning smell", critical: true },
  { code: "driver_injury", label: "I am injured", description: "Driver injury during duty", critical: true },
  { code: "assault", label: "Unsafe behaviour or threat", description: "Assault, abuse, or threatening behaviour", critical: true },
  { code: "near_miss", label: "Something nearly happened", description: "Near miss — no injury or damage yet" },
  { code: "vehicle_damage", label: "Vehicle damage", description: "Damage without a collision event" },
  { code: "equipment_failure", label: "Equipment failure", description: "Non-wheelchair equipment problem" },
  { code: "data_security", label: "Data or privacy concern", description: "Lost device, data breach, or privacy issue" },
  { code: "other", label: "Something else", description: "Another operational incident" },
];

export function categoryLabel(code: IncidentCategoryCode): string {
  return DRIVER_CATEGORY_OPTIONS.find((o) => o.code === code)?.label ?? code.replace(/_/g, " ");
}

export function isSafeguardingCategory(code: IncidentCategoryCode): boolean {
  return code === "safeguarding" || code === "passenger_missing" || code === "passenger_left_on_vehicle";
}
