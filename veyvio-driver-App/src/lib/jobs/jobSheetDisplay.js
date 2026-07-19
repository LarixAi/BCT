/** Labels and copy for the jobs map bottom sheet (Uber-style 3 levels). */

function readPassengerName(json) {
  if (!json || typeof json !== "object") return null;
  return (
    json.passenger_name ??
    json.passengerName ??
    json.contact_name ??
    json.contactName ??
    json.name ??
    null
  );
}

export function getJobCustomerName(job, currentStop = null) {
  const fromPickup = readPassengerName(job?.pickup);
  const fromDropoff = readPassengerName(job?.dropoff);
  return (
    job?.title ??
    fromPickup ??
    fromDropoff ??
    currentStop?.label ??
    job?.routeName ??
    "Passenger"
  );
}

/** One leg phrase only — pickup OR drop-off, never both. */
export function getActiveLegPhrase(job, currentStop, phase) {
  if (!currentStop) {
    if (job?.pickupLabel) return { verb: "Pick up", name: getJobCustomerName(job) };
    return { verb: "Job", name: job?.routeName ?? "Active job" };
  }

  const name = getJobCustomerName(job, currentStop);
  const type = currentStop.stopType;

  if (phase === "at_stop") {
    if (type === "pickup") return { verb: "At pickup", name };
    if (type === "dropoff") return { verb: "At drop-off", name };
    return { verb: "At stop", name: currentStop.label ?? name };
  }

  if (type === "pickup") return { verb: "Picking up", name };
  if (type === "dropoff") return { verb: "Dropping off", name };
  return { verb: "En route to", name: currentStop.label ?? name };
}

export function formatJobTypeLabel(jobType) {
  if (!jobType) return null;
  return String(jobType).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getStopTypeHeading(stop) {
  if (!stop) return "Stop";
  if (stop.stopType === "pickup") return "Pick-up";
  if (stop.stopType === "dropoff") return "Drop-off";
  return "Stop";
}

export function buildActionButtonLabel(execution, job) {
  if (!execution?.primaryLabel) return "";
  if (job?.source === "command_duty") return execution.primaryLabel;
  const vehicle = job?.vehicleRegistration;
  if (
    (execution.primaryAction === "complete_job" || execution.primaryAction === "complete_stop") &&
    vehicle
  ) {
    return `Complete ${vehicle}`;
  }
  return execution.primaryLabel;
}

export function formatEtaDistance(eta, distance) {
  const parts = [];
  if (eta) parts.push(eta);
  if (distance) parts.push(distance);
  return parts.length ? parts.join(" · ") : "Calculating…";
}
