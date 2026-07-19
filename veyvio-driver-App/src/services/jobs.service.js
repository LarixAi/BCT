import { getSupabaseClient } from "@/lib/supabase/client";
import { localToday } from "@/lib/local-date";
import { notifyDispatcher } from "@/services/notifications.service";
import { logDriverAudit } from "@/services/audit.service";
import { getPendingJobOffers } from "@/services/job-offers.service";
import { checkDriverLicenceEligibilityForJob } from "@/services/licence-compliance.service";
import { loadDriverJobManifest } from "@/services/job-manifest.service";
import { formatUkTime } from "@/lib/uk-locale";

function formatJobTime(iso) {
  return formatUkTime(iso);
}

const TERMINAL_JOB_STATUSES = new Set(["completed", "cancelled"]);
const ACTIVE_JOB_STATUSES = new Set(["planned", "assigned", "check_pending", "draft"]);

async function loadDriverAssignment(jobId, driverId) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("job_assignments")
    .select("id, status, accepted_at, started_at")
    .eq("job_id", jobId)
    .eq("driver_id", driverId)
    .eq("is_current", true)
    .maybeSingle();
  return data;
}

async function loadJobContext(jobId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, organisation_id, status, route_name, depot_id")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

async function insertJobStopEvent({
  organisationId,
  jobId,
  jobStopId = null,
  driverId,
  eventType,
  notes = null,
  metadata = {},
}) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const assignment = await loadDriverAssignment(jobId, driverId);

  const { error } = await supabase.from("job_stop_events").insert({
    organisation_id: organisationId,
    job_id: jobId,
    job_stop_id: jobStopId ?? null,
    driver_id: driverId,
    event_type: eventType,
    notes: notes ?? null,
    metadata: metadata ?? null,
    created_by: user?.id ?? null,
  });

  if (error) return error.message;

  if (eventType === "job_completed" && assignment?.id) {
    await supabase
      .from("job_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", assignment.id);
  }

  return null;
}

const HUB_TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

/** Match admin jobs board window — driver_jobs_today only returns service_date = today. */
function driverJobsDateWindow() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 14);
  const to = new Date(today);
  to.setDate(to.getDate() + 30);
  return {
    fromIso: from.toISOString().slice(0, 10),
    toIso: to.toISOString().slice(0, 10),
    todayIso: today.toISOString().slice(0, 10),
  };
}

async function loadDriverAssignedJobRows(driverId) {
  const supabase = getSupabaseClient();
  const { fromIso, toIso } = driverJobsDateWindow();

  const { data: assignments, error } = await supabase
    .from("job_assignments")
    .select(`
      id,
      status,
      accepted_at,
      started_at,
      vehicle_id,
      jobs!job_assignments_job_id_fkey!inner (
        id,
        organisation_id,
        route_name,
        service_date,
        scheduled_start_at,
        status,
        pickup_json,
        dropoff_json,
        customer_booking_id
      ),
      vehicles!job_assignments_vehicle_id_fkey (registration)
    `)
    .eq("driver_id", driverId)
    .eq("is_current", true);

  if (error) throw new Error(error.message);

  return (assignments ?? [])
    .map((row) => {
      const job = row.jobs;
      if (!job) return null;
      return {
        job_id: job.id,
        organisation_id: job.organisation_id,
        route_name: job.route_name,
        service_date: job.service_date,
        scheduled_start_at: job.scheduled_start_at,
        status: job.status,
        vehicle_id: row.vehicle_id,
        vehicle_registration: row.vehicles?.registration ?? null,
        pickup_json: job.pickup_json,
        dropoff_json: job.dropoff_json,
        customer_booking_id: job.customer_booking_id,
        _assignment: {
          id: row.id,
          status: row.status,
          accepted_at: row.accepted_at,
          started_at: row.started_at,
        },
      };
    })
    .filter(Boolean)
    .filter(
      (row) =>
        row.service_date >= fromIso &&
        row.service_date <= toIso &&
        !HUB_TERMINAL_STATUSES.has(row.status),
    )
    .sort((a, b) => String(a.scheduled_start_at).localeCompare(String(b.scheduled_start_at)));
}

