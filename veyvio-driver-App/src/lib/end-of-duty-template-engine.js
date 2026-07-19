/**
 * End-of-duty closeout checklist — separate from daily pre-use walkaround.
 * Covers vehicle condition after duty, passenger/cabin sweep, safeguarding, and closeout.
 */

function eodItem({
  id,
  sectionKey,
  category,
  questionTitle,
  guidance,
  sortOrder,
  requiresPhotoOnFail = false,
  autoBlockOnFail = false,
  defaultSeverity = "minor",
  when,
  isBodyworkDamage = false,
}) {
  return {
    id,
    sectionKey,
    category,
    questionTitle,
    guidance: guidance ?? [],
    sortOrder,
    requiresPhotoOnFail,
    autoBlockOnFail,
    defaultSeverity,
    addon: "end_of_duty",
    when,
    isBodyworkDamage,
  };
}

export const END_OF_DUTY_SECTION_LABELS = {
  vehicle_after_duty: "Vehicle condition after duty",
  passenger_cabin: "Passenger and cabin check",
  safeguarding: "Incidents and safeguarding",
  working_time: "Working time closeout",
};

export const END_OF_DUTY_DECLARATION =
  "I confirm I have completed the end of duty check, checked the vehicle and passenger area, reported all known defects/incidents/lost property, and recorded my working time accurately.";

