/**
 * Adapt Command bootstrap duties (school runs with stops) into the job shape
 * used by DriverJobsMapView / getJobExecutionState.
 *
 * Progress is stored locally so drivers can confirm arrive → pickup → complete
 * without a separate job_stops table for published Command duties.
 */

import { getJobExecutionState } from "@/lib/jobExecutionState";

const PROGRESS_KEY = (dutyId) => `veyvio.dutyNav.v1.${dutyId}`;

/** @type {{ getItem: Function, setItem: Function, removeItem: Function } | null} */
let storeOverride = null;

export function setDutyNavStoreForTests(store) {
  storeOverride = store;
}

export function createMemoryDutyNavStore() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function storage() {
  if (storeOverride) return storeOverride;
  if (typeof localStorage !== "undefined") return localStorage;
  return null;
}

function readCoord(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function flattenDutyStops(duty) {
  const runs = Array.isArray(duty?.runs) ? duty.runs : [];
  const stops = [];
  for (const run of runs) {
    for (const stop of run?.stops ?? []) {
      stops.push({ ...stop, runId: run.id ?? run.journeyId ?? null });
    }
  }
  return stops.sort((a, b) => Number(a.stopOrder ?? 0) - Number(b.stopOrder ?? 0));
}

export function dutyHasNavigableStops(duty) {
  return flattenDutyStops(duty).some((stop) => {
    const lat = readCoord(stop.latitude ?? stop.lat);
    const lng = readCoord(stop.longitude ?? stop.lng);
    return lat != null && lng != null;
  });
}

export function loadDutyNavProgress(dutyId) {
  const db = storage();
  if (!dutyId || !db) return null;
  try {
    const raw = db.getItem(PROGRESS_KEY(dutyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDutyNavProgress(dutyId, progress) {
  const db = storage();
  if (!dutyId || !db) return;
  try {
    db.setItem(PROGRESS_KEY(dutyId), JSON.stringify(progress));
  } catch {
    /* ignore quota */
  }
}

export function clearDutyNavProgress(dutyId) {
  const db = storage();
  if (!dutyId || !db) return;
  try {
    db.removeItem(PROGRESS_KEY(dutyId));
  } catch {
    /* ignore */
  }
}

function emptyProgress() {
  return { startedAt: null, stops: {}, pickups: {}, dropoffs: {} };
}

function mapStopStatus(raw, progressStatus) {
  if (progressStatus) return progressStatus;
  const s = String(raw ?? "scheduled");
  if (s === "completed" || s === "arrived" || s === "planned") return s;
  if (s === "done" || s === "complete") return "completed";
  return "planned";
}

function mapStopType(stop) {
  const kind = String(stop.kind ?? stop.stopType ?? "");
  if (kind.includes("drop")) return "dropoff";
  if (kind.includes("pick")) return "pickup";
  return stop.stopType ?? "stop";
}

function passengerLabel(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return null;
  const names = tasks.map((t) => t.passengerName).filter(Boolean);
  if (names.length === 1) return names[0];
  if (names.length > 1) return `${names[0]} +${names.length - 1}`;
  return `${tasks.length} passenger${tasks.length === 1 ? "" : "s"}`;
}

/**
 * @param {object} duty Command bootstrap duty
 * @param {{ autoStart?: boolean }} [opts]
 */
export function commandDutyToNavJob(duty, opts = {}) {
  if (!duty?.id) return null;

  const progress = { ...emptyProgress(), ...(loadDutyNavProgress(duty.id) ?? {}) };
  progress.stops = progress.stops ?? {};
  progress.pickups = progress.pickups ?? {};
  progress.dropoffs = progress.dropoffs ?? {};

  const signedOn = Boolean(duty.actualSignOnAt) || duty.lifecycleStatus === "in_progress";
  const autoStart = opts.autoStart !== false && signedOn;
  const startedAt =
    progress.startedAt ?? (autoStart ? duty.actualSignOnAt ?? new Date().toISOString() : null);

  if (autoStart && !progress.startedAt) {
    progress.startedAt = startedAt;
    saveDutyNavProgress(duty.id, progress);
  }

  const rawStops = flattenDutyStops(duty);
  const stops = rawStops.map((stop, index) => {
    const lat = readCoord(stop.latitude ?? stop.lat);
    const lng = readCoord(stop.longitude ?? stop.lng);
    const status = mapStopStatus(stop.status, progress.stops?.[stop.id]);
    const label = stop.name || stop.address || `Stop ${stop.stopOrder ?? index + 1}`;
    const passengerTasks = Array.isArray(stop.passengerTasks) ? stop.passengerTasks : [];
    const stopType = mapStopType(stop);
    return {
      id: String(stop.id),
      runId: stop.runId ? String(stop.runId) : null,
      label,
      shortLabel: label,
      address: stop.address || stop.name || "",
      sequence: Number(stop.stopOrder ?? index + 1),
      stopOrder: Number(stop.stopOrder ?? index + 1),
      stopType,
      arrivalTime: stop.plannedArrival ?? null,
      status,
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      passengerTasks,
      passengerLabel: passengerLabel(passengerTasks),
      pickupConfirmed: Boolean(progress.pickups?.[stop.id]),
      dropoffConfirmed: Boolean(progress.dropoffs?.[stop.id]),
    };
  });

  const vehicle = duty.vehicle;
  const reg = vehicle?.registrationNumber || vehicle?.registration || null;

  return {
    id: String(duty.id),
    source: "command_duty",
    routeName: duty.routeName || duty.reference || "Duty",
    reference: duty.reference ?? null,
    jobType: "school_duty",
    serviceDate: duty.dutyDate ?? null,
    startTime: duty.startTime ?? "",
    endTime: duty.endTime ?? "",
    status: startedAt ? "in_progress" : "assigned",
    vehicleRegistration: reg,
    vehicleId: vehicle?.id ?? null,
    needsAccept: false,
    assignment: {
      id: `duty-assign-${duty.id}`,
      status: startedAt ? "in_progress" : "accepted",
      acceptedAt: duty.actualSignOnAt ?? startedAt,
      startedAt,
    },
    stops,
    dutyId: String(duty.id),
    reportingLocation: duty.reportingLocation ?? null,
  };
}

function currentStopFromJob(job) {
  const stops = job?.stops ?? [];
  return (
    stops.find((s) => s.status === "arrived") ??
    stops.find((s) => s.status === "planned") ??
    null
  );
}

/** Resolve the Command run/journey id for a duty stop. */
export function resolveDutyJourneyId(duty, stop = null) {
  if (stop?.runId) return String(stop.runId);
  const runs = Array.isArray(duty?.runs) ? duty.runs : [];
  if (stop?.id) {
    for (const run of runs) {
      const match = (run.stops ?? []).some((row) => String(row.id) === String(stop.id));
      if (match) return String(run.journeyId ?? run.id);
    }
  }
  if (duty?.primaryJourneyId) return String(duty.primaryJourneyId);
  const first = runs[0];
  return first ? String(first.journeyId ?? first.id ?? "") : null;
}

/**
 * Validate a duty navigation action without persisting progress.
 * Used before server-backed journey transitions (F-08).
 */
export function validateDutyNavAction(duty, action) {
  const job = commandDutyToNavJob(duty, { autoStart: true });
  if (!job) return { ok: false, message: "Duty not found.", job: null };

  const progress = { ...emptyProgress(), ...(loadDutyNavProgress(duty.id) ?? {}) };
  const current = currentStopFromJob(job);

  if (action === "start") {
    return {
      ok: true,
      message: "Navigation started.",
      job,
      journeyId: resolveDutyJourneyId(duty, current),
      currentStop: current,
    };
  }

  if (action === "arrive") {
    if (!current || current.status === "arrived") {
      return { ok: false, message: "No stop to arrive at.", job };
    }
    return {
      ok: true,
      message: `Arrived at ${current.label}.`,
      job,
      journeyId: resolveDutyJourneyId(duty, current),
      currentStop: current,
      phase: "arrived",
    };
  }

  if (action === "confirm_pickup") {
    if (!current || current.status !== "arrived") {
      return { ok: false, message: "Arrive at the stop before confirming pickup.", job };
    }
    if (current.stopType !== "pickup") {
      return { ok: false, message: "This stop is not a pickup.", job };
    }
    const name = current.passengerLabel || "Passenger";
    return {
      ok: true,
      message: `${name} on board.`,
      job,
      journeyId: resolveDutyJourneyId(duty, current),
      currentStop: current,
      phase: "pickup_confirmed",
    };
  }

  if (action === "confirm_dropoff") {
    if (!current || current.status !== "arrived") {
      return { ok: false, message: "Arrive at the school before confirming drop-off.", job };
    }
    if (current.stopType !== "dropoff") {
      return { ok: false, message: "This stop is not a drop-off.", job };
    }
    return {
      ok: true,
      message: "Passengers handed to school staff.",
      job,
      journeyId: resolveDutyJourneyId(duty, current),
      currentStop: current,
      phase: "dropoff_confirmed",
    };
  }

  if (action === "complete_stop" || action === "complete_job") {
    const target =
      (job.stops ?? []).find((s) => s.status === "arrived") ??
      (job.stops ?? []).find((s) => s.status === "planned") ??
      null;
    if (!target) return { ok: false, message: "No stop to complete.", job };

    if (target.stopType === "pickup" && !target.pickupConfirmed) {
      return { ok: false, message: "Confirm pickup before leaving this stop.", job };
    }
    if (target.stopType === "dropoff" && !target.dropoffConfirmed) {
      return { ok: false, message: "Confirm drop-off before completing.", job };
    }

    const simulatedStops = { ...(progress.stops ?? {}), [target.id]: "completed" };
    const remaining =
      (job.stops ?? []).filter((stop) => simulatedStops[stop.id] !== "completed").length ?? 0;

    return {
      ok: true,
      message:
        remaining === 0 ? "Duty complete — all stops finished." : `Left ${target.label}.`,
      job,
      journeyId: resolveDutyJourneyId(duty, target),
      currentStop: target,
      allDoneAfter: remaining === 0,
      phase: remaining === 0 ? "duty_complete" : "stop_completed",
    };
  }

  return { ok: false, message: "Unknown action.", job };
}

export function applyDutyNavAction(duty, action) {
  const validation = validateDutyNavAction(duty, action);
  if (!validation.ok) return validation;

  const progress = { ...emptyProgress(), ...(loadDutyNavProgress(duty.id) ?? {}) };
  progress.stops = { ...(progress.stops ?? {}) };
  progress.pickups = { ...(progress.pickups ?? {}) };
  progress.dropoffs = { ...(progress.dropoffs ?? {}) };

  if (action === "start") {
    progress.startedAt = progress.startedAt ?? new Date().toISOString();
    saveDutyNavProgress(duty.id, progress);
    return { ...validation, job: commandDutyToNavJob(duty) };
  }

  const current = validation.currentStop;

  if (action === "arrive") {
    progress.startedAt = progress.startedAt ?? new Date().toISOString();
    progress.stops[current.id] = "arrived";
    saveDutyNavProgress(duty.id, progress);
    return { ...validation, job: commandDutyToNavJob(duty) };
  }

  if (action === "confirm_pickup") {
    progress.pickups[current.id] = true;
    saveDutyNavProgress(duty.id, progress);
    return { ...validation, job: commandDutyToNavJob(duty) };
  }

  if (action === "confirm_dropoff") {
    progress.dropoffs[current.id] = true;
    saveDutyNavProgress(duty.id, progress);
    return { ...validation, job: commandDutyToNavJob(duty) };
  }

  if (action === "complete_stop" || action === "complete_job") {
    progress.stops[current.id] = "completed";
    saveDutyNavProgress(duty.id, progress);
    const nextJob = commandDutyToNavJob(duty);
    return {
      ...validation,
      job: nextJob,
      allDone: validation.allDoneAfter,
    };
  }

  return validation;
}

/**
 * Drive a published Command duty through arrive → pickup/dropoff → complete
 * for every stop. Used by e2e tests and local dry-runs.
 */
export function runDutyJourneyToCompletion(duty, { maxSteps = 80 } = {}) {
  clearDutyNavProgress(duty.id);
  const events = [];
  let job = commandDutyToNavJob(duty, { autoStart: true });
  if (!job?.stops?.length) {
    return { ok: false, message: "Duty has no stops.", events, job };
  }

  for (let i = 0; i < maxSteps; i += 1) {
    const execution = getJobExecutionState(job, { isActive: true });
    const action = execution.primaryAction;
    if (!action) {
      return {
        ok: false,
        message: `No primary action at step ${i} (${execution.phase}).`,
        events,
        job,
      };
    }

    const result = applyDutyNavAction(duty, action);
    events.push({
      step: i + 1,
      phase: execution.phase,
      action,
      label: execution.primaryLabel,
      stopId: execution.currentStop?.id ?? null,
      stopLabel: execution.currentStop?.label ?? null,
      ok: result.ok,
      message: result.message,
      allDone: Boolean(result.allDone),
    });

    if (!result.ok) {
      return { ok: false, message: result.message, events, job: result.job };
    }

    job = result.job;
    if (result.allDone) {
      return { ok: true, message: result.message, events, job };
    }
  }

  return { ok: false, message: "Journey exceeded max steps.", events, job };
}
