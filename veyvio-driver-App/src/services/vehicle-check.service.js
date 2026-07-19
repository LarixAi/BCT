import { getSupabaseClient } from "@/lib/supabase/client";
import { unwrapRelation } from "@/lib/supabase/relations";
import { localToday } from "@/lib/local-date";
import { formatUkDateTime } from "@/lib/uk-locale";
import { clearWalkaroundDraft, loadWalkaroundDraft, saveWalkaroundDraft } from "@/lib/walkaround-draft.storage";
import { isChecklistFullyAnswered, normalizeChecklistProgress } from "@/lib/walkaround-progress";
import {
  dequeueWalkaroundSubmission,
  enqueueWalkaroundSubmission,
  loadSyncQueue,
} from "@/lib/walkaround-sync.storage";
import { getSelectedVehicleId, setSelectedVehicleId } from "@/lib/walkaround-vehicle.storage";
import {
  buildWalkaroundChecklist,
  CHECK_TYPES,
  deriveWalkaroundResult,
  mapCategoryToDefect,
  normalizeVehicleProfile,
} from "@/lib/walkaround-template-engine";
import { buildEndOfDutyChecklist, END_OF_DUTY_DECLARATION } from "@/lib/end-of-duty-template-engine";
import { DRIVER_CHECK_DECLARATION } from "@/lib/walkaround-check-template";
import {
  listTodayVehicleChecksViaCommand,
  listVehicleCheckHistoryViaCommand,
  submitVehicleCheckViaCommand,
} from "@/services/command-driver-ops.service";
import {
  loadDriverBootstrap,
  walkaroundSafetyFromHomeSummary,
} from "@/services/driver-bootstrap.service";

export {
  CHECK_TYPES,
  DRIVER_CHECK_DECLARATION,
  END_OF_DUTY_DECLARATION,
  buildWalkaroundChecklist,
  buildEndOfDutyChecklist,
  normalizeVehicleProfile,
};

const CHECKS_FETCH_MS = 3_500;

async function withTimeout(promise, ms, fallback) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function buildChecklistForType(checkType, profile) {
  if (checkType === CHECK_TYPES.end_of_duty.id || checkType === CHECK_TYPES.post_journey.id) {
    return buildEndOfDutyChecklist(profile);
  }
  return buildWalkaroundChecklist(profile);
}

export function declarationForCheckType(checkType) {
  if (checkType === CHECK_TYPES.end_of_duty.id || checkType === CHECK_TYPES.post_journey.id) {
    return END_OF_DUTY_DECLARATION;
  }
  return DRIVER_CHECK_DECLARATION;
}
export { getSelectedVehicleId, setSelectedVehicleId };

const VEHICLE_SELECT = `
  id, registration, make, model, vehicle_type, seats, wheelchair_accessible,
  odometer, service_status, current_depot_id,
  current_depot:depots!vehicles_current_depot_id_fkey(name)
`;

function mapVehicleRow(vehicle) {
  if (!vehicle) return null;
  const depot = unwrapRelation(vehicle.current_depot);
  return { ...vehicle, depotName: depot?.name ?? null };
}

function mapCommandDutyVehicle(duty) {
  const vehicle = duty?.vehicle;
  if (!vehicle?.id) return null;
  return {
    id: String(vehicle.id),
    registration: vehicle.registrationNumber ?? vehicle.registration ?? "—",
    make: vehicle.make ?? null,
    model: vehicle.model ?? null,
    vehicle_type: vehicle.vehicleType ?? "minibus",
    seats: vehicle.seatingCapacity ?? null,
    wheelchair_accessible: Number(vehicle.wheelchairCapacity ?? 0) > 0,
    fuel_type: vehicle.fuelType ?? null,
    odometer: vehicle.mileage ?? null,
    service_status: vehicle.vorStatus ? "vor" : "available",
    depotName: duty.reportingLocation ?? null,
  };
}

function mapCommandDutyJob(duty) {
  if (!duty?.id) return null;
  return {
    id: String(duty.id),
    route_name: duty.routeName ?? duty.reference ?? "Duty",
    service_date: duty.dutyDate ?? localToday(),
  };
}

/** Build assignable vehicle options from a Command bootstrap payload (no network). */
export function optionsFromBootstrap(bootstrap) {
  if (!bootstrap) return [];

  const seen = new Set();
  const options = [];

  for (const duty of bootstrap.duties ?? []) {
    const vehicle = mapCommandDutyVehicle(duty);
    if (!vehicle?.id || seen.has(vehicle.id)) continue;
    seen.add(vehicle.id);
    options.push({
      vehicleId: vehicle.id,
      vehicle,
      job: mapCommandDutyJob(duty),
      isToday: true,
      source: "command",
    });
  }

  const assignment = bootstrap.legacy?.homeSummary?.vehicleAssignment;
  if (assignment?.vehicleId && !seen.has(String(assignment.vehicleId))) {
    const vehicleId = String(assignment.vehicleId);
    seen.add(vehicleId);
    options.push({
      vehicleId,
      vehicle: {
        id: vehicleId,
        registration: assignment.registration ?? "—",
        make: assignment.make ?? null,
        model: assignment.model ?? null,
        vehicle_type: assignment.vehicleType ?? "minibus",
        seats: assignment.seatingCapacity ?? null,
        wheelchair_accessible: Boolean(assignment.wheelchairAccessible),
        odometer: assignment.odometer ?? null,
        service_status: assignment.roadworthinessStatus === "vor" ? "vor" : "available",
        depotName: bootstrap.operator?.depotName ?? null,
      },
      job: bootstrap.duties?.[0] ? mapCommandDutyJob(bootstrap.duties[0]) : null,
      isToday: true,
      source: "command",
    });
  }

  return options;
}

async function listAssignableVehiclesFromCommand() {
  const result = await loadDriverBootstrap();
  if (!result.ok) return [];
  return optionsFromBootstrap(result.bootstrap);
}