const VEHICLE_AFTER_DUTY_ITEMS = [
  eodItem({ id: "eod_warning_lights", sectionKey: "vehicle_after_duty", category: "driver_cab", questionTitle: "Any new dashboard warning lights appeared during duty?", guidance: ["Report any new warnings since pre-use check"], sortOrder: 1, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  eodItem({ id: "eod_tyres_wheels", sectionKey: "vehicle_after_duty", category: "outside_vehicle", questionTitle: "Tyres and wheels — no new damage, puncture, or missing wheel nuts", guidance: ["Visual check of all tyres", "Wheel nuts secure"], sortOrder: 2, requiresPhotoOnFail: true, defaultSeverity: "major" }),
  eodItem({ id: "eod_lights", sectionKey: "vehicle_after_duty", category: "outside_vehicle", questionTitle: "Lights still working — headlights, indicators, brake lights, hazards", guidance: ["All required lights operational"], sortOrder: 3, defaultSeverity: "major" }),
  eodItem({ id: "eod_mirrors_glass", sectionKey: "vehicle_after_duty", category: "driver_cab", questionTitle: "Mirrors and glass — no new cracks or visibility issues", guidance: ["Clear visibility for next duty"], sortOrder: 4, defaultSeverity: "major" }),
  eodItem({ id: "eod_wipers", sectionKey: "vehicle_after_duty", category: "driver_cab", questionTitle: "Wipers and screenwash still working", guidance: ["No visibility problem"], sortOrder: 5, defaultSeverity: "minor" }),
  eodItem({ id: "eod_brakes_steering", sectionKey: "vehicle_after_duty", category: "driver_cab", questionTitle: "Brakes and steering — no unusual noise, pulling, or weak braking", guidance: ["Report any change during duty"], sortOrder: 6, autoBlockOnFail: true, defaultSeverity: "critical" }),
  eodItem({
    id: "eod_body_damage",
    sectionKey: "vehicle_after_duty",
    category: "outside_vehicle",
    questionTitle: "Is there any new bodywork damage from this duty?",
    guidance: [
      "Walk around for scrapes, dents or collision damage",
      "If yes — photograph it. Yard and Admin will see the report",
    ],
    sortOrder: 7,
    requiresPhotoOnFail: true,
    defaultSeverity: "major",
    isBodyworkDamage: true,
  }),
  eodItem({ id: "eod_fluid_leaks", sectionKey: "vehicle_after_duty", category: "outside_vehicle", questionTitle: "No fluid leaks — oil, coolant, fuel, AdBlue, brake fluid", guidance: ["Check under vehicle"], sortOrder: 8, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "major" }),
  eodItem({ id: "eod_fuel_charge", sectionKey: "vehicle_after_duty", category: "outside_vehicle", questionTitle: "Fuel or charge level recorded — enough for next duty or needs refuelling", guidance: ["Note if vehicle needs fuel/charge before next use"], sortOrder: 9, defaultSeverity: "minor" }),
  eodItem({ id: "eod_cleanliness", sectionKey: "vehicle_after_duty", category: "passenger_area", questionTitle: "Vehicle left clean enough for next duty", guidance: ["Cab and passenger area acceptable"], sortOrder: 10, defaultSeverity: "minor" }),
];

const PASSENGER_CABIN_ITEMS = [
  eodItem({ id: "eod_no_passengers", sectionKey: "passenger_cabin", category: "passenger_area", questionTitle: "No passengers left onboard — seats, rear rows, wheelchair area checked", guidance: ["Physically check all seating areas"], sortOrder: 20, autoBlockOnFail: true, defaultSeverity: "critical" }),
  eodItem({ id: "eod_seatbelts", sectionKey: "passenger_cabin", category: "passenger_area", questionTitle: "Seatbelts checked — not damaged, trapped, or missing", guidance: ["All belts stowed correctly"], sortOrder: 21, defaultSeverity: "major" }),
  eodItem({ id: "eod_wheelchair_restraints", sectionKey: "passenger_cabin", category: "accessibility", questionTitle: "Wheelchair restraints stored safely, no damage", guidance: ["Clamps and belts secure"], sortOrder: 22, when: (p) => p.hasAccessibilityEquipment, defaultSeverity: "major" }),
  eodItem({ id: "eod_child_seats", sectionKey: "passenger_cabin", category: "passenger_area", questionTitle: "Child seats / booster equipment present and not left loose", guidance: ["Equipment secured"], sortOrder: 23, when: (p) => p.usedForSchoolTransport, defaultSeverity: "major" }),
  eodItem({ id: "eod_interior_damage", sectionKey: "passenger_cabin", category: "passenger_area", questionTitle: "No interior damage — broken seats, sharp edges, vandalism", guidance: ["Report any new damage"], sortOrder: 24, requiresPhotoOnFail: true, defaultSeverity: "major" }),
  eodItem({ id: "eod_spills", sectionKey: "passenger_cabin", category: "passenger_area", questionTitle: "No spills or biohazards — vomit, blood, food contamination", guidance: ["Report and photograph if present"], sortOrder: 25, requiresPhotoOnFail: true, defaultSeverity: "major" }),
  eodItem({ id: "eod_lost_property", sectionKey: "passenger_cabin", category: "passenger_area", questionTitle: "Lost property sweep — no bags, phones, medication, school items left", guidance: ["Log any items found via lost property"], sortOrder: 26, defaultSeverity: "major" }),
  eodItem({ id: "eod_doors_exits", sectionKey: "passenger_cabin", category: "passenger_area", questionTitle: "Doors and emergency exits clear, working, not blocked", guidance: ["All exits secure"], sortOrder: 27, defaultSeverity: "major" }),
];

const SAFEGUARDING_ITEMS = [
  eodItem({ id: "eod_collision", sectionKey: "safeguarding", category: "safeguarding", questionTitle: "No collision or near miss during this duty", guidance: ["Report via Incidents if occurred"], sortOrder: 40, defaultSeverity: "critical" }),
  eodItem({ id: "eod_passenger_unwell", sectionKey: "safeguarding", category: "safeguarding", questionTitle: "No passenger injured or unwell requiring follow-up", guidance: ["Report safeguarding concerns immediately"], sortOrder: 41, defaultSeverity: "critical" }),
  eodItem({ id: "eod_aggressive", sectionKey: "safeguarding", category: "safeguarding", questionTitle: "No aggressive behaviour requiring report", guidance: ["Report if incident occurred"], sortOrder: 42, defaultSeverity: "major" }),
  eodItem({ id: "eod_missed_passenger", sectionKey: "safeguarding", category: "safeguarding", questionTitle: "No child/passenger missed collection or incorrect drop-off", guidance: ["Critical safeguarding — report immediately if yes"], sortOrder: 43, autoBlockOnFail: true, defaultSeverity: "critical" }),
  eodItem({ id: "eod_route_changed", sectionKey: "safeguarding", category: "safeguarding", questionTitle: "Route completed as planned (or changes reported to dispatch)", guidance: ["Note any deviations"], sortOrder: 44, defaultSeverity: "minor" }),
];

const WORKING_TIME_ITEMS = [
  eodItem({ id: "eod_driving_complete", sectionKey: "working_time", category: "working_time", questionTitle: "Driving time for this duty is complete and recorded", guidance: ["Tachograph/manual entry done if required"], sortOrder: 50, defaultSeverity: "minor" }),
  eodItem({ id: "eod_breaks_taken", sectionKey: "working_time", category: "working_time", questionTitle: "Breaks and rest periods taken are recorded on My Duty", guidance: ["Check timeline is accurate"], sortOrder: 51, defaultSeverity: "minor" }),
  eodItem({ id: "eod_fit_to_continue", sectionKey: "working_time", category: "working_time", questionTitle: "I am fit to continue working if I have more duties today", guidance: ["Report fatigue concerns to dispatch"], sortOrder: 52, defaultSeverity: "minor" }),
];

export function buildEndOfDutyChecklist(profile) {
  const pool = [
    ...VEHICLE_AFTER_DUTY_ITEMS,
    ...PASSENGER_CABIN_ITEMS,
    ...SAFEGUARDING_ITEMS,
    ...WORKING_TIME_ITEMS,
  ];

  const items = pool
    .filter((entry) => !entry.when || entry.when(profile))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry, index) => ({ ...entry, stepNumber: index + 1 }));

  return {
    items,
    templateLabel: "End of Duty Closeout Check",
    addons: ["end_of_duty"],
    totalSteps: items.length,
  };
}

export function getEndOfDutySectionLabel(sectionKey) {
  return END_OF_DUTY_SECTION_LABELS[sectionKey] ?? sectionKey.replace(/_/g, " ");
}