export async function getDriverJobsToday() {
  const { todayIso } = driverJobsDateWindow();
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
  if (!driver?.id) {
    const { data, error } = await supabase
      .from("driver_jobs_today")
      .select("*")
      .order("scheduled_start_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.job_id,
      routeName: row.route_name ?? "Job",
      serviceDate: row.service_date,
      startTime: formatJobTime(row.scheduled_start_at),
      scheduledStartAt: row.scheduled_start_at,
      status: row.status ?? "assigned",
      vehicleRegistration: row.vehicle_registration ?? null,
      vehicleId: row.vehicle_id,
      pickup: row.pickup_json,
      dropoff: row.dropoff_json,
    }));
  }

  const rows = await loadDriverAssignedJobRows(driver.id);
  return rows
    .filter((row) => row.service_date === todayIso)
    .map((row) => ({
      id: row.job_id,
      routeName: row.route_name ?? "Job",
      serviceDate: row.service_date,
      startTime: formatJobTime(row.scheduled_start_at),
      scheduledStartAt: row.scheduled_start_at,
      status: row.status ?? "assigned",
      vehicleRegistration: row.vehicle_registration ?? null,
      vehicleId: row.vehicle_id,
      pickup: row.pickup_json,
      dropoff: row.dropoff_json,
    }));
}

function isJobInActiveWindow(scheduledStartAt) {
  if (!scheduledStartAt) return true;
  const startMs = new Date(scheduledStartAt).getTime();
  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return startMs <= now + twoHoursMs;
}

function pickCurrentJob(jobs) {
  const { todayIso } = driverJobsDateWindow();
  const todayJobs = jobs.filter((j) => j.serviceDate === todayIso);
  const candidates = todayJobs.length > 0 ? todayJobs : jobs;

  const inProgress = candidates.find((j) => j.status === "in_progress");
  if (inProgress) return inProgress;

  const acceptedActive = candidates.find(
    (j) =>
      !HUB_TERMINAL_STATUSES.has(j.status) &&
      j.assignmentAccepted &&
      isJobInActiveWindow(j.scheduledStartAt),
  );
  if (acceptedActive) return acceptedActive;

  return (
    candidates.find(
      (j) =>
        !HUB_TERMINAL_STATUSES.has(j.status) &&
        isJobInActiveWindow(j.scheduledStartAt),
    ) ?? null
  );
}

function mapHubOffer(offer) {
  const job = offer.job ?? {};
  return {
    id: offer.id,
    jobId: offer.job_id,
    routeName: job.route_name ?? "Job offer",
    jobNumber: job.job_number ?? null,
    serviceDate: job.service_date,
    startTime: formatJobTime(job.scheduled_start_at),
    scheduledStartAt: job.scheduled_start_at,
    passengerCount: job.passenger_count ?? null,
    pickup: job.pickup_json,
    dropoff: job.dropoff_json,
    expiresAt: offer.expires_at,
    offeredAt: offer.offered_at,
  };
}

export async function getDriverJobsHub(driverId) {
  const supabase = getSupabaseClient();

  const [rows, offers] = await Promise.all([
    driverId ? loadDriverAssignedJobRows(driverId) : Promise.resolve([]),
    driverId ? getPendingJobOffers(driverId) : Promise.resolve([]),
  ]);

  const jobIds = rows.map((r) => r.job_id).filter(Boolean);

  let stopsByJob = {};

  if (jobIds.length > 0) {
    const { data: stops } = await supabase
      .from("job_stops")
      .select("id, job_id, label, address, stop_order, planned_time, status, latitude, longitude, stop_type")
      .in("job_id", jobIds)
      .order("stop_order");

    for (const stop of stops ?? []) {
      if (!stopsByJob[stop.job_id]) stopsByJob[stop.job_id] = [];
      stopsByJob[stop.job_id].push(stop);
    }
  }

  const { normalizeHubStop, locationLabel } = await import("@/lib/jobMapCoords");
  const { enrichJobForPhvCard } = await import("@/lib/phvTripCard");

  const jobs = rows.map((row) => {
    const assignment = row._assignment;
    const rawStops = stopsByJob[row.job_id] ?? [];
    const stops = rawStops.map((s, i) =>
      normalizeHubStop(s, i, rawStops.length, row.pickup_json, row.dropoff_json),
    );

    return enrichJobForPhvCard({
      id: row.job_id,
      organisationId: row.organisation_id ?? null,
      routeName: row.route_name ?? "Job",
      serviceDate: row.service_date,
      startTime: formatJobTime(row.scheduled_start_at),
      scheduledStartAt: row.scheduled_start_at,
      status: row.status ?? "assigned",
      vehicleRegistration: row.vehicle_registration ?? null,
      vehicleId: row.vehicle_id,
      customerBookingId: row.customer_booking_id ?? null,
      pickupLabel: locationLabel(row.pickup_json, "Pickup"),
      dropoffLabel: locationLabel(row.dropoff_json, "Drop-off"),
      pickup: row.pickup_json,
      dropoff: row.dropoff_json,
      stops,
      assignment: assignment
        ? {
            id: assignment.id,
            status: assignment.status,
            acceptedAt: assignment.accepted_at,
            startedAt: assignment.started_at,
          }
        : null,
      assignmentAccepted: Boolean(assignment?.accepted_at),
      needsAccept: Boolean(assignment && !assignment.accepted_at),
    });
  });

  const current = pickCurrentJob(jobs);
  const upcoming = jobs.filter((j) => j.id !== current?.id && !HUB_TERMINAL_STATUSES.has(j.status));
  const today = localToday();
  const completedToday = jobs.filter(
    (j) => j.status === "completed" && j.serviceDate === today && j.id !== current?.id,
  );
  const unclaimed = (offers ?? []).map(mapHubOffer);

  return { current, upcoming, completedToday, unclaimed, allJobs: jobs };
}

