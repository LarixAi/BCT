import type { CheckSection } from "@/types/vehicle-check";

/** PSV walkaround organised into driver-friendly sections (template v1). */
export const VEHICLE_CHECK_TEMPLATE_VERSION = "psv-walkaround-v1";

export const VEHICLE_CHECK_SECTIONS: CheckSection[] = [
  {
    id: "cab_controls",
    title: "Cab and controls",
    order: 1,
    items: [
      {
        id: "cab_mirrors",
        sectionId: "cab_controls",
        title: "Mirrors, cameras, glass and visibility",
        instructions: [
          "Check all mirrors are secure and correctly adjusted",
          "Check camera lenses are clean and unobstructed",
          "Check windscreen and side glass for cracks or restrictions",
        ],
        order: 1,
      },
      {
        id: "cab_wipers",
        sectionId: "cab_controls",
        title: "Windscreen wipers and washers",
        instructions: [
          "Both wipers operate correctly",
          "Blades are secure and undamaged",
          "Washer fluid reaches the windscreen",
        ],
        order: 2,
      },
      {
        id: "cab_warnings",
        sectionId: "cab_controls",
        title: "Dashboard warning lamps",
        instructions: [
          "No unexpected warning lamps illuminated",
          "ABS, EBS, ESC and ADAS warnings are clear",
        ],
        order: 3,
      },
      {
        id: "cab_brakes",
        sectionId: "cab_controls",
        title: "Service and parking brakes",
        instructions: [
          "Service brake operates correctly",
          "Parking brake holds the vehicle",
          "No excessive pedal travel or air loss",
        ],
        order: 4,
      },
      {
        id: "cab_seat",
        sectionId: "cab_controls",
        title: "Driver seat and seat belt",
        instructions: ["Seat adjusts and locks", "Seat belt latches and retracts"],
        order: 5,
      },
    ],
  },
  {
    id: "passenger_area",
    title: "Passenger area",
    order: 2,
    items: [
      {
        id: "pass_doors",
        sectionId: "passenger_area",
        title: "Passenger doors",
        instructions: ["Doors open and close securely", "No obstructions to closing"],
        order: 1,
      },
      {
        id: "pass_exits",
        sectionId: "passenger_area",
        title: "Emergency exits",
        instructions: ["Exits are unobstructed", "Exit signs and lighting work"],
        order: 2,
      },
      {
        id: "pass_seats",
        sectionId: "passenger_area",
        title: "Passenger seats and belts",
        instructions: ["Seats secure", "Seat belts present and working where fitted"],
        order: 3,
      },
      {
        id: "pass_comm",
        sectionId: "passenger_area",
        title: "Stop bells and communication",
        instructions: ["Stop bells operate", "PA or intercom works if fitted"],
        order: 4,
        allowNotFitted: true,
      },
      {
        id: "pass_interior",
        sectionId: "passenger_area",
        title: "Flooring, rails and interior lights",
        instructions: ["Flooring secure and not slippery", "Handrails secure", "Interior lights work"],
        order: 5,
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    order: 3,
    requiresAccessibility: true,
    items: [
      {
        id: "acc_space",
        sectionId: "accessibility",
        title: "Wheelchair space",
        instructions: ["Space is clear", "Floor markings visible"],
        order: 1,
      },
      {
        id: "acc_lift",
        sectionId: "accessibility",
        title: "Wheelchair lift or ramp",
        instructions: ["Lift or ramp deploys safely", "Controls operate", "No fluid leaks"],
        order: 2,
      },
      {
        id: "acc_restraints",
        sectionId: "accessibility",
        title: "Wheelchair restraint sets",
        instructions: ["All restraints present", "No fraying or damage"],
        order: 3,
      },
      {
        id: "acc_priority",
        sectionId: "accessibility",
        title: "Priority seating and handrails",
        instructions: ["Priority seats marked", "Handrails secure"],
        order: 4,
      },
    ],
  },
  {
    id: "emergency",
    title: "Emergency equipment",
    order: 4,
    items: [
      {
        id: "emg_extinguisher",
        sectionId: "emergency",
        title: "Fire extinguisher",
        instructions: ["Present and in date", "Securely mounted"],
        order: 1,
      },
      {
        id: "emg_firstaid",
        sectionId: "emergency",
        title: "First-aid kit",
        instructions: ["Present and sealed", "Contents within date"],
        order: 2,
      },
      {
        id: "emg_hammers",
        sectionId: "emergency",
        title: "Glass hammers and emergency exit devices",
        instructions: ["Hammers present at exits", "Break-glass devices intact"],
        order: 3,
      },
      {
        id: "emg_triangle",
        sectionId: "emergency",
        title: "Warning triangle and emergency pack",
        instructions: ["Triangle present where required", "Emergency contact information visible"],
        order: 4,
        allowNotFitted: true,
      },
    ],
  },
  {
    id: "wheels",
    title: "Wheels and tyres",
    order: 5,
    items: [
      { id: "wheel_fl", sectionId: "wheels", title: "Front left tyre and wheel", instructions: ["Check tread, inflation, sidewall and wheel nuts"], order: 1, wheelPosition: "Front left" },
      { id: "wheel_fr", sectionId: "wheels", title: "Front right tyre and wheel", instructions: ["Check tread, inflation, sidewall and wheel nuts"], order: 2, wheelPosition: "Front right" },
      { id: "wheel_rlo", sectionId: "wheels", title: "Rear left outer tyre and wheel", instructions: ["Check tread, inflation, sidewall and wheel nuts"], order: 3, wheelPosition: "Rear left outer" },
      { id: "wheel_rro", sectionId: "wheels", title: "Rear right outer tyre and wheel", instructions: ["Check tread, inflation, sidewall and wheel nuts"], order: 4, wheelPosition: "Rear right outer" },
      { id: "wheel_rli", sectionId: "wheels", title: "Rear left inner tyre and wheel", instructions: ["Check tread, inflation and debris between twin wheels"], order: 5, wheelPosition: "Rear left inner" },
      { id: "wheel_rri", sectionId: "wheels", title: "Rear right inner tyre and wheel", instructions: ["Check tread, inflation and debris between twin wheels"], order: 6, wheelPosition: "Rear right inner" },
    ],
  },
  {
    id: "exterior",
    title: "Exterior and lighting",
    order: 6,
    items: [
      { id: "ext_headlights", sectionId: "exterior", title: "Headlights and brake lights", instructions: ["All headlights and brake lights work"], order: 1 },
      { id: "ext_indicators", sectionId: "exterior", title: "Indicators and side repeaters", instructions: ["Indicators and repeaters operate"], order: 2 },
      { id: "ext_plates", sectionId: "exterior", title: "Registration plates and reflectors", instructions: ["Plates secure and legible", "Reflectors present"], order: 3 },
      { id: "ext_bodywork", sectionId: "exterior", title: "Bodywork and access doors", instructions: ["No sharp or insecure bodywork", "Access and luggage doors secure"], order: 4, hasKnownIssue: true, knownIssueLabel: "Existing scratch — front passenger bumper" },
    ],
  },
  {
    id: "fluids",
    title: "Fluids, fuel and power systems",
    order: 7,
    items: [
      { id: "fluid_leaks", sectionId: "fluids", title: "Fuel, oil and waste leaks", instructions: ["No visible leaks under the vehicle"], order: 1 },
      { id: "fluid_cap", sectionId: "fluids", title: "Fuel cap and AdBlue", instructions: ["Fuel cap secure", "AdBlue level adequate if fitted"], order: 2, allowNotFitted: true },
      { id: "fluid_exhaust", sectionId: "fluids", title: "Exhaust smoke and battery", instructions: ["No excessive exhaust smoke", "Battery secure and terminals clean"], order: 3 },
      { id: "fluid_hv", sectionId: "fluids", title: "High-voltage / alternative fuel isolation", instructions: ["Emergency cut-off accessible", "No visible electrical damage"], order: 4, allowNotFitted: true },
    ],
  },
  {
    id: "equipment",
    title: "Assigned equipment and service readiness",
    order: 8,
    items: [
      { id: "eq_restraints", sectionId: "equipment", title: "Wheelchair restraint sets for today", instructions: ["Correct number of sets for today's passengers"], order: 1 },
      { id: "eq_child", sectionId: "equipment", title: "Child seats and harnesses", instructions: ["Required child equipment present if allocated"], order: 2, allowNotFitted: true },
      { id: "eq_cleaning", sectionId: "equipment", title: "Cleaning kit and PPE", instructions: ["Cleaning kit and gloves available"], order: 3 },
      { id: "eq_docs", sectionId: "equipment", title: "Route and school documentation", instructions: ["Required paperwork for today's duty"], order: 4 },
    ],
  },
];

export function getApplicableSections(accessibilityCapable: boolean): CheckSection[] {
  return VEHICLE_CHECK_SECTIONS.filter(
    (s) => !s.requiresAccessibility || accessibilityCapable,
  ).sort((a, b) => a.order - b.order);
}

export function getAllItems(accessibilityCapable: boolean) {
  return getApplicableSections(accessibilityCapable).flatMap((s) => s.items);
}

export function getItemById(itemId: string, accessibilityCapable: boolean) {
  return getAllItems(accessibilityCapable).find((i) => i.id === itemId);
}

export function getSectionById(sectionId: string) {
  return VEHICLE_CHECK_SECTIONS.find((s) => s.id === sectionId);
}
