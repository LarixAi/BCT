import type { CheckSectionDef, CheckSectionItem, YardCheckType } from "@/types/yard-check";

function items(sectionId: string, labels: string[]): CheckSectionItem[] {
  return labels.map((label, i) => ({
    id: `${sectionId}--${i}`,
    label,
  }));
}

function sec(
  id: string,
  module: CheckSectionDef["module"],
  area: CheckSectionDef["area"],
  title: string,
  description: string,
  drillDown: string[],
  opts?: { dvsaGroup?: number; safetyCritical?: boolean },
): CheckSectionDef {
  return {
    id,
    module,
    area,
    title,
    description,
    items: items(id, drillDown),
    dvsaGroup: opts?.dvsaGroup,
    safetyCritical: opts?.safetyCritical,
  };
}

/** DVSA PSV daily walkaround — 29 official check groups */
export const DVSA_SECTIONS: CheckSectionDef[] = [
  sec("front-visibility", "roadworthiness", "cab", "Front view & visibility", "Confirm nothing obstructs the driver’s forward view.", [
    "No object blocking forward view",
    "Front windows not excessively tinted",
    "Visibility aids clean and usable",
  ], { dvsaGroup: 1 }),
  sec("mirrors", "roadworthiness", "cab", "Mirrors", "Mirrors present, secure and undamaged.", [
    "Mirrors present and secure",
    "Glass not cracked or missing",
    "Adjustment holds position",
  ], { dvsaGroup: 2, safetyCritical: true }),
  sec("cameras", "roadworthiness", "cab", "Cameras", "CCTV and ADAS cameras operating where fitted.", [
    "Camera lenses clean",
    "Image displays correctly",
    "No loose mountings",
  ], { dvsaGroup: 3 }),
  sec("windscreen", "roadworthiness", "cab", "Windscreen", "Windscreen condition and visibility.", [
    "Not badly cracked or scratched",
    "Not discoloured affecting view",
    "No stickers in critical zone",
  ], { dvsaGroup: 4, safetyCritical: true }),
  sec("wipers-washers", "roadworthiness", "cab", "Wipers & washers", "Wipers and washer system operate correctly.", [
    "Wipers present",
    "Blades not split or worn",
    "Washer fluid sprays correctly",
  ], { dvsaGroup: 5 }),
  sec("dashboard-warnings", "roadworthiness", "cab", "Dashboard & warning lamps", "Warning lamps and gauges operate correctly.", [
    "No active ABS/EBS warnings",
    "Air-pressure warnings normal",
    "Fuel/temperature gauges readable",
  ], { dvsaGroup: 6, safetyCritical: true }),
  sec("steering", "roadworthiness", "cab", "Steering", "Steering secure with no excessive play.", [
    "Power steering operates",
    "No excessive free play",
    "Column secure, no unusual noise",
  ], { dvsaGroup: 7, safetyCritical: true }),
  sec("horn", "roadworthiness", "cab", "Horn", "Horn works from the driving position.", [
    "Audible horn operation",
    "Control reachable while driving",
  ], { dvsaGroup: 8 }),
  sec("brakes-air", "roadworthiness", "cab", "Brakes & air pressure", "Brake systems and air pressure satisfactory.", [
    "Air pressure builds correctly",
    "Low-air warning operates",
    "No audible air leaks",
    "Service and parking brakes function",
    "Pedal secure with anti-slip surface",
  ], { dvsaGroup: 9, safetyCritical: true }),
  sec("driver-footwell", "roadworthiness", "cab", "Driver footwell", "Footwell clear and controls accessible.", [
    "Footwell clear of obstructions",
    "Controls accessible",
  ], { dvsaGroup: 10 }),
  sec("height-marker", "roadworthiness", "cab", "Vehicle height marker", "Height marker displayed and readable.", [
    "Marker displayed",
    "Correct running height shown",
    "Readable from driver position",
  ], { dvsaGroup: 11 }),
  sec("ticket-machine", "roadworthiness", "cab", "Electronic ticket machine", "ETM powers on and is secure where fitted.", [
    "Powers on",
    "Operates properly",
    "Securely mounted",
  ], { dvsaGroup: 12 }),
  sec("driver-seat-cab", "roadworthiness", "cab", "Driver seat belt & cab", "Driver restraint and cab condition.", [
    "Seat belt not cut or frayed",
    "Buckle locks and retracts",
    "Driver seat secure",
    "Cab floor clear",
  ], { dvsaGroup: 13, safetyCritical: true }),
  sec("passenger-doors-exits", "roadworthiness", "passenger", "Passenger doors & emergency exits", "Doors and emergency exits operate and are not obstructed.", [
    "Doors open, close and remain secure",
    "Door safety systems operate",
    "Emergency exits open",
    "Exit signs visible and lit",
    "Exits not obstructed",
  ], { dvsaGroup: 14, safetyCritical: true }),
  sec("accessibility", "roadworthiness", "passenger", "Accessibility equipment", "Wheelchair access equipment safe and operational.", [
    "Wheelchair space available",
    "Ramp or lift operates",
    "Manual backup available",
    "Handrails secure",
    "Operator knows correct operation",
  ], { dvsaGroup: 15, safetyCritical: true }),
  sec("passenger-seats-belts", "roadworthiness", "passenger", "Passenger seats & belts", "Seating secure and belts serviceable.", [
    "Seats securely fixed",
    "No dangerous seat damage",
    "Seat belts not cut or frayed",
    "Configuration matches capacity",
  ], { dvsaGroup: 16, safetyCritical: true }),
  sec("passenger-communication", "roadworthiness", "passenger", "Passenger communication", "Bells, displays and announcements work.", [
    "Bell pushes work",
    "Audible bell operates",
    "Stop signs illuminate",
    "Route/destination displays work",
  ], { dvsaGroup: 17 }),
  sec("hvac-demist", "roadworthiness", "passenger", "Heating, ventilation & demisting", "Climate and demist systems operate.", [
    "Heating/ventilation works",
    "Windscreen demister operates",
    "Roof hatches secure",
  ], { dvsaGroup: 18 }),
  sec("emergency-glass-hammer", "roadworthiness", "passenger", "Emergency glass hammer", "Break-glass devices present and accessible.", [
    "Present and correctly located",
    "Secure and undamaged",
    "Easily accessible",
  ], { dvsaGroup: 19, safetyCritical: true }),
  sec("fire-extinguisher", "roadworthiness", "passenger", "Fire extinguisher", "Correct extinguisher fitted and serviceable.", [
    "Present and correct type",
    "Easily accessible and secure",
    "Not discharged, in date",
  ], { dvsaGroup: 20, safetyCritical: true }),
  sec("first-aid", "roadworthiness", "passenger", "First-aid kit", "First-aid kit present and complete where required.", [
    "Present where required",
    "Accessible and sealed/complete",
    "Contents not expired",
  ], { dvsaGroup: 21 }),
  sec("passenger-interior", "roadworthiness", "passenger", "Passenger interior", "Interior safe, clear and secure.", [
    "Gangways clear, floors secure",
    "No trip hazards or sharp edges",
    "Grab rails and panels secure",
    "Interior lights work",
    "No fumes in passenger area",
  ], { dvsaGroup: 22 }),
  sec("tyres-wheels", "roadworthiness", "exterior", "Tyres, wheels & fixings", "Tyres, wheels and wheel nuts satisfactory.", [
    "Adequate inflation and tread (≥1 mm PSV)",
    "No cuts, bulges or exposed cords",
    "Wheels secure, all nuts present",
    "Wheel-nut indicators aligned",
    "No debris between twins",
  ], { dvsaGroup: 23, safetyCritical: true }),
  sec("lights-indicators", "roadworthiness", "exterior", "Lights, indicators & reflectors", "All lighting units present and working.", [
    "Head, tail, brake and indicator lamps work",
    "Hazard and marker lights work",
    "Lenses clean, correct colour",
    "No missing or insecure units",
  ], { dvsaGroup: 24, safetyCritical: true }),
  sec("registration-plates", "roadworthiness", "exterior", "Registration plates", "Plates correct, secure and legible.", [
    "Correct registration displayed",
    "Secure, clean and legible",
    "Not cracked or obscured",
  ], { dvsaGroup: 25 }),
  sec("body-exterior", "roadworthiness", "exterior", "Body exterior", "Panels, doors and trim secure; damage assessed.", [
    "Panels and bumpers secure",
    "Luggage/access doors close properly",
    "No dangerous sharp edges",
    "Existing vs new damage noted",
  ], { dvsaGroup: 26 }),
  sec("fuel-oil-leaks", "roadworthiness", "exterior", "Fuel, oil & waste leaks", "No fluid leaks under the vehicle.", [
    "Fuel cap present and seals",
    "No fuel, oil or coolant leak",
    "No waste/toilet-system leak",
  ], { dvsaGroup: 27, safetyCritical: true }),
  sec("exhaust-adblue-battery", "roadworthiness", "exterior", "Exhaust, AdBlue & battery", "Exhaust, emissions fluids and battery satisfactory.", [
    "No excessive exhaust smoke",
    "AdBlue sufficient, cap secure",
    "Battery secure, no visible damage",
  ], { dvsaGroup: 28 }),
  sec("ancillary-specialist", "roadworthiness", "exterior", "Ancillary & specialist equipment", "Vehicle-specific equipment secure and operational.", [
    "Lift/ramp/tail lift operates",
    "Reversing camera/sensors work",
    "Destination equipment secure",
    "HV isolation accessible (if EV/hybrid)",
    "Alt-fuel system secure, no leaks",
  ], { dvsaGroup: 29, safetyCritical: true }),
];