export async function getJobStopsForMap(jobId) {
  const supabase = getSupabaseClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("pickup_json, dropoff_json")
    .eq("id", jobId)
    .maybeSingle();

  const { data: stops, error } = await supabase
    .from("job_stops")
    .select("id, label, address, stop_order, planned_time, status, latitude, longitude, stop_type")
    .eq("job_id", jobId)
    .order("stop_order");

  if (error) throw new Error(error.message);

  const { normalizeHubStop } = await import("@/lib/jobMapCoords");
  const raw = stops ?? [];
  return raw.map((s, i) =>
    normalizeHubStop(s, i, raw.length, job?.pickup_json, job?.dropoff_json),
  );
}

export async function getDriverJobDetail(jobId, driverId) {
  const supabase = getSupabaseClient();

  const [{ data: job, error: jobError }, { data: stops, error: stopsError }, assignment] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, organisation_id, route_name, job_type, job_number, title, service_date, scheduled_start_at, scheduled_end_at, status, depot_id, passenger_count, wheelchair_count, escort_required, assigned_vehicle_id, customer_booking_id, pickup_json, dropoff_json")
      .eq("id", jobId)
      .maybeSingle(),
    supabase
      .from("job_stops")
      .select("id, label, address, postcode, stop_order, planned_time, status, stop_type, latitude, longitude")
      .eq("job_id", jobId)
      .neq("status", "removed")
      .order("stop_order"),
    driverId ? loadDriverAssignment(jobId, driverId) : null,
  ]);

  if (jobError) {
    console.error("[jobs:getDriverJobDetail]", jobError.message);
    throw new Error(jobError.message);
  }
  if (stopsError) {
    console.error("[jobs:getDriverJobDetail:stops]", stopsError.message);
  }
  if (!job) return null;

  if (driverId && !assignment) return null;

  const { data: detailsRow } = await supabase
    .from("job_details")
    .select("details")
    .eq("job_id", jobId)
    .maybeSingle();

  const { filterJobBriefForDriver } = await import("@/lib/job-brief");

  const brief = filterJobBriefForDriver(job.job_type ?? "private_hire", detailsRow?.details ?? {}, job);

  const stopStatusById = new Map((stops ?? []).map((s) => [s.id, s.status]));
  const { rows: manifest } = await loadDriverJobManifest(jobId, stopStatusById);

  return {
    id: job.id,
    organisationId: job.organisation_id,
    vehicleId: assignment?.vehicle_id ?? job.assigned_vehicle_id ?? null,
    customerBookingId: job.customer_booking_id ?? null,
    pickup: job.pickup_json,
    dropoff: job.dropoff_json,
    routeName: job.route_name,
    jobType: job.job_type ?? "private_hire",
    jobNumber: job.job_number ?? null,
    title: job.title ?? null,
    serviceDate: job.service_date,
    startTime: formatJobTime(job.scheduled_start_at),
    endTime: formatJobTime(job.scheduled_end_at),
    status: job.status,
    brief,
    assignment: assignment
      ? {
          id: assignment.id,
          status: assignment.status,
          acceptedAt: assignment.accepted_at,
          startedAt: assignment.started_at,
        }
      : null,
    needsAccept: Boolean(assignment && !assignment.accepted_at),
    stops: (stops ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      address: s.address,
      postcode: s.postcode,
      latitude: s.latitude != null ? Number(s.latitude) : null,
      longitude: s.longitude != null ? Number(s.longitude) : null,
      sequence: s.stop_order,
      stopOrder: s.stop_order,
      stopType: s.stop_type ?? "stop",
      arrivalTime: formatJobTime(s.planned_time),
      status: s.status,
    })),
    manifest,
  };
}

