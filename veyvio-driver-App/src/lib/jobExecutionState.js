/**
 * Driver job execution phases — drives map sheet actions and admin-visible events.
 */

import { isPhvCustomerBookingJob, phvAdvanceLabel } from "@/services/customer-phv-job.service";

const STARTED_JOB_STATUSES = new Set([
  "in_progress",
  "en_route",
  "en_route_to_pickup",
  "arrived_at_pickup",
  "passenger_boarding",
]);

function stopLat(stop) {
  const n = Number(stop?.lat ?? stop?.latitude);
  return Number.isFinite(n) ? n : null;
}

function stopLng(stop) {
  const n = Number(stop?.lng ?? stop?.longitude);
  return Number.isFinite(n) ? n : null;
}

function withStopCoords(stop) {
  if (!stop) return null;
  const lat = stopLat(stop);
  const lng = stopLng(stop);
  return { ...stop, lat, lng, latitude: lat, longitude: lng };
}

function nextActionableStop(stops) {
  if (!stops?.length) return null;
  const arrived = stops.find((s) => s.status === "arrived");
  if (arrived) return withStopCoords(arrived);
  const planned = stops.find((s) => s.status === "planned" || s.status === "scheduled");
  return withStopCoords(planned ?? null);
}

function isJobStarted(job) {
  if (job?.assignment?.startedAt) return true;
  return STARTED_JOB_STATUSES.has(job?.status ?? "");
}

function isTerminal(job) {
  return job?.status === "completed" || job?.status === "cancelled";
}

function destinationLabelForStop(stop) {
  if (!stop) return "";
  return stop.shortLabel ?? stop.label ?? "next stop";
}

function buildNavigationFields(job, currentStop, isActive) {
  const started = isJobStarted(job);
  const hasCoords = stopLat(currentStop) != null && stopLng(currentStop) != null;
  const phase =
    currentStop?.status === "arrived"
      ? "at_stop"
      : currentStop
        ? "en_route"
        : null;

  const navigationActive =
    Boolean(job) &&
    isActive &&
    started &&
    (phase === "en_route" || phase === "at_stop") &&
    hasCoords;

  return {
    navigationActive,
    destinationLabel: destinationLabelForStop(currentStop),
    phase: phase ?? (started ? "in_progress" : "ready"),
  };
}

/**
 * @returns {{
 *   phase: string;
 *   navigationActive: boolean;
 *   destinationLabel: string;
 *   peekTitle: string;
 *   peekSub: string;
 *   primaryAction: 'accept'|'start'|'phv_advance'|'arrive'|'complete_stop'|'complete_job'|null;
 *   primaryLabel: string;
 *   secondaryLabel?: string;
 *   currentStop: object|null;
 *   progressLabel: string;
 * }}
 */