export const YARD_READINESS_SECTIONS: CheckSectionDef[] = [
  sec("vehicle-identity", "yard-readiness", "yard", "Vehicle identity", "Correct vehicle and registration for assignment.", ["Reg matches assignment", "Fleet number correct"]),
  sec("parking-bay", "yard-readiness", "yard", "Parking bay", "Vehicle in correct bay or zone.", ["Correct bay/zone", "Not blocking access"]),
  sec("keys-available", "yard-readiness", "yard", "Keys & access", "Keys and cab access available.", ["Keys present", "Cab accessible"]),
  sec("fuel-level", "yard-readiness", "yard", "Fuel level", "Sufficient fuel for planned work.", ["Fuel gauge acceptable", "No immediate refill needed"]),
  sec("charge-adblue", "yard-readiness", "yard", "Charge / AdBlue", "Electric charge or AdBlue adequate.", ["Charge/AdBlue sufficient", "No active warnings"]),
  sec("odometer", "yard-readiness", "yard", "Odometer", "Odometer reading recorded.", ["Reading recorded", "Matches expected usage"]),
  sec("warning-lights", "yard-readiness", "yard", "Warning lights", "No unresolved warning lamps.", ["No unresolved warnings", "Dashboard clear"]),
  sec("cleanliness", "yard-readiness", "yard", "Cleanliness", "Interior and exterior acceptable.", ["Interior clean", "Exterior presentable", "No strong odour"]),
  sec("defects-closed", "yard-readiness", "yard", "Previous defects", "Known defects addressed or recorded.", ["Open defects reviewed", "No surprise new failures"]),
  sec("compliance", "yard-readiness", "yard", "MOT, tax & inspection", "Vehicle legally compliant.", ["MOT valid", "Tax/inspection status valid"]),
  sec("seating-config", "yard-readiness", "yard", "Seating configuration", "Seat layout matches capacity plan.", ["Seat count correct", "Layout matches manifest"]),
  sec("route-assigned", "yard-readiness", "yard", "Route / job assigned", "Correct trip or contract assigned.", ["Correct route/job on system", "Driver briefed"]),
];