export async function acceptJobAssignment(driver, jobId) {
  const job = await loadJobContext(jobId);
  if (!job) return { ok: false, message: "Job not found." };
  if (TERMINAL_JOB_STATUSES.has(job.status)) {
    return { ok: false, message: "This job is already finished." };
  }

  const assignment = await loadDriverAssignment(jobId, driver.id);
  if (!assignment) return { ok: false, message: "You are not assigned to this job." };
  if (assignment.accepted_at) return { ok: false, message: "Job already accepted." };

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("job_assignments")
    .update({ accepted_at: now, status: "accepted" })
    .eq("id", assignment.id);

  if (updateError) return { ok: false, message: updateError.message };

  const { error: eventError } = await supabase.from("job_status_events").insert({
    organisation_id: job.organisation_id,
    job_id: jobId,
    job_assignment_id: assignment.id,
    driver_id: driver.id,
    event_type: "job_accepted",
    event_time: now,
    notes: job.route_name,
  });

  if (eventError) return { ok: false, message: eventError.message };

  await logDriverAudit({
    organisation_id: job.organisation_id,
    depot_id: job.depot_id,
    entity_table: "job_assignments",
    entity_id: assignment.id,
    action: "driver_job_accepted",
    reason: job.route_name,
    metadata: { job_id: jobId },
  });

  try {
    const { ensureJobLinkedToFleetSession } = await import("@/services/fleet-tracking.service");
    await ensureJobLinkedToFleetSession(driver, {
      jobId,
      vehicleId: assignment.vehicle_id ?? job.vehicle_id,
    });
  } catch {
    /* fleet tracking optional */
  }

  return { ok: true, message: "Job accepted." };
}

export async function startJob(driver, jobId) {
  const eligibility = await checkDriverLicenceEligibilityForJob(jobId);
  if (eligibility?.eligibility && eligibility.ok === false) {
    const blocker = eligibility.eligibility.blockers?.[0] ?? "Licence eligibility check failed.";
    return { ok: false, message: `Cannot start duty: ${blocker}` };
  }

  const job = await loadJobContext(jobId);
  if (!job) return { ok: false, message: "Job not found." };
  if (TERMINAL_JOB_STATUSES.has(job.status)) {
    return { ok: false, message: "This job is already finished." };
  }

  let assignment = await loadDriverAssignment(jobId, driver.id);
  if (!assignment) return { ok: false, message: "You are not assigned to this job." };

  if (!assignment.accepted_at) {
    const accepted = await acceptJobAssignment(driver, jobId);
    if (!accepted.ok) return accepted;
    assignment = await loadDriverAssignment(jobId, driver.id);
    if (!assignment) return { ok: false, message: "Assignment not found after accept." };
  }

  if (assignment.started_at && job.status === "in_progress") {
    return { ok: true, message: "Job already started." };
  }

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { error: assignError, data: updatedAssignment } = await supabase
    .from("job_assignments")
    .update({ started_at: now, status: "in_progress" })
    .eq("id", assignment.id)
    .select("id, started_at")
    .maybeSingle();

  if (assignError) return { ok: false, message: assignError.message };
  if (!updatedAssignment?.started_at) {
    return {
      ok: false,
      message: "Could not start job — assignment was not updated. Sign in with the driver account linked to this job.",
    };
  }

  const { error: jobError } = await supabase.from("jobs").update({ status: "in_progress" }).eq("id", jobId);
  if (jobError) return { ok: false, message: jobError.message };

  const { error: eventError } = await supabase.from("job_status_events").insert({
    organisation_id: job.organisation_id,
    job_id: jobId,
    job_assignment_id: assignment.id,
    driver_id: driver.id,
    event_type: "job_started",
    event_time: now,
    notes: job.route_name,
  });

  if (eventError) return { ok: false, message: eventError.message };

  try {
    const { startDrivingSegment } = await import("@/services/duty-timeline.service");
    await startDrivingSegment(driver, {
      jobId,
      jobAssignmentId: assignment.id,
      vehicleId: assignment.vehicle_id,
    });
  } catch {
    /* segments optional until migration applied */
  }

  try {
    const { linkJobToSession } = await import("@/services/fleet-tracking.service");
    await linkJobToSession(driver, {
      jobId,
      vehicleId: assignment.vehicle_id ?? job.vehicle_id,
    });
  } catch {
    /* fleet tracking optional */
  }

  await notifyDispatcher({
    organisationId: job.organisation_id,
    depotId: job.depot_id,
    notificationType: "route_changed",
    entityType: "jobs",
    entityId: jobId,
    title: "Driver started job",
    message: `${driver.fullName ?? "Driver"} started ${job.route_name}`,
    severity: "info",
  });

  await logDriverAudit({
    organisation_id: job.organisation_id,
    depot_id: job.depot_id,
    entity_table: "jobs",
    entity_id: jobId,
    action: "driver_job_started",
    reason: job.route_name,
  });

  return { ok: true, message: "Job started." };
}

