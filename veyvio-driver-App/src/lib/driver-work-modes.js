/** How work types are grouped in the driver app (product terminology). */

/** Scheduled / operator-assigned route work — school, airport, council, etc. */
export const CONTRACT_TRANSPORT_JOB_TYPES = new Set([
  "school_run",
  "airport_transfer",
  "council_contract",
  "corporate_event",
  "rail_replacement",
  "local_service",
  "tour_day_trip",
  "accessible_transport",
  "medical_transport",
  "maintenance_movement",
  "depot_transfer",
  "empty_vehicle_movement",
]);

/** On-demand short private hire trips (customer app bookings, PCO dispatch). */
export const PCO_DISPATCH_JOB_TYPES = new Set(["private_hire"]);

export const WORK_MODE = {
  contract: {
    id: "contract",
    shortLabel: "PHV routes",
    label: "PHV routes",
    subtitle: "School, airport & scheduled work",
    description:
      "Pre-booked and assigned jobs — school runs, airport transfers, council contracts and other scheduled routes. Uses operator fleet vehicles assigned to you.",
    vehicleNote: "Use the fleet vehicle assigned to your route or job.",
    checkLabel: "Complete fleet vehicle check",
    onlineLabel: "Sign on for duty",
    onlinePath: "/duty",
    checkPath: "/check",
  },
  pco: {
    id: "pco",
    shortLabel: "PCO trips",
    label: "PCO trips",
    subtitle: "Private hire short trips",
    description:
      "On-demand private hire — short passenger trips booked through the app. You must use your own TfL-licensed PCO vehicle and badge.",
    vehicleNote: "Register and maintain your own PHV-licensed vehicle.",
    checkLabel: "Complete PCO vehicle check",
    onlineLabel: "Go online for PCO trips",
    onlinePath: "/duty",
    checkPath: "/check",
  },
};

export function isContractTransportJob(jobType) {
  return CONTRACT_TRANSPORT_JOB_TYPES.has(jobType);
}

export function isPcoDispatchJob(jobType) {
  return PCO_DISPATCH_JOB_TYPES.has(jobType) || Boolean(jobType === "private_hire");
}

export function driverHasContractTransport(driver) {
  return Boolean(driver?.canDoSchoolRuns || driver?.canDoCoachWork);
}

export function driverHasPcoDispatch(driver) {
  return Boolean(driver?.canDoPrivateHire);
}