export const EQUIPMENT_SECTIONS: CheckSectionDef[] = [
  sec("permanent-safety", "equipment", "equipment", "Permanent safety equipment", "Fixed safety items on vehicle.", ["Fire extinguisher", "First-aid kit", "Emergency hammers", "Exit signage"], { safetyCritical: true }),
  sec("assigned-equipment", "equipment", "equipment", "Assigned equipment", "Removable equipment for today’s work.", ["Wheelchair restraint set", "Occupant belts/clamps", "Child seats if required"], { safetyCritical: true }),
  sec("consumables", "equipment", "equipment", "Consumables", "Replenishable stock levels.", ["Gloves, wipes, masks", "Sick bags / spill kit", "Refuse bags"]),
  sec("documents", "equipment", "equipment", "Documents & keys", "Required documents present.", ["Defect book", "Fuel card", "Route instructions"]),
];

export const JOB_SUITABILITY_SECTIONS: CheckSectionDef[] = [
  sec("wheelchair-job", "job-suitability", "job", "Wheelchair capacity", "Vehicle suits wheelchair bookings.", ["Space and equipment match booking", "Restraints available"], { safetyCritical: true }),
  sec("seat-capacity", "job-suitability", "job", "Seat capacity", "Enough usable seats for assignment.", ["Passenger count within capacity", "No blocked seats"]),
  sec("child-seat-job", "job-suitability", "job", "Child passenger needs", "Child restraint requirements met.", ["Correct child seat/harness", "Fitted correctly"], { safetyCritical: true }),
  sec("contract-equipment", "job-suitability", "job", "Contract equipment", "Client-requested items available.", ["CCTV/signage if required", "Special equipment present"]),
  sec("route-suitability", "job-suitability", "job", "Route suitability", "Vehicle suitable for route constraints.", ["Height/weight suitable", "Accessibility matches route"]),
];