export async function runJobPrimaryAction(driver, job, action) {
  if (!job?.id || !action) return { ok: false, message: "Nothing to do." };

  switch (action) {
    case "accept":
      return acceptJobAssignment(driver, job.id);
    case "phv_advance": {
      const { advanceCustomerBookingJob } = await import("@/services/customer-phv-job.service");
      return advanceCustomerBookingJob(job.id, driver);
    }
    case "start":
      return startJob(driver, job.id);
    case "arrive": {
      const stop = job.stops?.find((s) => s.status === "planned");
      if (!stop) return { ok: false, message: "No stop to arrive at." };
      return arriveAtStop(driver, job.id, stop.id);
    }
    case "complete_stop": {
      const stop = job.stops?.find((s) => s.status === "arrived");
      if (!stop) return { ok: false, message: "Arrive at the stop first." };
      return completeStop(driver, job.id, stop.id);
    }
    case "complete_job":
      return completeJob(driver, job.id, { confirmIncomplete: false });
    default:
      return { ok: false, message: "Unknown action." };
  }
}

export async function arriveAtStop(driver, jobId, stopId) {
  const job = await loadJobContext(jobId);
  if (!job) return { ok: false, message: "Job not found." };
  if (TERMINAL_JOB_STATUSES.has(job.status)) {
    return { ok: false, message: "This job is already finished." };
  }

  const supabase = getSupabaseClient();
  const { data: stop, error: stopError } = await supabase
    .from("job_stops")
    .select("id, status, label")
    .eq("id", stopId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (stopError || !stop) return { ok: false, message: "Stop not found." };
  if (stop.status !== "planned") {
    return { ok: false, message: `Stop is already ${stop.status.replace(/_/g, " ")}.` };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("job_stops")
    .update({ status: "arrived", actual_arrival_at: now })
    .eq("id", stopId);

  if (updateError) return { ok: false, message: updateError.message };

  if (ACTIVE_JOB_STATUSES.has(job.status)) {
    await supabase.from("jobs").update({ status: "in_progress" }).eq("id", jobId);
  }

  const eventError = await insertJobStopEvent({
    organisationId: job.organisation_id,
    jobId,
    jobStopId: stopId,
    driverId: driver.id,
    eventType: "arrived_stop",
    notes: stop.label,
  });
  if (eventError) return { ok: false, message: eventError };

  await logDriverAudit({
    organisation_id: job.organisation_id,
    depot_id: job.depot_id,
    entity_table: "job_stops",
    entity_id: stopId,
    action: "arrival_confirmed",
    reason: stop.label,
    metadata: { job_id: jobId, driver_id: driver.id },
  });

  return { ok: true, message: `Arrived at ${stop.label}.` };
}

export async function completeStop(driver, jobId, stopId) {
  const job = await loadJobContext(jobId);
  if (!job) return { ok: false, message: "Job not found." };
  if (TERMINAL_JOB_STATUSES.has(job.status)) {
    return { ok: false, message: "This job is already finished." };
  }

  const supabase = getSupabaseClient();
  const { data: stop, error: stopError } = await supabase
    .from("job_stops")
    .select("id, status, label")
    .eq("id", stopId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (stopError || !stop) return { ok: false, message: "Stop not found." };
  if (stop.status !== "arrived") {
    return { ok: false, message: "Arrive at the stop before completing it." };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("job_stops")
    .update({ status: "completed", actual_departure_at: now })
    .eq("id", stopId);

  if (updateError) return { ok: false, message: updateError.message };

  const eventError = await insertJobStopEvent({
    organisationId: job.organisation_id,
    jobId,
    jobStopId: stopId,
    driverId: driver.id,
    eventType: "completed_stop",
    notes: stop.label,
  });
  if (eventError) return { ok: false, message: eventError };

  return { ok: true, message: `Completed stop: ${stop.label}.` };
}

export async function completeJob(driver, jobId, { confirmIncomplete = false } = {}) {
  const job = await loadJobContext(jobId);
  if (!job) return { ok: false, message: "Job not found." };
  if (job.status === "cancelled") return { ok: false, message: "Cancelled jobs cannot be completed." };
  if (job.status === "completed") return { ok: false, message: "Job is already completed." };

  const supabase = getSupabaseClient();
  const { data: stops } = await supabase.from("job_stops").select("id, status").eq("job_id", jobId);

  const incompleteStops = (stops ?? []).filter((s) => !["completed", "skipped", "cancelled"].includes(s.status));
  const issues = incompleteStops.length > 0 ? [`${incompleteStops.length} stop(s) not completed`] : [];

  if (issues.length > 0 && !confirmIncomplete) {
    return { ok: false, message: `Job still has open items: ${issues.join(", ")}.`, needsConfirm: true };
  }

  const { error: updateError } = await supabase.from("jobs").update({ status: "completed" }).eq("id", jobId);
  if (updateError) return { ok: false, message: updateError.message };

  const eventError = await insertJobStopEvent({
    organisationId: job.organisation_id,
    jobId,
    driverId: driver.id,
    eventType: "job_completed",
    metadata: issues.length > 0 ? { incomplete_confirmed: true, issues } : null,
  });
  if (eventError) return { ok: false, message: eventError };

  try {
    const { endDrivingSegmentForJob } = await import("@/services/duty-timeline.service");
    await endDrivingSegmentForJob(driver, jobId);
  } catch {
    /* segments optional */
  }

  let tripSummary = null;
  try {
    const { unlinkJobFromSession, getJobTripSummary } = await import("@/services/fleet-tracking.service");
    tripSummary = await getJobTripSummary(driver, jobId);
    await unlinkJobFromSession(driver);
  } catch {
    /* fleet tracking optional */
  }

  await logDriverAudit({
    organisation_id: job.organisation_id,
    depot_id: job.depot_id,
    entity_table: "jobs",
    entity_id: jobId,
    action: "driver_job_completed",
    reason: job.route_name,
    metadata: { incomplete_confirmed: confirmIncomplete && issues.length > 0 },
  });

  return {
    ok: true,
    message: "Job marked completed.",
    warning: issues.length > 0 ? `Completed with open items: ${issues.join(", ")}.` : undefined,
    needsDutyCloseout: true,
    jobId,
    tripSummary,
  };
}

export async function hasJobDutyCloseout(driverId, jobId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("job_stop_events")
    .select("id")
    .eq("job_id", jobId)
    .eq("driver_id", driverId)
    .eq("event_type", "duty_closeout")
    .limit(1);

  if (error) return false;
  return (data ?? []).length > 0;
}

export async function submitJobDutyCloseout(driver, jobId, payload) {
  const job = await loadJobContext(jobId);
  if (!job) return { ok: false, message: "Job not found." };

  const already = await hasJobDutyCloseout(driver.id, jobId);
  if (already) return { ok: true, message: "Duty closeout already submitted." };

  const metadata = {
    jobCompleted: Boolean(payload.jobCompleted),
    passengersSafe: Boolean(payload.passengersSafe),
    vehicleSafeForNextDuty: Boolean(payload.vehicleSafeForNextDuty),
    routeCompleted: payload.routeCompleted ?? "yes",
    actualStartTime: payload.actualStartTime ?? null,
    actualPickupTime: payload.actualPickupTime ?? null,
    actualDropoffTime: payload.actualDropoffTime ?? null,
    actualFinishTime: payload.actualFinishTime ?? null,
    delayReason: payload.delayReason?.trim() || null,
    hadDelay: Boolean(payload.hadDelay),
    hadIncident: Boolean(payload.hadIncident),
    hadLostProperty: Boolean(payload.hadLostProperty),
    notes: payload.notes?.trim() || null,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    submittedAt: new Date().toISOString(),
  };

  const eventError = await insertJobStopEvent({
    organisationId: job.organisation_id,
    jobId,
    driverId: driver.id,
    eventType: "duty_closeout",
    notes: payload.notes?.trim() || "Duty closeout",
    metadata,
  });
  if (eventError) return { ok: false, message: eventError };

  if (metadata.hadIncident) {
    await notifyDispatcher({
      organisationId: job.organisation_id,
      notificationType: "incident_reported",
      entityType: "jobs",
      entityId: jobId,
      title: "Incident reported at duty closeout",
      message: `${driver.fullName ?? "Driver"} reported an incident on ${job.route_name}`,
      severity: "warning",
    });
  }

  if (metadata.hadLostProperty) {
    await notifyDispatcher({
      organisationId: job.organisation_id,
      notificationType: "lost_property",
      entityType: "jobs",
      entityId: jobId,
      title: "Lost property at duty closeout",
      message: `${driver.fullName ?? "Driver"} reported lost property on ${job.route_name}`,
      severity: "info",
    });
  }

  await logDriverAudit({
    organisation_id: job.organisation_id,
    depot_id: job.depot_id,
    entity_table: "jobs",
    entity_id: jobId,
    action: "driver_duty_closeout",
    reason: job.route_name,
    metadata,
  });

  return { ok: true, message: "Duty closeout saved." };
}

export async function reportJobIssue(driver, jobId, { description }) {
  const job = await loadJobContext(jobId);
  if (!job) return { ok: false, message: "Job not found." };

  const trimmed = description?.trim();
  if (!trimmed) return { ok: false, message: "Please describe the issue." };

  const supabase = getSupabaseClient();
  const assignment = await loadDriverAssignment(jobId, driver.id);
  const now = new Date().toISOString();

  const { error } = await supabase.from("job_status_events").insert({
    organisation_id: job.organisation_id,
    job_id: jobId,
    job_assignment_id: assignment?.id ?? null,
    driver_id: driver.id,
    event_type: "issue_reported",
    event_time: now,
    notes: trimmed,
    metadata: { source: "driver_mobile" },
  });

  if (error) return { ok: false, message: error.message };

  await logDriverAudit({
    organisation_id: job.organisation_id,
    depot_id: job.depot_id,
    entity_table: "jobs",
    entity_id: jobId,
    action: "driver_job_issue_reported",
    reason: trimmed.slice(0, 200),
  });

  await notifyDispatcher({
    organisationId: job.organisation_id,
    depotId: job.depot_id,
    notificationType: "route_changed",
    entityType: "jobs",
    entityId: jobId,
    title: "Job issue reported",
    message: `${driver.fullName} on ${job.route_name}: ${trimmed.slice(0, 120)}`,
    severity: "warning",
  });

  return { ok: true, message: "Issue reported to dispatch." };
}

const TRANSFER_REASON_LABELS = {
  driver_running_late: "Driver running late",
  driver_overloaded: "Driver overloaded",
  driver_sickness: "Driver sickness",
  vehicle_breakdown: "Vehicle breakdown",
  vehicle_defect: "Vehicle defect",
  compliance_issue: "Compliance issue",
  customer_requested_change: "Customer requested change",
  depot_reassignment: "Depot reassignment",
  route_delay: "Route delay",
  emergency_cover: "Emergency cover",
  manual_correction: "Manual correction",
  other: "Other",
};

export async function getRecentRemovedTransfers(driverId, hours = 24) {
  const supabase = getSupabaseClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("job_transfers")
    .select(
      `
      id,
      job_id,
      reason,
      other_reason,
      handover_note,
      completed_at,
      jobs!job_transfers_job_id_fkey (route_name, job_number)
    `,
    )
    .eq("from_driver_id", driverId)
    .eq("status", "completed")
    .gte("completed_at", since)
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const job = row.jobs;
    const reasonLabel = TRANSFER_REASON_LABELS[row.reason] ?? row.reason;
    return {
      transferId: row.id,
      jobId: row.job_id,
      routeName: job?.route_name ?? "Job",
      jobNumber: job?.job_number ?? null,
      reason: row.reason === "other" && row.other_reason ? row.other_reason : reasonLabel,
      handoverNote: row.handover_note,
      completedAt: row.completed_at,
    };
  });
}