function mapCommandCheckToLegacyRow(check) {
  if (!check) return null;
  const evidence = check.evidence && typeof check.evidence === "object" ? check.evidence : {};
  const checklist = check.checklist && typeof check.checklist === "object" ? check.checklist : {};
  const resultRaw = String(check.result ?? "");
  const result =
    resultRaw === "pass" || resultRaw === "pass_with_advisory"
      ? "passed"
      : resultRaw === "fail"
        ? "failed"
        : resultRaw;
  return {
    id: check.id,
    result,
    checked_at: check.submittedAt ?? null,
    vehicle_id: check.vehicleId ?? null,
    job_id: check.dutyId ?? null,
    check_type: check.checkType === "driver_pre_use" ? "daily_walkaround" : check.checkType,
    evidence_json: {
      ...evidence,
      submitted_at: check.submittedAt,
      started_at: check.startedAt ?? check.submittedAt,
      outcome: check.opsOutcome ?? evidence.outcome,
      failed_items: checklist.failedItems ?? evidence.failed_items ?? [],
      highest_severity: evidence.highestSeverity ?? evidence.highest_severity,
    },
    vehicle: { registration: check.vehicleRegistration ?? null },
    job: { service_date: localToday(), route_name: null },
  };
}

async function loadTodayCommandChecks() {
  const listed = await listTodayVehicleChecksViaCommand();
  if (!listed.ok) return [];
  return (listed.checks ?? []).map(mapCommandCheckToLegacyRow).filter(Boolean);
}