/** Yard manager spot-bust — find defects missed on driver walkarounds */
export const YARD_AUDIT_SECTIONS: CheckSectionDef[] = [
  sec("audit-tyres", "yard-audit", "audit", "Tyres — missed defects", "Physically inspect every tyre. Look for bald tread, cuts and under-inflation not on the defect log.", [
    "Tread below legal minimum (≤1 mm PSV)",
    "Bald or heavily worn shoulder/crown",
    "Under-inflated or flat-spotted tyre",
    "Cut, bulge or cord visible — not reported",
    "Twin-wheel rubbing or debris trapped",
  ], { safetyCritical: true }),
  sec("audit-bodywork", "yard-audit", "audit", "Bodywork — unreported damage", "Walk all panels, bumpers and skirts. Compare to open defects and last walkaround.", [
    "New scratch, dent or panel damage",
    "Bumper or skirt impact damage",
    "Cracked or chipped window not logged",
    "Loose trim, mirror casing or skirt",
    "Damage not matching any open defect",
  ], { safetyCritical: true }),
  sec("audit-lights", "yard-audit", "audit", "Lights — passed but faulty", "Switch on and walk the vehicle. Drivers often miss lamps in poor light.", [
    "Inoperative head, tail or brake lamp",
    "Cracked lens or wrong colour",
    "Indicator or marker not flashing",
    "Fault not recorded on defect register",
  ], { safetyCritical: true }),
  sec("audit-brakes-wheels", "yard-audit", "audit", "Brakes & wheels — visual", "Look under and around wheels for leaks, heat and loose fixings.", [
    "Visible brake fluid or air leak",
    "Wheel nut missing or indicator moved",
    "Overheated brake or disc damage",
    "Issue not on defect register",
  ], { safetyCritical: true }),
  sec("audit-interior", "yard-audit", "audit", "Interior — passenger area", "Check seats, floors, gangways and fittings for unreported damage.", [
    "Seat damage or loose mounting",
    "Floor hole, trip hazard or loose cover",
    "Graffiti or vandalism not logged",
    "Grab rail or panel loose",
  ]),
  sec("audit-emergency", "yard-audit", "audit", "Emergency equipment", "Verify extinguishers, hammers, exits and first-aid against records.", [
    "Fire extinguisher missing or discharged",
    "First-aid kit missing or expired",
    "Emergency exit obstructed or sign dark",
    "Break-glass hammer missing",
  ], { safetyCritical: true }),
  sec("audit-accessibility", "yard-audit", "audit", "Accessibility — physical test", "Operate ramp/lift and check restraints match bookings.", [
    "Ramp or lift fault not reported",
    "Wheelchair restraint set missing",
    "Wheelchair space blocked or unsafe",
  ], { safetyCritical: true }),
  sec("audit-defect-register", "yard-audit", "audit", "Defect register cross-check", "Compare the system to what you see on the vehicle.", [
    "Open defect on system not visible on vehicle",
    "Physical fault with no defect raised",
    "Last driver check unreasonably quick",
    "Driver marked passed but faults obvious",
  ]),
  sec("audit-cleanliness", "yard-audit", "audit", "Cleanliness standard", "Vehicle below depot standard but marked acceptable.", [
    "Exterior not washed to standard",
    "Interior litter, staining or odour",
    "Cab untidy — may hide inspection gaps",
  ]),
];

