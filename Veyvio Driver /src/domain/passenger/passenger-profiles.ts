import type { PassengerProfile } from "@/types/passenger";

/**
 * Representative passenger profiles aligned with passenger-centred journey training.
 * Stored as operational data — not training content.
 */
export const PASSENGER_PROFILES: Record<string, PassengerProfile> = {
  pax_dalvinder: {
    id: "pax_dalvinder",
    displayName: "Dalvinder Singh",
    preferredName: "Dalvinder",
    ageGroup: "adult",
    mobilityCategory: "visual_impairment",
    assistanceLevel: "light",
    wheelchairUser: false,
    usesMobilityAid: true,
    assistanceAnimal: false,
    communicationNotes: [
      "Introduce yourself by name when arriving",
      "Confirm destination before setting off",
      "Describe manoeuvres — do not rely on gestures alone",
    ],
    boardingAssistance: [
      "Guide to vehicle door if requested",
      "Confirm seat location verbally",
    ],
    inVehicleAssistance: [
      "Announce arrival at stop before braking",
      "Confirm safe place to alight",
    ],
    accessibilityNeeds: [
      { id: "vis_guide", label: "Visual impairment", driverAction: "Use clear verbal guidance throughout the journey" },
      { id: "vis_apps", label: "Assistance apps", driverAction: "Allow time for passenger to use phone assistance features at pickup" },
    ],
    vulnerabilityFlag: false,
    journeySummary: "Blind passenger — clear verbal guidance essential",
  },
  pax_siobhan: {
    id: "pax_siobhan",
    displayName: "Siobhan O'Neill",
    preferredName: "Siobhan",
    ageGroup: "adult",
    mobilityCategory: "wheelchair_user",
    assistanceLevel: "full",
    wheelchairUser: true,
    usesMobilityAid: true,
    assistanceAnimal: false,
    communicationNotes: [
      "Ask before moving wheelchair",
      "Allow extra time for boarding — joint pain can slow movement",
    ],
    boardingAssistance: [
      "Deploy ramp or lift before approaching wheelchair",
      "Secure wheelchair restraint before moving off",
      "Check passenger is comfortable and brakes applied",
    ],
    inVehicleAssistance: [
      "Avoid sudden braking where possible",
      "Check restraint remains secure at each stop",
    ],
    accessibilityNeeds: [
      { id: "wc_restraint", label: "Wheelchair restraint", driverAction: "Full restraint check required before departure" },
      { id: "wc_ramp", label: "Ramp or lift", driverAction: "Use rear access — allow time for loading" },
      { id: "hidden_eds", label: "Hidden disability (EDS)", driverAction: "Extra time and gentle handling — pain and fatigue" },
    ],
    vulnerabilityFlag: false,
    journeySummary: "Wheelchair user — ramp, restraint, and extra boarding time",
  },
  pax_mark: {
    id: "pax_mark",
    displayName: "Mark Hughes",
    preferredName: "Mark",
    ageGroup: "young_adult",
    mobilityCategory: "learning_disability",
    assistanceLevel: "light",
    wheelchairUser: false,
    usesMobilityAid: false,
    assistanceAnimal: false,
    communicationNotes: [
      "Use simple, clear language",
      "Repeat instructions if needed — do not rush",
      "Confirm understanding before moving off",
    ],
    boardingAssistance: [
      "Ensure ramp or step access is deployed",
      "Clear signage visible from approach",
    ],
    inVehicleAssistance: [
      "Remind of next stop in plain language",
      "Escort to handover point at destination",
    ],
    handoverRequirements: "Hand to named staff at Learning for Life reception — do not leave unattended",
    safeguardingNotes: "Vulnerable adult — confirmed handover required",
    accessibilityNeeds: [
      { id: "learn_simple", label: "Learning disability", driverAction: "Simple language, patience, confirmed handover" },
      { id: "access_ramp", label: "Step-free access", driverAction: "Ramp deployed and signs visible before boarding" },
    ],
    vulnerabilityFlag: true,
    journeySummary: "Learning disability — simple language and staff handover",
  },
  pax_angie: {
    id: "pax_angie",
    displayName: "Angie Thornton",
    preferredName: "Angie",
    ageGroup: "adult",
    mobilityCategory: "hidden_disability",
    assistanceLevel: "light",
    wheelchairUser: false,
    usesMobilityAid: false,
    assistanceAnimal: true,
    assistanceAnimalNotes: "Assistance dog Annie — small breed, travels on floor at passenger's feet",
    communicationNotes: [
      "Do not distract or pet assistance dog",
      "Dog must remain with passenger throughout",
    ],
    boardingAssistance: [
      "Ensure space at passenger seat for assistance dog",
    ],
    inVehicleAssistance: [
      "Do not ask passenger to move dog unless safety-critical",
    ],
    accessibilityNeeds: [
      { id: "assist_dog", label: "Assistance dog on board", driverAction: "Do not separate dog from passenger — floor space required" },
      { id: "hidden_fatigue", label: "Hidden disability", driverAction: "Reliable, friendly service — fatigue can affect travel" },
    ],
    vulnerabilityFlag: false,
    journeySummary: "Assistance dog on board — do not separate from passenger",
  },
  pax_amelia: {
    id: "pax_amelia",
    displayName: "Amelia Clarke",
    preferredName: "Amelia",
    ageGroup: "child",
    mobilityCategory: "wheelchair_user",
    assistanceLevel: "full",
    wheelchairUser: true,
    usesMobilityAid: true,
    assistanceAnimal: false,
    communicationNotes: [
      "Speak to Amelia directly, not only to parent or escort",
    ],
    boardingAssistance: [
      "Rear lift — wheelchair restraint required",
      "Parent or escort may assist loading",
    ],
    inVehicleAssistance: [
      "Check restraint before each movement",
    ],
    handoverRequirements: "Hand to reception staff only at school",
    safeguardingNotes: "Child passenger — school handover protocol applies",
    accessibilityNeeds: [
      { id: "wc_child", label: "Child wheelchair user", driverAction: "Restraint check and school handover to staff" },
    ],
    vulnerabilityFlag: true,
    journeySummary: "Child wheelchair user — restraint and school handover",
  },
};

export function getPassengerProfile(passengerId: string): PassengerProfile | null {
  return PASSENGER_PROFILES[passengerId] ?? null;
}

export function mobilityCategoryLabel(category: PassengerProfile["mobilityCategory"]): string {
  const labels: Record<PassengerProfile["mobilityCategory"], string> = {
    ambulatory: "Ambulatory",
    wheelchair_user: "Wheelchair user",
    visual_impairment: "Visual impairment",
    learning_disability: "Learning disability",
    hidden_disability: "Hidden disability",
    other: "Other mobility need",
  };
  return labels[category];
}

export function listProfilesForDuty(passengerIds: string[]): PassengerProfile[] {
  return passengerIds
    .map((id) => getPassengerProfile(id))
    .filter((profile): profile is PassengerProfile => profile != null);
}

export function uniquePassengerIdsFromDuty(
  runs: { stops: { passengerTasks: { passengerId: string }[] }[] }[],
): string[] {
  const ids = runs.flatMap((run) =>
    run.stops.flatMap((stop) => stop.passengerTasks.map((task) => task.passengerId)),
  );
  return Array.from(new Set(ids));
}
