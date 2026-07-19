/** PSV driver incident intake — mirrors src/lib/incidents/driver-intake.ts (form version psv-1). */

export const DRIVER_INTAKE_FORM_VERSION = "psv-1";

export const PSV_INCIDENT_TYPE_OPTIONS = [
  { id: "collision_vehicle", label: "Collision with vehicle" },
  { id: "collision_pedestrian", label: "Collision with pedestrian" },
  { id: "passenger_injury", label: "Passenger injury (slip/trip/fall)" },
  { id: "assault_abuse", label: "Assault / abuse" },
  { id: "vehicle_defect", label: "Vehicle defect / breakdown" },
  { id: "near_miss", label: "Near miss" },
  { id: "property_damage", label: "Damage to property" },
  { id: "security", label: "Security incident" },
];

export const WIZARD_STEPS = [
  { id: "vehicle", title: "Vehicle", subtitle: "Registration, route & depot" },
  { id: "driver", title: "Driver", subtitle: "Duty & licence context" },
  { id: "conditions", title: "When & where", subtitle: "Time, location & conditions" },
  { id: "incidentTypes", title: "Type", subtitle: "What kind of incident" },
  { id: "passengers", title: "Passengers", subtitle: "Onboard & vulnerable" },
  { id: "sequence", title: "Events", subtitle: "Full sequence" },
  { id: "thirdParty", title: "Third party", subtitle: "Other vehicles / people" },
  { id: "witnesses", title: "Witnesses", subtitle: "Statements & police" },
  { id: "cctv", title: "CCTV", subtitle: "Cameras & telematics" },
  { id: "damage", title: "Damage", subtitle: "Vehicle & injuries" },
  { id: "emergency", title: "Emergency", subtitle: "Services & vehicle status" },
  { id: "compliance", title: "Compliance", subtitle: "Policy & photos" },
];

const TYPE_TO_INCIDENT = {
  collision_vehicle: "road_collision",
  collision_pedestrian: "road_collision",
  passenger_injury: "passenger_injury",
  assault_abuse: "passenger_behaviour",
  vehicle_defect: "vehicle_safety_defect",
  near_miss: "near_miss",
  property_damage: "other",
  security: "safeguarding_concern",
};

export function derivePrimaryIncidentType(selected) {
  for (const id of selected) {
    const mapped = TYPE_TO_INCIDENT[id];
    if (mapped) return mapped;
  }
  return "other";
}

export function buildEmptyIntakeForm() {
  return {
    severity: "moderate",
    bookingRef: "",
    vehicle: {
      registration: "",
      fleetNumber: "",
      vehicleType: "",
      routeServiceNumber: "",
      directionOfTravel: "",
      depotBase: "",
    },
    driver: {
      fullName: "",
      employeeId: "",
      licenceCategory: "",
      licenceValidUntil: "",
      dutyStartTime: "",
      hoursDrivenBeforeIncident: "",
      restBreaksTaken: "",
    },
    conditions: {
      occurredAt: "",
      location: "",
      stopNumber: "",
      postcode: "",
      lat: null,
      lng: null,
      weather: "",
      roadConditions: "",
      trafficConditions: "",
      speedMph: "",
    },
    incidentTypes: { selected: [], otherDescription: "" },
    passengers: {
      countOnboard: "",
      injuredCount: "",
      namesAndContacts: "",
      seatingLocation: "",
      vulnerableInvolved: false,
      vulnerableNotes: "",
    },
    sequence: {
      before: "",
      driverActions: "",
      passengerActions: "",
      roadUserActions: "",
      after: "",
    },
    thirdParty: {
      involved: false,
      name: "",
      registration: "",
      insurance: "",
      contact: "",
      companyName: "",
    },
    witnesses: {
      passengers: "",
      publicWitnesses: "",
      otherStaff: "",
      policeDetails: "",
    },
    cctvTelematics: {
      cctvWorking: null,
      cameraReferences: "",
      dashcamFootage: null,
      telematicsAvailable: null,
      harshBrakingAlerts: "",
      speedLogs: "",
    },
    damageInjury: {
      vehicleDamageLocation: "",
      vehicleDamageSeverity: "",
      passengerInjuries: "",
      driverInjuries: "",
      thirdPartyInjuries: "",
    },
    emergencyResponse: {
      ambulanceCalled: false,
      policeAttended: false,
      supervisorAttended: false,
      vehicleOutOfService: false,
      replacementBusSent: false,
      notes: "",
    },
    compliance: {
      followingCompanyPolicy: null,
      seatbeltPolicyFollowed: null,
      boardingAlightingCorrect: null,
      defectChecksCompleted: null,
      reportedImmediately: null,
      notes: "",
    },
    photos: [],
  };
}

export function buildIntakeSnapshot(form, { sosContext, photoCount }) {
  const now = new Date().toISOString();
  return {
    formVersion: DRIVER_INTAKE_FORM_VERSION,
    submittedAt: now,
    severity: form.severity,
    bookingRef: form.bookingRef?.trim() ?? "",
    sosContext: sosContext ?? null,
    vehicle: { ...form.vehicle },
    driver: { ...form.driver },
    conditions: { ...form.conditions },
    incidentTypes: { ...form.incidentTypes, selected: [...form.incidentTypes.selected] },
    passengers: { ...form.passengers },
    sequence: { ...form.sequence },
    thirdParty: { ...form.thirdParty },
    witnesses: { ...form.witnesses },
    cctvTelematics: { ...form.cctvTelematics },
    damageInjury: { ...form.damageInjury },
    emergencyResponse: { ...form.emergencyResponse },
    compliance: { ...form.compliance },
    photoCount,
  };
}

export function shortPlaceForIncidentTitle(location, postcode) {
  if (postcode?.trim()) return postcode.trim();
  const loc = location?.trim();
  if (!loc) return "";
  const first = loc.split(",")[0]?.trim() ?? loc;
  return first.length > 60 ? `${first.slice(0, 59)}…` : first;
}

export function buildTitleFromIntake(intake) {
  const labels = intake.incidentTypes.selected
    .map((id) => PSV_INCIDENT_TYPE_OPTIONS.find((o) => o.id === id)?.label)
    .filter(Boolean);
  const typePart = intake.sosContext?.sosLabel || labels[0] || "Incident";
  const place = shortPlaceForIncidentTitle(intake.conditions.location, intake.conditions.postcode);
  if (place) return `${typePart} — ${place}`.slice(0, 120);
  return typePart.slice(0, 120);
}

export function buildNarrativeFromIntake(intake) {
  const parts = [];
  const { sequence: seq } = intake;
  const blocks = [
    ["Before", seq.before],
    ["Driver actions", seq.driverActions],
    ["Passenger actions", seq.passengerActions],
    ["Road user actions", seq.roadUserActions],
    ["After", seq.after],
  ];
  for (const [label, text] of blocks) {
    if (text?.trim()) parts.push(`${label}:\n${text.trim()}`);
  }
  if (intake.bookingRef?.trim()) parts.unshift(`Booking ref: ${intake.bookingRef.trim()}`);
  if (intake.compliance.notes?.trim()) parts.push(`Compliance notes:\n${intake.compliance.notes.trim()}`);
  return parts.join("\n\n").slice(0, 5000);
}