export const ALL_CHECK_SECTIONS: CheckSectionDef[] = [
  ...DVSA_SECTIONS,
  ...YARD_READINESS_SECTIONS,
  ...EQUIPMENT_SECTIONS,
  ...JOB_SUITABILITY_SECTIONS,
  ...YARD_AUDIT_SECTIONS,
];

const SECTION_BY_ID = new Map(ALL_CHECK_SECTIONS.map(s => [s.id, s]));

export const CHECK_TYPE_LABELS: Record<YardCheckType, { label: string; description: string }> = {
  "start-of-day": { label: "Start of day", description: "Full DVSA walkaround before first use" },
  "driver-changeover": { label: "Driver changeover", description: "Cab, exterior and responsibility transfer" },
  "between-run": { label: "Between runs", description: "Targeted check after possible damage or equipment change" },
  "return-to-yard": { label: "Return to yard", description: "Record condition, fuel and new defects on return" },
  "yard-spot": {
    label: "Yard manager audit",
    description: "Full spot-bust inspection — find missed defects (bald tyres, unreported body damage, lights, etc.)",
  },
  "first-use": { label: "First use", description: "Enhanced inspection for new, hired or long-term VOR vehicles" },
  "vor-assessment": { label: "VOR assessment", description: "Assess removal from service" },
  "return-to-service": { label: "Return to service", description: "Confirm repair and authorised release" },
  "scheduled-inspection": { label: "Scheduled inspection", description: "Maintenance-interval technician inspection" },
};

const TYPE_SECTION_IDS: Record<YardCheckType, string[] | "all"> = {
  "start-of-day": "all",
  "first-use": "all",
  "driver-changeover": [
    ...DVSA_SECTIONS.filter(s => s.area === "cab").map(s => s.id),
    "tyres-wheels", "lights-indicators", "body-exterior", "vehicle-identity", "keys-available", "defects-closed",
  ],
  "between-run": [
    "tyres-wheels", "lights-indicators", "body-exterior", "passenger-doors-exits", "accessibility",
    "assigned-equipment", "wheelchair-job",
  ],
  "return-to-yard": [
    ...DVSA_SECTIONS.filter(s => ["exterior", "passenger"].includes(s.area)).map(s => s.id),
    ...YARD_READINESS_SECTIONS.map(s => s.id),
    "consumables",
  ],
  "yard-spot": [
    ...DVSA_SECTIONS.map(s => s.id),
    ...YARD_AUDIT_SECTIONS.map(s => s.id),
    "defects-closed",
    "cleanliness",
    "compliance",
    "permanent-safety",
    "assigned-equipment",
  ],
  "vor-assessment": DVSA_SECTIONS.filter(s => s.safetyCritical).map(s => s.id),
  "return-to-service": [
    ...DVSA_SECTIONS.filter(s => s.safetyCritical).map(s => s.id),
    "defects-closed", "compliance",
  ],
  "scheduled-inspection": DVSA_SECTIONS.map(s => s.id),
};

export function getSectionDef(sectionId: string): CheckSectionDef | undefined {
  return SECTION_BY_ID.get(sectionId);
}

export function isManagerAuditCheck(checkType: YardCheckType): boolean {
  return checkType === "yard-spot";
}

export function getSectionsForCheckType(checkType: YardCheckType): CheckSectionDef[] {
  const ids = TYPE_SECTION_IDS[checkType];
  if (ids === "all") return ALL_CHECK_SECTIONS;
  return ids.map(id => SECTION_BY_ID.get(id)).filter((s): s is CheckSectionDef => !!s);
}

export function dvsaGroupCount(): number {
  return DVSA_SECTIONS.length;
}