export function getJobExecutionState(job, options = {}) {
  const { isActive = true } = options;

  if (!job) {
    return {
      phase: "idle",
      navigationActive: false,
      destinationLabel: "",
      peekTitle: "No active job",
      peekSub: "Your assigned runs appear on the overview",
      primaryAction: null,
      primaryLabel: "",
      currentStop: null,
      progressLabel: "",
    };
  }

  if (isTerminal(job)) {
    return {
      phase: "done",
      navigationActive: false,
      destinationLabel: "",
      peekTitle: job.routeName,
      peekSub: job.status === "completed" ? "Job completed" : "Job cancelled",
      primaryAction: null,
      primaryLabel: "",
      currentStop: null,
      progressLabel: "",
    };
  }

  const completed = job.stops?.filter((s) => s.status === "completed").length ?? 0;
  const total = job.stops?.length ?? 0;
  const progressLabel = total > 0 ? `${completed}/${total} stops done` : "";

  if (job.needsAccept) {
    return {
      phase: "needs_accept",
      navigationActive: false,
      destinationLabel: "",
      peekTitle: job.routeName,
      peekSub: `${job.startTime} · Accept to begin`,
      primaryAction: "accept",
      primaryLabel: "Accept assignment",
      currentStop: null,
      progressLabel,
    };
  }

  if (!isJobStarted(job)) {
    const firstStop = withStopCoords(job.stops?.[0] ?? null);
    const phvLabel =
      isPhvCustomerBookingJob(job) && isActive ? phvAdvanceLabel(job.status) : null;

    if (phvLabel) {
      return {
        phase: "accepted",
        navigationActive: false,
        destinationLabel: destinationLabelForStop(firstStop),
        peekTitle: job.routeName,
        peekSub: `${job.startTime}${job.vehicleRegistration ? ` · ${job.vehicleRegistration}` : ""}`,
        primaryAction: "phv_advance",
        primaryLabel: phvLabel,
        currentStop: firstStop,
        progressLabel,
      };
    }

    return {
      phase: "accepted",
      navigationActive: false,
      destinationLabel: destinationLabelForStop(firstStop),
      peekTitle: job.routeName,
      peekSub: isActive
        ? `${job.startTime}${job.vehicleRegistration ? ` · ${job.vehicleRegistration}` : ""}`
        : `${job.startTime} · Start when this is your active job`,
      primaryAction: isActive ? "start" : null,
      primaryLabel: "Start job",
      currentStop: firstStop,
      progressLabel,
    };
  }

  if (!isActive) {
    return {
      phase: "inactive",
      navigationActive: false,
      destinationLabel: "",
      peekTitle: job.routeName,
      peekSub: `${job.startTime} · Not your active job`,
      primaryAction: null,
      primaryLabel: "",
      currentStop: null,
      progressLabel,
    };
  }

  const currentStop = nextActionableStop(job.stops);
  const allDone = total > 0 && completed >= total;
  const navFields = buildNavigationFields(job, currentStop, isActive);

  if (currentStop && (stopLat(currentStop) == null || stopLng(currentStop) == null)) {
    return {
      ...navFields,
      phase: "missing_stop_location",
      navigationActive: false,
      peekTitle: "Stop location missing",
      peekSub: currentStop.label ?? job.routeName,
      primaryAction: null,
      primaryLabel: "",
      currentStop,
      progressLabel,
    };
  }

  if (!currentStop && allDone) {
    return {
      phase: "all_stops_done",
      navigationActive: false,
      destinationLabel: "",
      peekTitle: job.routeName,
      peekSub: "All stops completed",
      primaryAction: "complete_job",
      primaryLabel: "Complete job",
      currentStop: null,
      progressLabel,
    };
  }

  if (currentStop?.status === "arrived") {
    const isPickup = currentStop.stopType === "pickup";
    const isDropoff = currentStop.stopType === "dropoff";
    const passengerBit = currentStop.passengerLabel
      ? ` · ${currentStop.passengerLabel}`
      : "";

    // School / Command duties: confirm boarding before leaving a pickup.
    if (isPickup && job.source === "command_duty" && !currentStop.pickupConfirmed) {
      return {
        ...navFields,
        phase: "boarding",
        peekTitle: `At ${currentStop.label}`,
        peekSub: `Confirm passenger on board${passengerBit}`,
        primaryAction: "confirm_pickup",
        primaryLabel: currentStop.passengerLabel
          ? `Confirm pickup — ${currentStop.passengerLabel}`
          : "Confirm pickup",
        currentStop,
        progressLabel,
      };
    }

    if (isDropoff && job.source === "command_duty" && !currentStop.dropoffConfirmed) {
      return {
        ...navFields,
        phase: "handover",
        peekTitle: `At ${currentStop.label}`,
        peekSub: "Confirm passengers handed to school staff",
        primaryAction: "confirm_dropoff",
        primaryLabel: "Confirm drop-off",
        currentStop,
        progressLabel,
      };
    }

    const completeLabel = isDropoff ? "Complete job" : "Leave stop";
    return {
      ...navFields,
      phase: "at_stop",
      peekTitle: `At ${currentStop.label}`,
      peekSub: currentStop.address ?? job.routeName,
      primaryAction: isDropoff ? "complete_job" : "complete_stop",
      primaryLabel: completeLabel,
      secondaryLabel: "Leave stop",
      currentStop,
      progressLabel,
    };
  }

  if (currentStop) {
    const typeLabel = currentStop.stopType === "dropoff" ? "Drop-off" : "Pickup";
    return {
      ...navFields,
      phase: "en_route",
      peekTitle: `En route to ${currentStop.label}`,
      peekSub: `${typeLabel} · ${progressLabel || job.startTime}`,
      primaryAction: "arrive",
      primaryLabel: "I've arrived",
      currentStop,
      progressLabel,
    };
  }

  return {
    phase: "in_progress",
    navigationActive: false,
    destinationLabel: "",
    peekTitle: job.routeName,
    peekSub: progressLabel || "Job in progress",
    primaryAction: "complete_job",
    primaryLabel: "Complete job",
    currentStop: null,
    progressLabel,
  };
}
