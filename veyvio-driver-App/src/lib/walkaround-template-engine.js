/**
 * Dynamic PSV walkaround template engine.
 * Builds checklist from vehicle profile: Core PSV + vehicle-type add-ons.
 */

const SECTION_LABELS = {
  driver_seat: "Driver seat checks",
  inside_passenger: "Inside passenger area",
  outside_vehicle: "Outside vehicle",
  safety_equipment: "Safety equipment",
  fuel_systems: "Fuel / battery / specialist",
  accessibility: "Accessibility equipment",
  school_transport: "School transport",
  minibus: "Minibus",
  single_deck_bus: "Single-deck bus",
  double_deck_bus: "Double-deck bus",
  coach: "Coach",
  ev_hybrid: "EV / hybrid (visual only)",
};

function item({
  id,
  sectionKey,
  category,
  questionTitle,
  guidance,
  sortOrder,
  requiresPhotoOnFail = false,
  autoBlockOnFail = false,
  defaultSeverity = "minor",
  addon = "core",
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
    addon,
    when,
    isBodyworkDamage,
  };
}

export const BODYWORK_DAMAGE_ITEM_IDS = new Set(["core_body_exterior", "outside_bodywork", "eod_body_damage"]);

export function isBodyworkDamageItem(itemOrId) {
  if (!itemOrId) return false;
  if (typeof itemOrId === "string") return BODYWORK_DAMAGE_ITEM_IDS.has(itemOrId);
  return Boolean(itemOrId.isBodyworkDamage) || BODYWORK_DAMAGE_ITEM_IDS.has(itemOrId.id);
}