export async function listAssignableVehicles(driver) {
  const commandOptions = await listAssignableVehiclesFromCommand();
  if (commandOptions.length > 0) return commandOptions;

  const supabase = getSupabaseClient();
  const today = localToday();

  const { data: todayRows, error: todayError } = await supabase
    .from("driver_jobs_today")
    .select("job_id, route_name, service_date, vehicle_id, vehicle_registration")
    .order("scheduled_start_at", { ascending: true });

  if (todayError) {
    console.warn("[vehicle-check] driver_jobs_today:", todayError.message);
  }

  const seen = new Set();
  const options = [];

  for (const row of todayRows ?? []) {
    if (!row.vehicle_id || seen.has(row.vehicle_id)) continue;
    seen.add(row.vehicle_id);

    const { data: vehicleRow } = await supabase
      .from("vehicles")
      .select(VEHICLE_SELECT)
      .eq("id", row.vehicle_id)
      .maybeSingle();

    options.push({
      vehicleId: row.vehicle_id,
      vehicle: mapVehicleRow(vehicleRow),
      job: {
        id: row.job_id,
        route_name: row.route_name,
        service_date: row.service_date ?? today,
      },
      isToday: true,
    });
  }

  if (options.length > 0) {
    return await appendOwnPcoVehicle(supabase, driver, options, seen);
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("job_assignments")
    .select(`vehicle_id, job_id, vehicle:vehicles(${VEHICLE_SELECT}), job:jobs(id, route_name, service_date, depot_id)`)
    .eq("driver_id", driver.id)
    .eq("is_current", true)
    .order("assigned_at", { ascending: false });

  if (assignmentError) {
    console.warn("[vehicle-check] job_assignments:", assignmentError.message);
    return await appendOwnPcoVehicle(supabase, driver, options, seen);
  }

  for (const row of assignments ?? []) {
    if (!row.vehicle_id || seen.has(row.vehicle_id)) continue;
    const job = unwrapRelation(row.job);
    if (job?.service_date && job.service_date !== today) continue;
    seen.add(row.vehicle_id);
    options.push({
      vehicleId: row.vehicle_id,
      vehicle: mapVehicleRow(unwrapRelation(row.vehicle)),
      job,
      isToday: job?.service_date === today,
    });
  }

  return await appendOwnPcoVehicle(supabase, driver, options, seen);
}

async function appendOwnPcoVehicle(supabase, driver, options, seen) {
  const { data: ownVehicle } = await supabase
    .from("vehicles")
    .select(VEHICLE_SELECT)
    .eq("primary_driver_id", driver.id)
    .eq("status", "active")
    .eq("can_be_used_for_phv", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ownVehicle?.id || seen.has(ownVehicle.id)) return options;

  options.push({
    vehicleId: ownVehicle.id,
    vehicle: mapVehicleRow(ownVehicle),
    job: null,
    isToday: true,
    isOwnPcoVehicle: true,
  });
  return options;
}

async function loadTodayChecksForDriver(driverId) {
  const commandChecks = await loadTodayCommandChecks();
  if (commandChecks.length > 0) return commandChecks;
  const supabase = getSupabaseClient();
  return loadTodayDriverChecks(supabase, driverId);
}

function pickVehicleMatch(options, checks, { vehicleIdOverride = null, driverId = null } = {}) {
  const assignedVehicleIds = options.map((o) => o.vehicleId);
  const assignedJobIds = options.map((o) => o.job?.id).filter(Boolean);
  const completedDaily = pickTodayVehicleCheck(checks, {
    assignedVehicleIds,
    assignedJobIds,
    dailyOnly: true,
  });

  let match = null;

  if (completedDaily?.vehicle_id) {
    match = options.find((o) => o.vehicleId === completedDaily.vehicle_id) ?? null;
    if (!match && completedDaily.job_id) {
      match = options.find((o) => o.job?.id === completedDaily.job_id) ?? null;
    }
  }

  if (!match && vehicleIdOverride) {
    match = options.find((o) => o.vehicleId === String(vehicleIdOverride)) ?? null;
  }

  if (!match && driverId) {
    const preferredId = getSelectedVehicleId(driverId);
    match = preferredId ? options.find((o) => o.vehicleId === preferredId) : null;
  }

  if (!match) {
    match = options.find((o) => o.isToday) ?? options[0] ?? null;
  }

  return { match, completedDaily };
}

function buildSafetyFromLocalState({ vehicle, job, options, checks, summaryHint = null }) {
  const assignedVehicleIds = options.map((o) => o.vehicleId);
  const assignedJobIds = options.map((o) => o.job?.id).filter(Boolean);

  if (!vehicle) {
    return {
      checkRequired: false,
      checkComplete: false,
      result: null,
      submittedAt: null,
      vehicleBlocked: false,
      vehicleStatus: "unknown",
      routeStartAllowed: false,
      openDefectCount: 0,
      registration: null,
      routeName: null,
      depotName: null,
      message: "No vehicle assigned",
    };
  }

  const check =
    pickTodayVehicleCheck(checks, {
      assignedVehicleIds,
      assignedJobIds,
      dailyOnly: true,
    }) ??
    pickTodayVehicleCheck(checks, {
      vehicleId: vehicle.id,
      jobId: job?.id ?? null,
      assignedVehicleIds,
      assignedJobIds,
      dailyOnly: true,
    });

  const vehicleBlocked =
    vehicle.service_status === "vor" || Boolean(summaryHint?.vehicleBlocked);
  const checkComplete =
    Boolean(check && isSubmittedCheckResult(check.result)) ||
    Boolean(summaryHint?.checkComplete && !check);
  const checkFailed = check?.result === "failed";
  const evidence = check?.evidence_json;
  const highestFromEvidence = evidence && typeof evidence === "object" ? evidence.highest_severity : undefined;
  const checkedRegistration = registrationFromCheckRow(check);
  const checkOnDifferentVehicle = Boolean(
    checkComplete && check?.vehicle_id && check.vehicle_id !== vehicle.id,
  );

  let routeStartAllowed = checkComplete && !vehicleBlocked && !checkFailed;
  if (checkFailed && highestFromEvidence !== "critical" && !vehicleBlocked) {
    routeStartAllowed = false;
  }

  const submittedAt =
    (evidence && typeof evidence === "object" ? evidence.submitted_at : null) ??
    check?.checked_at ??
    null;
  const startedAt =
    (evidence && typeof evidence === "object" ? evidence.started_at : null) ??
    submittedAt;

  const checkJob = check ? unwrapRelation(check.job) : null;
  const routeName = checkJob?.route_name ?? job?.route_name ?? null;

  return {
    checkRequired: !checkComplete,
    checkComplete,
    result: check?.result ?? (summaryHint?.checkComplete ? "passed" : null),
    resultLabel: check?.result
      ? formatCheckResultLabel(check.result)
      : summaryHint?.checkComplete
        ? "Complete"
        : null,
    submittedAt,
    startedAt,
    checkId: check?.id ?? null,
    checkedVehicleId: check?.vehicle_id ?? null,
    checkedRegistration,
    checkOnDifferentVehicle,
    assignedRegistration: vehicle.registration,
    vehicleBlocked,
    vehicleStatus: vehicleBlocked ? "blocked" : vehicle.service_status ?? "available",
    routeStartAllowed,
    openDefectCount: 0,
    criticalDefectCount: 0,
    registration: vehicle.registration,
    routeName,
    depotName: vehicle.depotName ?? null,
    usedForSchoolTransport: normalizeVehicleProfile(vehicle, job).usedForSchoolTransport,
    message: vehicleBlocked
      ? "Vehicle has an open safety defect and cannot be used."
      : checkComplete
        ? checkFailed
          ? "Defects reported — wait for transport manager instructions."
          : checkOnDifferentVehicle
            ? `Walkaround complete on ${checkedRegistration ?? "another vehicle"}.`
            : "Vehicle check complete."
        : "Vehicle check required before starting your job.",
  };
}

function finalizeWalkaroundSession({
  driver,
  vehicle,
  job,
  options,
  checks,
  checkType,
  summaryHint,
}) {
  if (!vehicle) {
    return {
      ok: false,
      message: "No vehicle assigned for today — contact dispatch.",
      options: options ?? [],
    };
  }

  const profile = normalizeVehicleProfile(vehicle, job);
  const checklist = buildChecklistForType(checkType, profile);
  let draft = loadWalkaroundDraft(driver.id, vehicle.id);
  const safety = buildSafetyFromLocalState({
    vehicle,
    job,
    options,
    checks,
    summaryHint,
  });

  if (safety.checkComplete && safety.result !== "failed") {
    if (draft) {
      clearWalkaroundDraft(driver.id, vehicle.id);
      draft = null;
    }
  } else if (draft?.answers && checklist.items.length > 0) {
    const normalized = normalizeChecklistProgress(checklist.items, draft.answers, draft.currentIndex ?? 0);
    draft = {
      ...draft,
      currentIndex: normalized.currentIndex,
      allItemsAnswered: normalized.allComplete,
    };
  }

  return {
    ok: true,
    vehicle,
    job,
    profile,
    checklist,
    draft,
    safety,
    options,
    checkTypes: resolveAvailableCheckTypes(safety),
  };
}

/**
 * Instant walkaround session from auth/bootstrap cache — no network.
 * Used to paint Checks immediately while today's checks enrich in the background.
 */
export function previewWalkaroundSessionFromBootstrap(
  driver,
  bootstrap,
  { checkType = CHECK_TYPES.daily.id } = {},
) {
  if (!driver || !bootstrap) return null;
  const options = optionsFromBootstrap(bootstrap);
  if (options.length === 0) return null;

  const { match } = pickVehicleMatch(options, [], {
    driverId: driver.id,
  });
  if (!match?.vehicle) return null;

  if (match.vehicleId !== getSelectedVehicleId(driver.id)) {
    setSelectedVehicleId(driver.id, match.vehicleId);
  }

  const summaryHint = walkaroundSafetyFromHomeSummary(bootstrap.legacy?.homeSummary);
  return finalizeWalkaroundSession({
    driver,
    vehicle: match.vehicle,
    job: match.job,
    options,
    checks: [],
    checkType,
    summaryHint,
  });
}

export async function resolveVehicleContext(driver, vehicleIdOverride = null) {
  const boot = await loadDriverBootstrap().catch(() => null);
  let options = optionsFromBootstrap(boot?.ok ? boot.bootstrap : null);
  const checksPromise = withTimeout(loadTodayChecksForDriver(driver.id), CHECKS_FETCH_MS, []);

  if (options.length === 0 && !boot?.ok) {
    options = await listAssignableVehicles(driver);
  }

  const checks = await checksPromise;
  const { match, completedDaily } = pickVehicleMatch(options, checks, {
    vehicleIdOverride,
    driverId: driver.id,
  });

  if (!match?.vehicle) {
    return {
      vehicle: null,
      job: null,
      options,
      dailyCheck: completedDaily ?? null,
      checks,
      bootstrap: boot?.ok ? boot.bootstrap : null,
    };
  }

  if (match.vehicleId !== getSelectedVehicleId(driver.id)) {
    setSelectedVehicleId(driver.id, match.vehicleId);
  }

  return {
    vehicle: match.vehicle,
    job: match.job,
    options,
    dailyCheck: completedDaily ?? null,
    checks,
    bootstrap: boot?.ok ? boot.bootstrap : null,
  };
}

export async function selectVehicleForCheck(driver, vehicleId) {
  const options = await listAssignableVehicles(driver);
  const match = options.find((o) => o.vehicleId === vehicleId);
  if (!match) return { ok: false, message: "That vehicle is not assigned to you today." };
  setSelectedVehicleId(driver.id, vehicleId);
  return { ok: true, vehicle: match.vehicle, job: match.job };
}

async function readFileAsArrayBuffer(file) {
  if (typeof file.arrayBuffer === "function") {
    try {
      return await file.arrayBuffer();
    } catch {
      /* fall through */
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

export async function getDriverAssignmentContext(driver) {
  const ctx = await resolveVehicleContext(driver);
  return {
    vehicle: ctx.vehicle,
    job: ctx.job,
    assignment: ctx.vehicle ? { vehicle_id: ctx.vehicle.id, job_id: ctx.job?.id } : null,
    options: ctx.options,
  };
}

/** @deprecated use getDriverAssignmentContext */
export async function getDriverAssignedVehicle(driver) {
  const ctx = await getDriverAssignmentContext(driver);
  if (!ctx.vehicle) {
    return { vehicleId: null, registration: null, jobId: null, routeName: null, wheelchairAccessible: false };
  }
  return {
    vehicleId: ctx.vehicle.id,
    registration: ctx.vehicle.registration,
    jobId: ctx.job?.id ?? null,
    routeName: ctx.job?.route_name ?? null,
    wheelchairAccessible: ctx.vehicle.wheelchair_accessible ?? false,
  };
}

export async function loadWalkaroundSession(
  driver,
  { checkType = CHECK_TYPES.daily.id, bootstrap = null } = {},
) {
  const boot =
    bootstrap != null
      ? { ok: true, bootstrap }
      : await loadDriverBootstrap().catch(() => null);

  let options = optionsFromBootstrap(boot?.ok ? boot.bootstrap : null);
  const checksPromise = withTimeout(loadTodayChecksForDriver(driver.id), CHECKS_FETCH_MS, []);

  // Only fall back to Ridova tables when Command bootstrap itself failed.
  if (options.length === 0 && !boot?.ok) {
    options = await listAssignableVehicles(driver);
  }

  const checks = await checksPromise;
  const { match } = pickVehicleMatch(options, checks, { driverId: driver.id });

  if (match?.vehicle && match.vehicleId !== getSelectedVehicleId(driver.id)) {
    setSelectedVehicleId(driver.id, match.vehicleId);
  }

  const summaryHint = walkaroundSafetyFromHomeSummary(
    (boot?.ok ? boot.bootstrap : null)?.legacy?.homeSummary,
  );

  return finalizeWalkaroundSession({
    driver,
    vehicle: match?.vehicle ?? null,
    job: match?.job ?? null,
    options,
    checks,
    checkType,
    summaryHint,
  });
}

function resolveAvailableCheckTypes(safety) {
  const types = [CHECK_TYPES.daily];
  if (safety.checkComplete && safety.result !== "failed") {
    types.push(CHECK_TYPES.changeover);
  }
  types.push(CHECK_TYPES.end_of_duty, CHECK_TYPES.in_service);
  return types;
}

const COMPLETE_CHECK_RESULTS = new Set(["passed", "nil_defect", "failed"]);

/** Local calendar-day bounds as ISO strings for Supabase timestamptz filters. */
function localDayBoundsIso() {
  const today = localToday();
  const [year, month, day] = today.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function isSubmittedCheckResult(result) {
  return COMPLETE_CHECK_RESULTS.has(result);
}

function checkTimestampOnLocalDay(row) {
  const evidence = row.evidence_json;
  const candidates = [
    row.checked_at,
    evidence && typeof evidence === "object" ? evidence.submitted_at : null,
    evidence && typeof evidence === "object" ? evidence.started_at : null,
  ].filter(Boolean);

  const { startIso, endIso } = localDayBoundsIso();
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);

  return candidates.some((value) => {
    const ms = Date.parse(value);
    return !Number.isNaN(ms) && ms >= startMs && ms < endMs;
  });
}

/** Match checks tied to today's duty — by local timestamps or linked job service_date. */
function isCheckRelevantForToday(row, today = localToday()) {
  if (checkTimestampOnLocalDay(row)) return true;
  const job = unwrapRelation(row.job);
  return job?.service_date === today;
}

async function loadTodayDriverChecks(supabase, driverId) {
  const { data, error } = await supabase
    .from("driver_checks")
    .select(`
      id, result, checked_at, vehicle_id, job_id, check_type, evidence_json,
      job:jobs(service_date, route_name),
      vehicle:vehicles(registration)
    `)
    .eq("driver_id", driverId)
    .order("checked_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("[vehicle-check] loadTodayDriverChecks:", error.message);
    return [];
  }

  return (data ?? []).filter((row) => isCheckRelevantForToday(row));
}

function pickTodayVehicleCheck(
  checks,
  { vehicleId, jobId, assignedVehicleIds = [], assignedJobIds = [], dailyOnly = false } = {},
) {
  let submitted = checks.filter((row) => isSubmittedCheckResult(row.result));
  if (dailyOnly) {
    submitted = submitted.filter(
      (row) => (row.check_type ?? "daily_walkaround") === "daily_walkaround",
    );
  }
  if (submitted.length === 0) return null;

  if (vehicleId) {
    const forVehicle = submitted.find((row) => row.vehicle_id === vehicleId);
    if (forVehicle) return forVehicle;
  }

  if (jobId) {
    const forJob = submitted.find((row) => row.job_id === jobId);
    if (forJob) return forJob;
  }

  if (assignedJobIds.length > 0) {
    const forAssignedJob = submitted.find((row) => row.job_id && assignedJobIds.includes(row.job_id));
    if (forAssignedJob) return forAssignedJob;
  }

  if (assignedVehicleIds.length > 0) {
    const forAssigned = submitted.find((row) => assignedVehicleIds.includes(row.vehicle_id));
    if (forAssigned) return forAssigned;
  }

  return submitted[0] ?? null;
}

function registrationFromCheckRow(row) {
  const vehicle = unwrapRelation(row?.vehicle);
  return vehicle?.registration ?? null;
}

/** Whether the driver has already submitted a walkaround for a vehicle/job today. */
export async function hasCompletedVehicleCheckToday(driver, { vehicleId = null, jobId = null } = {}) {
  const options = await listAssignableVehicles(driver);
  const assignedVehicleIds = options.map((o) => o.vehicleId);
  const assignedJobIds = options.map((o) => o.job?.id).filter(Boolean);
  const checks = await loadTodayChecksForDriver(driver.id);
  const match = pickTodayVehicleCheck(checks, { vehicleId, jobId, assignedVehicleIds, assignedJobIds });
  return Boolean(match && isSubmittedCheckResult(match.result));
}

export async function getWalkaroundSafetyStatus(driver, vehicleIdOverride = null) {
  const ctx = await resolveVehicleContext(driver, vehicleIdOverride);
  const summaryHint = walkaroundSafetyFromHomeSummary(ctx.bootstrap?.legacy?.homeSummary);
  return buildSafetyFromLocalState({
    vehicle: ctx.vehicle,
    job: ctx.job,
    options: ctx.options ?? [],
    checks: ctx.checks ?? [],
    summaryHint,
  });
}

/** Safety status scoped to a specific job — daily check counts across all today's assignments. */
export async function getWalkaroundSafetyStatusForJob(driver, jobId) {
  const base = await getWalkaroundSafetyStatus(driver);
  if (!jobId) return base;

  const supabase = getSupabaseClient();
  const { data: assignment } = await supabase
    .from("job_assignments")
    .select(`vehicle_id, vehicle:vehicles(${VEHICLE_SELECT})`)
    .eq("job_id", jobId)
    .eq("driver_id", driver.id)
    .eq("is_current", true)
    .maybeSingle();

  if (!assignment?.vehicle_id) return base;

  const jobVehicle = mapVehicleRow(unwrapRelation(assignment.vehicle));
  if (!jobVehicle) return base;

  return {
    ...base,
    registration: jobVehicle.registration ?? base.registration,
    assignedRegistration: jobVehicle.registration ?? base.assignedRegistration,
    depotName: jobVehicle.depotName ?? base.depotName,
  };
}

export function persistWalkaroundDraft(driver, vehicleId, draft) {
  return saveWalkaroundDraft(driver.id, vehicleId, draft);
}

export function discardWalkaroundDraft(driver, vehicleId) {
  clearWalkaroundDraft(driver.id, vehicleId);
}

function buildResponses({ items, answers }) {
  return items.map((item) => {
    const answer = answers[item.id] ?? {};
    let responseStatus = "pending";
    if (answer.status === "pass") responseStatus = "pass";
    else if (answer.status === "fail") responseStatus = "fail";
    else if (answer.status === "na") responseStatus = "na";
    else if (answer.status === "advisory") responseStatus = "advisory";

    const isBodywork =
      Boolean(answer.isBodyworkDamage) ||
      Boolean(item.isBodyworkDamage) ||
      item.id === "core_body_exterior" ||
      item.id === "outside_bodywork" ||
      item.id === "eod_body_damage";

    const includePhoto =
      responseStatus === "fail" || responseStatus === "advisory"
        ? Boolean(answer.photoDataUrl)
        : false;

    return {
      itemId: item.id,
      sectionKey: item.sectionKey,
      category: item.category,
      questionTitle: item.questionTitle,
      responseStatus,
      severitySuggestion: responseStatus === "advisory" ? "advisory" : item.defaultSeverity,
      autoBlockOnFail: item.autoBlockOnFail,
      requiresPhotoOnFail: item.requiresPhotoOnFail,
      driverNote: answer.note?.trim() || null,
      canContinue: answer.canContinue ?? null,
      photoPath: answer.photoPath ?? null,
      photoDataUrl: includePhoto ? answer.photoDataUrl ?? null : null,
      zone: answer.zone ?? null,
      damageType: answer.damageType ?? null,
      isBodyworkDamage: isBodywork,
      isAdvisory: responseStatus === "advisory",
    };
  });
}

export async function uploadWalkaroundPhoto({ driver, vehicleId, itemId, file }) {
  const supabase = getSupabaseClient();
  const buffer = await readFileAsArrayBuffer(file);
  const ext = String(file.name ?? "photo.jpg").split(".").pop() || "jpg";
  const path = `${driver.organisationId}/${vehicleId}/${driver.id}/${itemId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("defect-photos").upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, path };
}

function decodeDataUrl(dataUrl) {
  const [meta, base64 = ""] = String(dataUrl).split(",");
  const mimeMatch = meta.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mime };
}

export async function uploadWalkaroundSignature({ driver, vehicleId, dataUrl }) {
  if (!dataUrl?.startsWith("data:")) {
    return { ok: false, message: "Signature is required." };
  }

  const supabase = getSupabaseClient();
  const { bytes, mime } = decodeDataUrl(dataUrl);
  const path = `${driver.organisationId}/${vehicleId}/${driver.id}/signature-${Date.now()}.png`;

  const { error } = await supabase.storage.from("defect-photos").upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, path };
}

export async function submitWalkaroundCheck({
  driver,
  vehicle,
  job,
  profile,
  checklist,
  answers,
  checkType = "daily_walkaround",
  odometerReading,
  odometerPhotoDataUrl = null,
  fuelLevel,
  vehicleConfirmed,
  declarationSigned,
  additionalDefectNote,
  gps,
  startedAt,
  driverSignatureDataUrl,
  offlineSubmit = false,
}) {
  if (!vehicle?.id) return { ok: false, message: "No vehicle selected." };
  if (!vehicleConfirmed) return { ok: false, message: "Confirm this is your vehicle before submitting." };
  if (!odometerReading || Number(odometerReading) <= 0) {
    return { ok: false, message: "Enter the current odometer reading." };
  }
  if (!odometerPhotoDataUrl?.startsWith("data:")) {
    return { ok: false, message: "Photograph the odometer before submitting." };
  }
  if (!declarationSigned) return { ok: false, message: "Confirm the driver declaration before submitting." };
  if (!driverSignatureDataUrl) return { ok: false, message: "Add your signature before submitting." };

  const items = checklist.items;
  const responses = buildResponses({ items, answers });
  const unanswered = responses.filter((r) => r.responseStatus === "pending");
  if (unanswered.length > 0) {
    return { ok: false, message: "Please answer every checklist item." };
  }

  for (const r of responses.filter((x) => x.responseStatus === "fail")) {
    if (!r.driverNote?.trim()) {
      return { ok: false, message: `Add a note for failed item: ${r.questionTitle}` };
    }
    const item = items.find((i) => i.id === r.itemId);
    if (item?.requiresPhotoOnFail && !r.photoPath) {
      return { ok: false, message: `Photo required for: ${r.questionTitle}` };
    }
  }

  const payload = {
    driver,
    vehicle,
    job,
    profile,
    checklist,
    answers,
    checkType,
    odometerReading,
    odometerPhotoDataUrl,
    fuelLevel,
    vehicleConfirmed,
    declarationSigned,
    additionalDefectNote,
    gps,
    startedAt,
    driverSignatureDataUrl,
  };

  if (offlineSubmit || !navigator.onLine) {
    enqueueWalkaroundSubmission(driver.id, payload);
    discardWalkaroundDraft(driver, vehicle.id);
    const derived = deriveWalkaroundResult(responses);
    const bodyworkDamageCount = responses.filter(
      (r) => r.responseStatus === "fail" && r.isBodyworkDamage,
    ).length;
    return {
      ok: true,
      queued: true,
      result: derived.result,
      outcome: derived.outcome,
      criticalCount: derived.criticalCount,
      failCount: derived.failCount,
      bodyworkDamageCount,
      message: "Saved on this device — will sync when connection returns.",
    };
  }

  const commandResult = await insertWalkaroundCheckViaCommand(payload);
  if (commandResult.ok) return commandResult;
  if (commandResult.skipLegacy) {
    return { ok: false, message: commandResult.message ?? "Vehicle check could not be submitted." };
  }

  return insertWalkaroundCheck(payload);
}

async function insertWalkaroundCheckViaCommand(payload) {
  const {
    driver,
    vehicle,
    job,
    profile,
    checklist,
    answers,
    checkType,
    odometerReading,
    odometerPhotoDataUrl,
    fuelLevel,
    declarationSigned,
    additionalDefectNote,
    gps,
    startedAt,
    driverSignatureDataUrl,
  } = payload;

  const items = checklist.items;
  const responses = buildResponses({ items, answers });
  const derived = deriveWalkaroundResult(responses);
  let result = derived.result;
  if (additionalDefectNote?.trim()) result = "failed";

  const failedItems = responses
    .filter((r) => r.responseStatus === "fail")
    .map((r) => ({
      key: r.itemId,
      label: r.questionTitle,
      category: r.isBodyworkDamage ? "bodywork" : r.category,
      severity: r.severitySuggestion,
      note: r.driverNote,
      canContinue: r.canContinue,
      photoPath: r.photoPath,
      photoDataUrl: r.photoDataUrl,
      zone: r.zone,
      damageType: r.damageType,
      isBodyworkDamage: Boolean(r.isBodyworkDamage),
    }));

  const advisoryItems = responses
    .filter((r) => r.responseStatus === "advisory")
    .map((r) => ({
      key: r.itemId,
      label: r.questionTitle,
      category: r.category,
      severity: "advisory",
      note: r.driverNote,
      photoPath: r.photoPath,
      photoDataUrl: r.photoDataUrl,
      isAdvisory: true,
    }));

  const bodyworkReports = failedItems.filter((item) => item.isBodyworkDamage);
  const startedAtIso = startedAt ?? new Date().toISOString();
  const submittedAtIso = new Date().toISOString();

  const evidencePhotos = [];
  if (odometerPhotoDataUrl?.startsWith("data:")) {
    evidencePhotos.push({
      id: "odometer",
      kind: "odometer",
      label: `Odometer ${odometerReading}`,
      photoDataUrl: odometerPhotoDataUrl,
      capturedAt: startedAtIso,
    });
  }
  for (const item of failedItems) {
    if (item.photoDataUrl?.startsWith("data:")) {
      evidencePhotos.push({
        id: `fail_${item.key}`,
        kind: item.isBodyworkDamage ? "bodywork" : "photo",
        label: item.label,
        itemId: item.key,
        photoDataUrl: item.photoDataUrl,
        capturedAt: submittedAtIso,
        zone: item.zone,
        damageType: item.damageType,
      });
    }
  }
  for (const item of advisoryItems) {
    if (item.photoDataUrl?.startsWith("data:")) {
      evidencePhotos.push({
        id: `advisory_${item.key}`,
        kind: "note",
        label: `Advisory: ${item.label}`,
        itemId: item.key,
        photoDataUrl: item.photoDataUrl,
        capturedAt: submittedAtIso,
      });
    }
  }
  if (driverSignatureDataUrl?.startsWith("data:")) {
    evidencePhotos.push({
      id: "signature",
      kind: "signature",
      label: "Driver declaration signature",
      photoDataUrl: driverSignatureDataUrl,
      capturedAt: submittedAtIso,
    });
  }

  const clientCheckId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `chk_${driver.id}_${vehicle.id}_${Date.now()}`;

  const submitted = await submitVehicleCheckViaCommand({
    vehicleId: vehicle.id,
    dutyId: job?.id ?? null,
    clientCheckId,
    checkType: checkType === "daily_walkaround" ? "driver_pre_use" : checkType,
    templateVersion: checklist.templateLabel ?? "walkaround_v3",
    result,
    opsOutcome: derived.outcome,
    odometer: Number(odometerReading),
    fuelLevel: fuelLevel ?? null,
    startedAt: startedAtIso,
    checklist: {
      templateLabel: checklist.templateLabel,
      addons: checklist.addons,
      responses,
      failedItems,
      advisoryItems,
      bodyworkReports,
    },
    evidence: {
      source: "driver_mobile",
      engine: "walkaround_v3",
      declarationSigned: Boolean(declarationSigned),
      odometerReading: Number(odometerReading),
      odometerPhotoDataUrl: odometerPhotoDataUrl?.startsWith("data:") ? odometerPhotoDataUrl : null,
      odometerCapturedAt: startedAtIso,
      startedAt: startedAtIso,
      submittedAt: submittedAtIso,
      photos: evidencePhotos,
      vehicleProfile: profile,
      gps: gps ?? null,
      highestSeverity: derived.highestSeverity,
      additionalDefectNote: additionalDefectNote?.trim() || null,
      outcome: derived.outcome,
      bodyworkDamageCount: bodyworkReports.length,
      advisoryCount: advisoryItems.length,
      timestamps: {
        startedAt: startedAtIso,
        submittedAt: submittedAtIso,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
      },
    },
  });

  if (!submitted.ok) {
    // Prefer Command when the driver is on published duties — do not silently write to Ridova.
    const commandVehicles = await listAssignableVehiclesFromCommand();
    if (commandVehicles.length > 0) {
      return { ok: false, skipLegacy: true, message: submitted.message };
    }
    return { ok: false, skipLegacy: false, message: submitted.message };
  }

  discardWalkaroundDraft(driver, vehicle.id);
  return {
    ok: true,
    checkId: submitted.check?.id,
    result,
    outcome: derived.outcome,
    highestSeverity: derived.highestSeverity,
    criticalCount: derived.criticalCount,
    failCount: derived.failCount,
    advisoryCount: derived.advisoryCount ?? advisoryItems.length,
    bodyworkDamageCount: bodyworkReports.length,
    createdDefects: submitted.check?.createdDefects ?? [],
  };
}

async function resolveSignatureEvidence(driver, vehicleId, driverSignatureDataUrl) {
  if (!driverSignatureDataUrl) {
    return { ok: false, message: "Add your signature before submitting." };
  }

  if (driverSignatureDataUrl.startsWith("data:")) {
    const uploaded = await uploadWalkaroundSignature({
      driver,
      vehicleId,
      dataUrl: driverSignatureDataUrl,
    });
    if (!uploaded.ok) {
      return { ok: false, message: uploaded.message ?? "Could not upload signature." };
    }
    return {
      ok: true,
      signaturePath: uploaded.path,
      signaturePreview: null,
    };
  }

  return {
    ok: true,
    signaturePath: null,
    signaturePreview: driverSignatureDataUrl,
  };
}

async function insertWalkaroundCheck(payload) {
  const supabase = getSupabaseClient();
  const {
    driver,
    vehicle,
    job,
    profile,
    checklist,
    answers,
    checkType,
    odometerReading,
    fuelLevel,
    declarationSigned,
    additionalDefectNote,
    gps,
    startedAt,
    driverSignatureDataUrl,
  } = payload;

  const items = checklist.items;
  const responses = buildResponses({ items, answers });
  const derived = deriveWalkaroundResult(responses);
  let result = derived.result;
  if (additionalDefectNote?.trim()) result = "failed";

  const signatureEvidence = await resolveSignatureEvidence(driver, vehicle.id, driverSignatureDataUrl);
  if (!signatureEvidence.ok) {
    return { ok: false, message: signatureEvidence.message };
  }

  const submittedAt = new Date().toISOString();
  const failedItems = responses
    .filter((r) => r.responseStatus === "fail")
    .map((r) => ({
      key: r.itemId,
      label: r.questionTitle,
      category: r.category,
      severity: r.severitySuggestion,
      note: r.driverNote,
      canContinue: r.canContinue,
      photoPath: r.photoPath,
    }));

  const legacyChecks = Object.fromEntries(
    responses.map((r) => [r.itemId, r.responseStatus === "pass" ? true : r.responseStatus === "fail" ? false : null]),
  );

  const { data: checkRow, error: checkError } = await supabase
    .from("driver_checks")
    .insert({
      organisation_id: driver.organisationId,
      job_id: job?.id ?? null,
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      checked_at: submittedAt,
      result,
      notes: additionalDefectNote?.trim() || null,
      check_type: checkType,
      odometer_reading: Number(odometerReading),
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
      vehicle_confirmed_at: submittedAt,
      evidence_json: {
        source: "driver_mobile",
        engine: "walkaround_v3",
        template_label: checklist.templateLabel,
        template_addons: checklist.addons,
        check_type: checkType,
        started_at: startedAt ?? submittedAt,
        submitted_at: submittedAt,
        nil_defects_declared: result === "nil_defect",
        driver_declaration_signed: declarationSigned,
        driver_signature_data_url: signatureEvidence.signaturePreview,
        driver_signature_path: signatureEvidence.signaturePath,
        vehicle_profile: profile,
        odometer_reading: Number(odometerReading),
        fuel_level: fuelLevel ?? null,
        gps,
        highest_severity: derived.highestSeverity,
        outcome: derived.outcome,
        checks: legacyChecks,
        responses,
        failed_items: failedItems,
        defects_reported: Boolean(additionalDefectNote?.trim()),
        item_meta: Object.fromEntries(
          items.map((item) => [
            item.id,
            {
              sectionKey: item.sectionKey,
              category: item.category,
              label: item.questionTitle,
              severity: item.defaultSeverity,
              defectCategory: mapCategoryToDefect(item.category),
            },
          ]),
        ),
      },
    })
    .select("id")
    .single();

  if (checkError || !checkRow) {
    if (!navigator.onLine) {
      enqueueWalkaroundSubmission(driver.id, payload);
      discardWalkaroundDraft(driver, vehicle.id);
      return {
        ok: true,
        queued: true,
        result,
        outcome: derived.outcome,
        criticalCount: derived.criticalCount,
        failCount: derived.failCount,
        message: "No connection — check saved locally.",
      };
    }
    return { ok: false, message: checkError?.message ?? "Failed to save check." };
  }

  discardWalkaroundDraft(driver, vehicle.id);

  return {
    ok: true,
    checkId: checkRow.id,
    result,
    outcome: derived.outcome,
    highestSeverity: derived.highestSeverity,
    criticalCount: derived.criticalCount,
    failCount: derived.failCount,
  };
}

export async function flushPendingWalkaroundSubmissions(driver) {
  const queue = loadSyncQueue(driver.id);
  if (!queue.length || !navigator.onLine) {
    return { synced: 0, remaining: queue.length };
  }

  let synced = 0;
  for (const item of queue) {
    let result = await insertWalkaroundCheckViaCommand(item.payload);
    if (!result.ok && !result.skipLegacy) {
      result = await insertWalkaroundCheck(item.payload);
    }
    if (result.ok && !result.queued) {
      dequeueWalkaroundSubmission(driver.id, item.id);
      synced += 1;
    } else if (!result.ok) {
      break;
    }
  }

  return { synced, remaining: loadSyncQueue(driver.id).length };
}

export function getPendingSyncCount(driverId) {
  return loadSyncQueue(driverId).length;
}

function formatWalkaroundTimestamp(value) {
  return formatUkDateTime(value);
}

function formatCheckResultLabel(result) {
  if (result === "nil_defect") return "Nil defects";
  if (result === "passed") return "Passed";
  if (result === "failed") return "Failed";
  return String(result ?? "").replace(/_/g, " ");
}

async function signDriverPhotoPath(supabase, path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("defect-photos").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function getDriverCheckHistory(driver, { limit = 40 } = {}) {
  const listed = await listVehicleCheckHistoryViaCommand({ limit });
  if (listed.ok) {
    return {
      ok: true,
      checks: (listed.checks ?? []).map((check) => {
        const evidence = check.evidence ?? {};
        const checklist = check.checklist ?? {};
        const resultRaw = String(check.result ?? "");
        const result =
          resultRaw === "pass" || resultRaw === "pass_with_advisory"
            ? "passed"
            : resultRaw === "fail"
              ? "failed"
              : resultRaw;
        return {
          id: check.id,
          checkedAt: check.submittedAt,
          startedAt: check.startedAt ?? check.submittedAt,
          submittedAt: check.submittedAt,
          result,
          resultLabel: formatCheckResultLabel(result),
          checkType: check.checkType,
          odometer: check.odometer,
          registration: check.vehicleRegistration ?? "—",
          vehicleLabel: null,
          templateLabel: checklist.templateLabel ?? evidence.template_label ?? null,
          failCount: (checklist.failedItems ?? evidence.failed_items ?? []).length,
          outcome: check.opsOutcome ?? evidence.outcome ?? null,
        };
      }),
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_checks")
    .select(`
      id, checked_at, result, check_type, odometer_reading,
      vehicle:vehicles(registration, make, model),
      evidence_json
    `)
    .eq("driver_id", driver.id)
    .order("checked_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, message: error.message, checks: [] };

  return {
    ok: true,
    checks: (data ?? []).map((row) => {
      const vehicle = unwrapRelation(row.vehicle);
      const evidence = row.evidence_json ?? {};
      return {
        id: row.id,
        checkedAt: row.checked_at,
        startedAt: evidence.started_at ?? row.checked_at,
        submittedAt: evidence.submitted_at ?? row.checked_at,
        result: row.result,
        resultLabel: formatCheckResultLabel(row.result),
        checkType: row.check_type,
        odometer: row.odometer_reading,
        registration: vehicle?.registration ?? "—",
        vehicleLabel: [vehicle?.make, vehicle?.model].filter(Boolean).join(" ") || null,
        templateLabel: evidence.template_label ?? null,
        failCount: evidence.failed_items?.length ?? 0,
        outcome: evidence.outcome ?? null,
      };
    }),
  };
}

export async function getDriverCheckDetail(driver, checkId) {
  const listed = await listVehicleCheckHistoryViaCommand({ limit: 100 });
  if (listed.ok) {
    const check = (listed.checks ?? []).find((row) => String(row.id) === String(checkId));
    if (check) {
      const evidence = check.evidence ?? {};
      const checklist = check.checklist ?? {};
      const resultRaw = String(check.result ?? "");
      const result =
        resultRaw === "pass" || resultRaw === "pass_with_advisory"
          ? "passed"
          : resultRaw === "fail"
            ? "failed"
            : resultRaw;
      const failedItems = checklist.failedItems ?? evidence.failed_items ?? [];
      const responses = (checklist.responses ?? evidence.responses ?? []).filter(
        (r) => r.category !== "final_declaration",
      );
      return {
        ok: true,
        check: {
          id: check.id,
          checkedAt: check.submittedAt,
          startedAt: check.startedAt ?? check.submittedAt,
          submittedAt: check.submittedAt,
          result,
          resultLabel: formatCheckResultLabel(result),
          checkType: check.checkType,
          odometer: check.odometer,
          notes: evidence.additionalDefectNote ?? null,
          registration: check.vehicleRegistration ?? "—",
          vehicleType: evidence.vehicleProfile?.vehicleType,
          templateLabel: checklist.templateLabel ?? evidence.template_label,
          responses,
          failedItems,
          outcome: check.opsOutcome ?? evidence.outcome,
          highestSeverity: evidence.highestSeverity ?? evidence.highest_severity,
          fuelLevel: check.fuelLevel ?? evidence.fuel_level,
        },
      };
    }
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_checks")
    .select(`
      id, checked_at, result, check_type, odometer_reading, notes,
      vehicle:vehicles(registration, make, model, vehicle_type),
      evidence_json
    `)
    .eq("id", checkId)
    .eq("driver_id", driver.id)
    .maybeSingle();

  if (error || !data) return { ok: false, message: error?.message ?? "Check not found." };

  const vehicle = unwrapRelation(data.vehicle);
  const evidence = data.evidence_json ?? {};
  const failedItems = evidence.failed_items ?? [];
  const rawResponses = evidence.responses ?? [];

  const failedWithPhotos = await Promise.all(
    failedItems.map(async (item) => ({
      ...item,
      photoSignedUrl: await signDriverPhotoPath(supabase, item.photoPath ?? null),
    })),
  );

  const responses = await Promise.all(
    rawResponses
      .filter((r) => r.category !== "final_declaration")
      .map(async (r) => ({
        ...r,
        photoSignedUrl: r.photoPath ? await signDriverPhotoPath(supabase, r.photoPath) : null,
      })),
  );

  return {
    ok: true,
    check: {
      id: data.id,
      checkedAt: data.checked_at,
      startedAt: evidence.started_at ?? data.checked_at,
      submittedAt: evidence.submitted_at ?? data.checked_at,
      result: data.result,
      resultLabel: formatCheckResultLabel(data.result),
      checkType: data.check_type,
      odometer: data.odometer_reading,
      notes: data.notes,
      registration: vehicle?.registration ?? "—",
      vehicleType: vehicle?.vehicle_type,
      templateLabel: evidence.template_label,
      responses,
      failedItems: failedWithPhotos,
      outcome: evidence.outcome,
      highestSeverity: evidence.highest_severity,
      fuelLevel: evidence.fuel_level,
      odometerReading: evidence.odometer_reading ?? data.odometer_reading,
    },
  };
}

export async function getTodayCheckStatus(driver) {
  const safety = await getWalkaroundSafetyStatus(driver);
  return {
    complete: safety.checkComplete,
    result: safety.result,
    checkId: safety.checkId,
  };
}

/** @deprecated */
export async function loadDailyCheckContext(driver) {
  const session = await loadWalkaroundSession(driver);
  if (!session.ok) return { assigned: {}, items: [], template: {} };
  return {
    assigned: {
      vehicleId: session.vehicle.id,
      registration: session.vehicle.registration,
      jobId: session.job?.id,
      routeName: session.job?.route_name,
      wheelchairAccessible: session.profile.wheelchairAccessible,
    },
    template: { id: "dynamic", name: session.checklist.templateLabel, version: "3.0" },
    items: session.checklist.items.map((i) => ({
      id: i.id,
      category: i.category,
      questionTitle: i.questionTitle,
      sortOrder: i.sortOrder,
      requiresPhotoOnFail: i.requiresPhotoOnFail,
      autoBlockOnFail: i.autoBlockOnFail,
      defaultSeverity: i.defaultSeverity,
    })),
  };
}

/** @deprecated use submitWalkaroundCheck */
export async function submitDailyWalkaroundCheck(args) {
  return submitWalkaroundCheck(args);
}
