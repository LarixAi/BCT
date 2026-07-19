/** Category labels aligned with admin vehicle_check_template_items. */
export const CHECK_CATEGORY_LABELS = {
  outside_vehicle: "Outside vehicle",
  driver_cab: "Driver cab",
  passenger_area: "Passenger area",
  safety_equipment: "Safety equipment",
  accessibility: "Accessibility equipment",
  final_declaration: "Final declaration",
};

export const CHECK_CATEGORY_ORDER = [
  "outside_vehicle",
  "driver_cab",
  "passenger_area",
  "safety_equipment",
  "accessibility",
  "final_declaration",
];

/** Fallback when org template is missing — mirrors seeded PSV Daily Walkaround v2.1. */
export const FALLBACK_WALKAROUND_ITEMS = [
  { id: "outside_registration", category: "outside_vehicle", questionTitle: "Registration plate legible", sortOrder: 1, requiresPhotoOnFail: false, autoBlockOnFail: false, defaultSeverity: "minor" },
  {
    id: "outside_bodywork",
    category: "outside_vehicle",
    questionTitle: "Is there any bodywork damage?",
    sortOrder: 2,
    requiresPhotoOnFail: true,
    autoBlockOnFail: false,
    defaultSeverity: "major",
    isBodyworkDamage: true,
  },
  { id: "outside_mirrors", category: "outside_vehicle", questionTitle: "Mirrors — condition and adjustment", sortOrder: 3, requiresPhotoOnFail: true, autoBlockOnFail: false, defaultSeverity: "major" },
  { id: "outside_windscreen", category: "outside_vehicle", questionTitle: "Windscreen and wipers", sortOrder: 4, requiresPhotoOnFail: true, autoBlockOnFail: false, defaultSeverity: "major" },
  { id: "outside_tyres", category: "outside_vehicle", questionTitle: "Tyres — condition and tread", sortOrder: 5, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" },
  { id: "outside_lights", category: "outside_vehicle", questionTitle: "Headlights and indicators", sortOrder: 6, requiresPhotoOnFail: true, autoBlockOnFail: false, defaultSeverity: "major" },
  { id: "outside_fluid_leaks", category: "outside_vehicle", questionTitle: "Fluid leaks underneath vehicle", sortOrder: 7, requiresPhotoOnFail: true, autoBlockOnFail: false, defaultSeverity: "major" },
  { id: "cab_horn", category: "driver_cab", questionTitle: "Horn working", sortOrder: 8, requiresPhotoOnFail: false, autoBlockOnFail: false, defaultSeverity: "major" },
  { id: "cab_steering", category: "driver_cab", questionTitle: "Steering — no excessive play", sortOrder: 9, requiresPhotoOnFail: false, autoBlockOnFail: true, defaultSeverity: "critical" },
  { id: "outside_brake_lights", category: "outside_vehicle", questionTitle: "Brake lights working", sortOrder: 10, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" },
  { id: "cab_dashboard", category: "driver_cab", questionTitle: "Dashboard warning lights", sortOrder: 11, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" },
  { id: "cab_brakes", category: "driver_cab", questionTitle: "Brakes — foot and parking brake", sortOrder: 12, requiresPhotoOnFail: false, autoBlockOnFail: true, defaultSeverity: "critical" },
  { id: "cab_seatbelt", category: "driver_cab", questionTitle: "Seatbelt and driver card/tachograph", sortOrder: 13, requiresPhotoOnFail: false, autoBlockOnFail: false, defaultSeverity: "major" },
  { id: "passenger_seats", category: "passenger_area", questionTitle: "Seats secure and in good condition", sortOrder: 14, requiresPhotoOnFail: true, autoBlockOnFail: false, defaultSeverity: "major" },
  { id: "passenger_doors", category: "passenger_area", questionTitle: "Doors and emergency exits", sortOrder: 15, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" },
  { id: "passenger_cleanliness", category: "passenger_area", questionTitle: "Interior cleanliness and child safety", sortOrder: 16, requiresPhotoOnFail: false, autoBlockOnFail: false, defaultSeverity: "minor" },
  { id: "safety_first_aid", category: "safety_equipment", questionTitle: "First aid kit and fire extinguisher", sortOrder: 17, requiresPhotoOnFail: false, autoBlockOnFail: false, defaultSeverity: "major" },
  { id: "accessibility_ramp", category: "accessibility", questionTitle: "Wheelchair lift/ramp (if fitted)", sortOrder: 18, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" },
  { id: "passenger_lights", category: "passenger_area", questionTitle: "Interior lights", sortOrder: 19, requiresPhotoOnFail: false, autoBlockOnFail: false, defaultSeverity: "minor" },
];

export const DRIVER_CHECK_DECLARATION =
  "I confirm I have completed this vehicle check truthfully before using the vehicle and have reported all defects I am aware of.";

/** Items the driver must answer (excludes declaration row). */
export function getChecklistItems(items, { wheelchairAccessible = false } = {}) {
  return (items ?? [])
    .filter((item) => item.category !== "final_declaration")
    .filter((item) => {
      if (item.category === "accessibility" && !wheelchairAccessible) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function groupItemsByCategory(items) {
  return CHECK_CATEGORY_ORDER.map((category) => ({
    category,
    label: CHECK_CATEGORY_LABELS[category] ?? category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

export function deriveCheckResult(responses) {
  const hasFail = responses.some((r) => r.responseStatus === "fail");
  if (hasFail) return "failed";
  const answered = responses.filter((r) => r.category !== "final_declaration");
  const allPassOrNa = answered.every((r) => r.responseStatus === "pass" || r.responseStatus === "na");
  if (allPassOrNa && answered.length > 0) return "nil_defect";
  return "passed";
}

export function mapSeverityToDefect(severity) {
  if (severity === "critical") return "critical";
  if (severity === "major") return "major";
  if (severity === "minor") return "minor";
  return "minor";
}

export function mapCategoryToDefect(category) {
  if (category === "accessibility") return "accessibility";
  if (category === "outside_vehicle") return "body";
  if (category === "driver_cab") return "interior";
  if (category === "passenger_area") return "interior";
  if (category === "safety_equipment") return "other";
  return "other";
}