/** Core PSV walkaround — applies to every PSV vehicle (GOV.UK aligned). */
export const CORE_PSV_ITEMS = [
  item({ id: "core_mirrors_glass", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Mirrors, cameras, glass and visibility", guidance: ["Mirrors clean and correctly adjusted", "Cameras working if fitted", "Glass not cracked or obscured"], sortOrder: 1, requiresPhotoOnFail: true, defaultSeverity: "major" }),
  item({ id: "core_wipers_washers", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Windscreen wipers and washers", guidance: ["Wipers clear the screen", "Washers spray correctly"], sortOrder: 2, defaultSeverity: "major" }),
  item({ id: "core_dashboard_warnings", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Dashboard warning lamps and gauges", guidance: ["No unexpected warning lights", "Gauges reading normally"], sortOrder: 3, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "core_steering", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Steering and steering column", guidance: ["No excessive play", "Steering feels normal"], sortOrder: 4, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "core_horn", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Horn", guidance: ["Horn works when pressed"], sortOrder: 5, defaultSeverity: "major" }),
  item({ id: "core_brake_air", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Brake and air build-up", guidance: ["Air builds up correctly", "Warning system works", "No air leaks", "Service brake works", "Parking brake works"], sortOrder: 6, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "core_height_marker", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Height marker, if required", guidance: ["Correct height shown", "Clearly visible"], sortOrder: 7, when: (p) => p.needsHeightMarker, defaultSeverity: "major" }),
  item({ id: "core_ticket_machine", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Ticket machine, if fitted", guidance: ["Machine operational or N/A"], sortOrder: 8, when: (p) => p.hasTicketMachine, defaultSeverity: "minor" }),
  item({ id: "core_driver_seatbelt", sectionKey: "driver_seat", category: "driver_cab", questionTitle: "Driver seat belt and cab condition", guidance: ["Seat belt works", "Cab safe and clear"], sortOrder: 9, defaultSeverity: "major" }),
  item({ id: "core_doors_exits", sectionKey: "inside_passenger", category: "passenger_area", questionTitle: "Passenger doors and emergency exits", guidance: ["Doors open/close securely", "Emergency exits clear"], sortOrder: 10, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "core_accessibility_if_fitted", sectionKey: "accessibility", category: "accessibility", questionTitle: "Accessibility equipment, if fitted", guidance: ["Ramp/lift/restraints checked if present"], sortOrder: 11, when: (p) => p.hasAccessibilityEquipment, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical", addon: "accessible" }),
  item({ id: "core_passenger_seats", sectionKey: "inside_passenger", category: "passenger_area", questionTitle: "Passenger seats and seatbelts", guidance: ["Seats secure", "Seatbelts present and working"], sortOrder: 12, requiresPhotoOnFail: true, defaultSeverity: "major" }),
  item({ id: "core_bells_signs", sectionKey: "inside_passenger", category: "passenger_area", questionTitle: "Bell pushes, stop signs and destination signs", guidance: ["Stop bells work", "Signs visible and correct"], sortOrder: 13, when: (p) => p.hasStopBells || p.hasDestinationDisplay, defaultSeverity: "minor" }),
  item({ id: "core_hvac", sectionKey: "inside_passenger", category: "passenger_area", questionTitle: "Heating, ventilation and demister", guidance: ["Demister clears screen", "Passenger heating/ventilation OK"], sortOrder: 14, defaultSeverity: "minor" }),
  item({ id: "core_emergency_hammer", sectionKey: "safety_equipment", category: "safety_equipment", questionTitle: "Emergency exit hammer, if required", guidance: ["Present and secure"], sortOrder: 15, defaultSeverity: "major" }),
  item({ id: "core_fire_extinguisher", sectionKey: "safety_equipment", category: "safety_equipment", questionTitle: "Fire extinguisher", guidance: ["Present, in date, secure"], sortOrder: 16, defaultSeverity: "major" }),
  item({ id: "core_first_aid", sectionKey: "safety_equipment", category: "safety_equipment", questionTitle: "First aid kit, if required", guidance: ["Present and stocked"], sortOrder: 17, defaultSeverity: "major" }),
  item({ id: "core_interior_body", sectionKey: "inside_passenger", category: "passenger_area", questionTitle: "Body interior, floors, steps, grab rails and lighting", guidance: ["No trip hazards", "Grab rails secure", "Interior lights work"], sortOrder: 18, defaultSeverity: "minor" }),
  item({ id: "core_tyres", sectionKey: "outside_vehicle", category: "outside_vehicle", questionTitle: "Tyres, wheels, tread and wheel nuts", guidance: ["Legal tread depth", "No cuts or bulges", "Wheel nuts secure"], sortOrder: 19, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "core_lights", sectionKey: "outside_vehicle", category: "outside_vehicle", questionTitle: "Lights, indicators, brake lights and reflectors", guidance: ["All lights working", "Indicators and brake lights OK"], sortOrder: 20, requiresPhotoOnFail: true, defaultSeverity: "major" }),
  item({ id: "core_number_plate", sectionKey: "outside_vehicle", category: "outside_vehicle", questionTitle: "Number plate and operator disc", guidance: ["Legible and secure"], sortOrder: 21, defaultSeverity: "minor" }),
  item({
    id: "core_body_exterior",
    sectionKey: "outside_vehicle",
    category: "outside_vehicle",
    questionTitle: "Is there any bodywork damage?",
    guidance: [
      "Walk around the whole vehicle",
      "Look for dents, scrapes, cracks, sharp edges or loose panels",
      "If yes — take a clear photo. Yard and Admin will see it",
    ],
    sortOrder: 22,
    requiresPhotoOnFail: true,
    defaultSeverity: "major",
    isBodyworkDamage: true,
  }),
  item({ id: "core_fluid_leaks", sectionKey: "outside_vehicle", category: "outside_vehicle", questionTitle: "Fuel, oil, water and waste leaks", guidance: ["No leaks under vehicle"], sortOrder: 23, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "major" }),
  item({ id: "core_engine_smoke", sectionKey: "outside_vehicle", category: "outside_vehicle", questionTitle: "Excessive engine smoke", guidance: ["No excessive smoke on start/idle"], sortOrder: 24, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "core_adblue", sectionKey: "fuel_systems", category: "outside_vehicle", questionTitle: "AdBlue level, if diesel", guidance: ["Sufficient AdBlue for duty"], sortOrder: 25, when: (p) => p.fuelType === "diesel", defaultSeverity: "minor" }),
  item({ id: "core_battery", sectionKey: "fuel_systems", category: "outside_vehicle", questionTitle: "Battery condition, if easily accessible", guidance: ["Secure, no corrosion visible"], sortOrder: 26, when: (p) => p.fuelType !== "electric", defaultSeverity: "minor" }),
  item({ id: "core_ancillary", sectionKey: "outside_vehicle", category: "outside_vehicle", questionTitle: "Ancillary equipment", guidance: ["Any fitted equipment secure and safe"], sortOrder: 27, defaultSeverity: "minor" }),
  item({ id: "core_hv_cutoff", sectionKey: "ev_hybrid", category: "safety_equipment", questionTitle: "High-voltage emergency cut-off, if EV/hybrid", guidance: ["Location known — do not open HV systems", "Cut-off accessible"], sortOrder: 28, when: (p) => p.isEvOrHybrid, defaultSeverity: "critical", addon: "ev" }),
  item({ id: "core_alt_fuel_isolation", sectionKey: "fuel_systems", category: "safety_equipment", questionTitle: "Alternative fuel isolation, if fitted", guidance: ["Isolation switch accessible if fitted"], sortOrder: 29, when: (p) => p.hasAlternativeFuelIsolation, defaultSeverity: "critical" }),
];

export const MINIBUS_ADDON_ITEMS = [
  item({ id: "mb_side_door", sectionKey: "minibus", category: "passenger_area", questionTitle: "Sliding side door", guidance: ["Opens, closes and locks securely"], sortOrder: 101, addon: "minibus", requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "mb_rear_door", sectionKey: "minibus", category: "passenger_area", questionTitle: "Rear passenger door", guidance: ["Secure when closed"], sortOrder: 102, addon: "minibus", defaultSeverity: "major" }),
  item({ id: "mb_entry_step", sectionKey: "minibus", category: "passenger_area", questionTitle: "Passenger entry step", guidance: ["Step secure, non-slip"], sortOrder: 103, addon: "minibus", defaultSeverity: "major" }),
  item({ id: "mb_rear_emergency_exit", sectionKey: "minibus", category: "passenger_area", questionTitle: "Rear emergency exit", guidance: ["Clear and operational"], sortOrder: 104, addon: "minibus", autoBlockOnFail: true, defaultSeverity: "critical" }),
];

export const ACCESSIBLE_ADDON_ITEMS = [
  item({ id: "acc_ramp_deploy", sectionKey: "accessibility", category: "accessibility", questionTitle: "Wheelchair ramp deploys", guidance: ["Ramp deploys smoothly"], sortOrder: 201, addon: "accessible", requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "acc_ramp_stow", sectionKey: "accessibility", category: "accessibility", questionTitle: "Wheelchair ramp stows and locks", guidance: ["Stows fully", "Locks in place", "No warning light"], sortOrder: 202, addon: "accessible", requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "acc_lift_safe", sectionKey: "accessibility", category: "accessibility", questionTitle: "Lift operates safely", guidance: ["Lift cycles correctly if fitted"], sortOrder: 203, addon: "accessible", when: (p) => p.hasWheelchairLift, requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "acc_restraints", sectionKey: "accessibility", category: "accessibility", questionTitle: "Wheelchair restraints present and undamaged", guidance: ["Clamps and belts secure"], sortOrder: 204, addon: "accessible", autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "acc_space_clear", sectionKey: "accessibility", category: "accessibility", questionTitle: "Wheelchair space clear", guidance: ["No obstructions in wheelchair bay"], sortOrder: 205, addon: "accessible", defaultSeverity: "major" }),
];

export const SCHOOL_TRANSPORT_ADDON_ITEMS = [
  item({ id: "sch_seatbelts", sectionKey: "school_transport", category: "passenger_area", questionTitle: "Passenger seatbelts checked for school run", guidance: ["All required belts available"], sortOrder: 301, addon: "school", defaultSeverity: "major" }),
  item({ id: "sch_emergency_contact", sectionKey: "school_transport", category: "safety_equipment", questionTitle: "Emergency contact details available", guidance: ["School/route emergency info on board"], sortOrder: 302, addon: "school", defaultSeverity: "minor" }),
  item({ id: "sch_loose_objects", sectionKey: "school_transport", category: "passenger_area", questionTitle: "No loose objects in passenger area", guidance: ["Cabinet/items secured"], sortOrder: 303, addon: "school", defaultSeverity: "minor" }),
  item({ id: "sch_accessibility_ready", sectionKey: "school_transport", category: "accessibility", questionTitle: "Accessibility equipment ready for SEND route", guidance: ["Ramp/lift/restraints ready if required"], sortOrder: 304, addon: "school", when: (p) => p.usedForSchoolTransport && p.hasAccessibilityEquipment, defaultSeverity: "critical" }),
];

export const EV_HYBRID_ADDON_ITEMS = [
  item({ id: "ev_hv_location", sectionKey: "ev_hybrid", category: "safety_equipment", questionTitle: "High-voltage cut-off location known", guidance: ["Visual check only — do not handle HV systems"], sortOrder: 401, addon: "ev", defaultSeverity: "critical" }),
  item({ id: "ev_no_cable_damage", sectionKey: "ev_hybrid", category: "outside_vehicle", questionTitle: "No visible high-voltage cable damage", guidance: ["Report any visible damage — do not inspect HV"], sortOrder: 402, addon: "ev", requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "ev_no_battery_warnings", sectionKey: "ev_hybrid", category: "driver_cab", questionTitle: "No battery or thermal warning lights", guidance: ["Dashboard clear of HV warnings"], sortOrder: 403, addon: "ev", requiresPhotoOnFail: true, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "ev_range_sufficient", sectionKey: "ev_hybrid", category: "driver_cab", questionTitle: "Battery range sufficient for route", guidance: ["Enough charge for assigned duty"], sortOrder: 404, addon: "ev", defaultSeverity: "major" }),
  item({ id: "ev_charging_port", sectionKey: "ev_hybrid", category: "outside_vehicle", questionTitle: "Charging port secure / cable stored", guidance: ["Port closed", "Cable removed and stored"], sortOrder: 405, addon: "ev", defaultSeverity: "minor" }),
];

export const SINGLE_DECK_BUS_ADDON_ITEMS = [
  item({ id: "bus_front_door", sectionKey: "single_deck_bus", category: "passenger_area", questionTitle: "Front passenger door", guidance: ["Opens, closes and secures"], sortOrder: 501, addon: "single_deck_bus", autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "bus_rear_door", sectionKey: "single_deck_bus", category: "passenger_area", questionTitle: "Middle/rear door if fitted", guidance: ["Secure when closed"], sortOrder: 502, addon: "single_deck_bus", defaultSeverity: "major" }),
  item({ id: "bus_door_emergency", sectionKey: "single_deck_bus", category: "passenger_area", questionTitle: "Door emergency release", guidance: ["Emergency release works"], sortOrder: 503, addon: "single_deck_bus", autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "bus_door_interlock", sectionKey: "single_deck_bus", category: "passenger_area", questionTitle: "Door interlock", guidance: ["Interlock prevents movement when door open"], sortOrder: 504, addon: "single_deck_bus", autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "bus_kneeling", sectionKey: "single_deck_bus", category: "passenger_area", questionTitle: "Kneeling system", guidance: ["Kneels correctly if fitted"], sortOrder: 505, addon: "single_deck_bus", when: (p) => p.hasAccessibilityEquipment, defaultSeverity: "major" }),
  item({ id: "bus_low_floor_ramp", sectionKey: "single_deck_bus", category: "accessibility", questionTitle: "Low-floor ramp", guidance: ["Deploys and stows correctly"], sortOrder: 506, addon: "single_deck_bus", when: (p) => p.hasAccessibilityEquipment, autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "bus_destination_display", sectionKey: "single_deck_bus", category: "passenger_area", questionTitle: "Destination display", guidance: ["Display working and correct"], sortOrder: 507, addon: "single_deck_bus", defaultSeverity: "minor" }),
  item({ id: "bus_handrails", sectionKey: "single_deck_bus", category: "passenger_area", questionTitle: "Handrails and stanchions", guidance: ["Secure, no sharp edges"], sortOrder: 508, addon: "single_deck_bus", defaultSeverity: "major" }),
  item({ id: "bus_priority_seating", sectionKey: "single_deck_bus", category: "passenger_area", questionTitle: "Priority seating", guidance: ["Marked and accessible"], sortOrder: 509, addon: "single_deck_bus", defaultSeverity: "minor" }),
];

export const DOUBLE_DECK_BUS_ADDON_ITEMS = [
  item({ id: "dd_upper_floor", sectionKey: "double_deck_bus", category: "passenger_area", questionTitle: "Upper deck floor", guidance: ["No holes or serious damage"], sortOrder: 601, addon: "double_deck_bus", autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "dd_upper_seats", sectionKey: "double_deck_bus", category: "passenger_area", questionTitle: "Upper deck seats", guidance: ["Secure and in good condition"], sortOrder: 602, addon: "double_deck_bus", defaultSeverity: "major" }),
  item({ id: "dd_upper_exits", sectionKey: "double_deck_bus", category: "passenger_area", questionTitle: "Upper deck emergency exits", guidance: ["Clear and operational"], sortOrder: 603, addon: "double_deck_bus", autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "dd_stairwell", sectionKey: "double_deck_bus", category: "passenger_area", questionTitle: "Stairwell condition", guidance: ["Steps secure, markings visible"], sortOrder: 604, addon: "double_deck_bus", defaultSeverity: "major" }),
  item({ id: "dd_stairwell_handrails", sectionKey: "double_deck_bus", category: "passenger_area", questionTitle: "Stairwell handrails", guidance: ["Secure — no excessive movement"], sortOrder: 605, addon: "double_deck_bus", autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "dd_stairwell_lighting", sectionKey: "double_deck_bus", category: "passenger_area", questionTitle: "Stairwell lighting", guidance: ["Adequate illumination"], sortOrder: 606, addon: "double_deck_bus", defaultSeverity: "minor" }),
  item({ id: "dd_roof_hatches", sectionKey: "double_deck_bus", category: "passenger_area", questionTitle: "Roof hatches", guidance: ["Secure when closed"], sortOrder: 607, addon: "double_deck_bus", defaultSeverity: "major" }),
  item({ id: "dd_height_marker", sectionKey: "double_deck_bus", category: "driver_cab", questionTitle: "Height marker correct", guidance: ["Correct height displayed"], sortOrder: 608, addon: "double_deck_bus", autoBlockOnFail: true, defaultSeverity: "critical" }),
];

export const COACH_ADDON_ITEMS = [
  item({ id: "coach_luggage_doors", sectionKey: "coach", category: "outside_vehicle", questionTitle: "Luggage compartment doors", guidance: ["Secure when closed"], sortOrder: 701, addon: "coach", autoBlockOnFail: true, defaultSeverity: "critical" }),
  item({ id: "coach_overhead_racks", sectionKey: "coach", category: "passenger_area", questionTitle: "Overhead luggage racks", guidance: ["Secure, nothing loose"], sortOrder: 702, addon: "coach", defaultSeverity: "major" }),
  item({ id: "coach_passenger_seatbelts", sectionKey: "coach", category: "passenger_area", questionTitle: "Passenger seatbelts", guidance: ["Present and not damaged"], sortOrder: 703, addon: "coach", defaultSeverity: "major" }),
  item({ id: "coach_pa_system", sectionKey: "coach", category: "passenger_area", questionTitle: "PA / intercom if fitted", guidance: ["Audible to passengers"], sortOrder: 704, addon: "coach", when: (p) => p.hasPaSystem, defaultSeverity: "minor" }),
  item({ id: "coach_toilet", sectionKey: "coach", category: "passenger_area", questionTitle: "Toilet safe if fitted", guidance: ["Door locks, no leaks"], sortOrder: 705, addon: "coach", when: (p) => p.hasToilet, defaultSeverity: "major" }),
  item({ id: "coach_tachograph", sectionKey: "coach", category: "driver_cab", questionTitle: "Tachograph if fitted", guidance: ["Operational, no faults"], sortOrder: 706, addon: "coach", when: (p) => p.hasTachograph, defaultSeverity: "major" }),
  item({ id: "coach_emergency_hatches", sectionKey: "coach", category: "passenger_area", questionTitle: "Emergency roof hatches", guidance: ["Secure and accessible"], sortOrder: 707, addon: "coach", autoBlockOnFail: true, defaultSeverity: "critical" }),
];

export const CHECK_TYPES = {
  daily: { id: "daily_walkaround", label: "Daily / Pre-use Walkaround" },
  changeover: { id: "changeover", label: "Driver Changeover Check" },
  end_of_duty: { id: "end_of_duty", label: "End of Duty Closeout" },
  post_journey: { id: "post_journey", label: "Post-Journey Check" },
  in_service: { id: "in_service_defect", label: "In-Service Defect Report" },
};

export function normalizeVehicleProfile(vehicle, job = null) {
  const vt = String(vehicle?.vehicle_type ?? "minibus").toLowerCase();
  const routeName = String(job?.route_name ?? job?.routeName ?? "").toLowerCase();
  const fuelRaw = String(vehicle?.fuel_type ?? vehicle?.fuelType ?? "").toLowerCase();
  const isEvOrHybrid = fuelRaw.includes("electric") || fuelRaw.includes("hybrid") || vt.includes("electric") || vt.includes("hybrid");

  return {
    vehicleId: vehicle?.id,
    registration: vehicle?.registration,
    make: vehicle?.make,
    model: vehicle?.model,
    vehicleType: vt,
    fuelType: fuelRaw || (isEvOrHybrid ? "electric" : "diesel"),
    seatingCapacity: vehicle?.seats ?? vehicle?.seating_capacity,
    wheelchairAccessible: Boolean(vehicle?.wheelchair_accessible ?? vehicle?.wheelchairAccessible),
    hasWheelchairRamp: Boolean(vehicle?.wheelchair_accessible ?? vehicle?.has_wheelchair_ramp),
    hasWheelchairLift: Boolean(vehicle?.has_wheelchair_lift),
    hasWheelchairRestraints: Boolean(vehicle?.wheelchair_accessible ?? vehicle?.has_wheelchair_restraints),
    hasAccessibilityEquipment: Boolean(vehicle?.wheelchair_accessible ?? vehicle?.has_wheelchair_ramp ?? vehicle?.has_wheelchair_lift),
    hasTicketMachine: Boolean(vehicle?.has_ticket_machine),
    hasDestinationDisplay: Boolean(vehicle?.has_destination_display),
    hasStopBells: vt.includes("bus") || vt.includes("coach") || vt.includes("minibus"),
    needsHeightMarker: vt.includes("bus") || vt.includes("coach") || vt.includes("double"),
    hasAlternativeFuelIsolation: Boolean(vehicle?.has_alternative_fuel_isolation),
    isEvOrHybrid,
    usedForSchoolTransport:
      Boolean(vehicle?.used_for_school_transport) ||
      routeName.includes("school") ||
      routeName.includes("send") ||
      routeName.includes("education"),
    isMinibus: (vt.includes("minibus") || vt === "mpv") && !vt.includes("bus") && !vt.includes("coach"),
    isSingleDeckBus: vt.includes("single_deck") || (vt.includes("bus") && !vt.includes("double")),
    isDoubleDeckBus: vt.includes("double_deck") || vt.includes("double deck"),
    isCoach: vt.includes("coach"),
    isBus: vt.includes("bus"),
    hasPaSystem: Boolean(vehicle?.has_pa_system),
    hasToilet: Boolean(vehicle?.has_toilet),
    hasTachograph: Boolean(vehicle?.has_tachograph),
    hasLuggageCompartments: Boolean(vehicle?.has_luggage_compartments) || vt.includes("coach"),
    odometer: vehicle?.odometer,
    depotName: vehicle?.depot?.name ?? vehicle?.depotName,
  };
}

function resolveAddons(profile) {
  const addons = new Set(["core"]);
  if (profile.isMinibus) addons.add("minibus");
  if (profile.isSingleDeckBus) addons.add("single_deck_bus");
  if (profile.isDoubleDeckBus) addons.add("double_deck_bus");
  if (profile.isCoach) addons.add("coach");
  if (profile.hasAccessibilityEquipment || profile.wheelchairAccessible) addons.add("accessible");
  if (profile.usedForSchoolTransport) addons.add("school");
  if (profile.isEvOrHybrid) addons.add("ev");
  return addons;
}

export function buildWalkaroundChecklist(profile) {
  const addons = resolveAddons(profile);
  const pool = [
    ...CORE_PSV_ITEMS,
    ...(addons.has("minibus") ? MINIBUS_ADDON_ITEMS : []),
    ...(addons.has("single_deck_bus") ? SINGLE_DECK_BUS_ADDON_ITEMS : []),
    ...(addons.has("double_deck_bus") ? DOUBLE_DECK_BUS_ADDON_ITEMS : []),
    ...(addons.has("coach") ? COACH_ADDON_ITEMS : []),
    ...(addons.has("accessible") ? ACCESSIBLE_ADDON_ITEMS : []),
    ...(addons.has("school") ? SCHOOL_TRANSPORT_ADDON_ITEMS : []),
    ...(addons.has("ev") ? EV_HYBRID_ADDON_ITEMS : []),
  ];

  const seen = new Set();
  const items = pool
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      if (entry.when && !entry.when(profile)) return false;
      seen.add(entry.id);
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry, index) => ({ ...entry, stepNumber: index + 1 }));

  const templateParts = ["Core PSV Check"];
  if (addons.has("minibus")) templateParts.push("Minibus Check");
  if (addons.has("single_deck_bus")) templateParts.push("Single-Deck Bus Check");
  if (addons.has("double_deck_bus")) templateParts.push("Double-Deck Bus Check");
  if (addons.has("coach")) templateParts.push("Coach Check");
  if (addons.has("accessible")) templateParts.push("Accessibility Check");
  if (addons.has("school")) templateParts.push("School Transport Check");
  if (addons.has("ev")) templateParts.push("EV / Hybrid Check");

  return {
    items,
    templateLabel: templateParts.join(" + "),
    addons: [...addons],
    totalSteps: items.length,
  };
}

export function getSectionLabel(sectionKey) {
  return SECTION_LABELS[sectionKey] ?? sectionKey.replace(/_/g, " ");
}

export { DRIVER_CHECK_DECLARATION } from "@/lib/walkaround-check-template";

export function deriveWalkaroundResult(responses) {
  const fails = responses.filter((r) => r.responseStatus === "fail");
  const advisories = responses.filter((r) => r.responseStatus === "advisory");

  if (fails.length === 0) {
    const answered = responses.filter((r) => r.responseStatus !== "pending");
    if (advisories.length > 0) {
      return {
        result: "pass_with_advisory",
        outcome: "advisory",
        highestSeverity: "minor",
        criticalCount: 0,
        failCount: 0,
        advisoryCount: advisories.length,
      };
    }
    if (answered.every((r) => r.responseStatus === "pass" || r.responseStatus === "na")) {
      return {
        result: "nil_defect",
        outcome: "nil",
        highestSeverity: null,
        criticalCount: 0,
        failCount: 0,
        advisoryCount: 0,
      };
    }
    return {
      result: "passed",
      outcome: "pass",
      highestSeverity: null,
      criticalCount: 0,
      failCount: 0,
      advisoryCount: 0,
    };
  }

  const severities = fails.map((f) => f.severitySuggestion ?? "major");
  const criticalCount = severities.filter((s) => s === "critical").length;
  const highestSeverity = criticalCount > 0 ? "critical" : severities.includes("major") ? "major" : "minor";
  const unsafeContinue = fails.some((f) => f.canContinue === "no");
  const outcome = criticalCount > 0 || unsafeContinue ? "critical" : "review";

  return {
    result: "failed",
    outcome,
    highestSeverity,
    criticalCount,
    failCount: fails.length,
    advisoryCount: advisories.length,
  };
}

export function mapCategoryToDefect(category) {
  if (category === "accessibility") return "accessibility";
  if (category === "outside_vehicle") return "body";
  if (category === "driver_cab") return "interior";
  if (category === "passenger_area") return "interior";
  if (category === "safety_equipment") return "other";
  return "other";
}
