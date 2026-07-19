import { getSupabaseClient } from "@/lib/supabase/client";
import { localToday } from "@/lib/local-date";
import { listAssignableVehicles } from "@/services/vehicle-check.service";

function roundHours(h) {
  return Math.round(h * 100) / 100;
}

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return roundHours((b - a) / (1000 * 60 * 60));
}

function mapSegment(row) {
  if (!row) return null;
  return {
    id: row.id,
    shiftId: row.shift_id,
    activityType: row.activity_type,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
    isBreak: row.is_break,
    isPoa: row.is_poa,
    isWtdWork: row.is_wtd_work,
    jobId: row.job_id,
    notes: row.notes,
  };
}

function mapShift(row) {
  if (!row) return null;
  return {
    id: row.id,
    shiftDate: row.shift_date,
    signOnAt: row.sign_on_at,
    signOffAt: row.sign_off_at,
    status: row.status,
    vehicleId: row.vehicle_id,
    jobId: row.job_id,
  };
}

async function loadOpenShift(driver, shiftDate = localToday()) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_shifts")
    .select("*")
    .eq("organisation_id", driver.organisationId)
    .eq("driver_id", driver.id)
    .eq("shift_date", shiftDate)
    .eq("status", "open")
    .order("sign_on_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return mapShift(data);
}

/** Today's shift whether still open or already signed off. */
async function loadTodayShift(driver, shiftDate = localToday()) {
  const open = await loadOpenShift(driver, shiftDate);
  if (open) return open;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_shifts")
    .select("*")
    .eq("organisation_id", driver.organisationId)
    .eq("driver_id", driver.id)
    .eq("shift_date", shiftDate)
    .order("sign_on_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return mapShift(data);
}

async function loadOpenSegment(driver) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_activity_segments")
    .select("*")
    .eq("organisation_id", driver.organisationId)
    .eq("driver_id", driver.id)
    .eq("status", "open")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return mapSegment(data);
}

export async function getDriverDutyState(driver) {
  const shiftDate = localToday();
  const [shift, openSegment, segmentsRes, vehicleOptions] = await Promise.all([
    loadTodayShift(driver, shiftDate),
    loadOpenSegment(driver),
    getSupabaseClient()
      .from("driver_activity_segments")
      .select("*")
      .eq("organisation_id", driver.organisationId)
      .eq("driver_id", driver.id)
      .gte("started_at", `${shiftDate}T00:00:00.000Z`)
      .lte("started_at", `${shiftDate}T23:59:59.999Z`)
      .order("started_at", { ascending: true }),
    listAssignableVehicles(driver),
  ]);

  const segments = (segmentsRes.data ?? []).map(mapSegment);
  const primaryVehicle = vehicleOptions[0]?.vehicle ?? null;
  const primaryJob = vehicleOptions[0]?.job ?? null;

  let dutyHours = 0;
  if (shift?.signOnAt) {
    dutyHours = hoursBetween(shift.signOnAt, shift.signOffAt ?? new Date().toISOString());
  }

  const isSignedOn = Boolean(shift?.signOnAt && shift.status === "open");
  const isShiftEnded = Boolean(shift?.signOffAt && shift.status === "closed");

  return {
    shiftDate,
    shift,
    openSegment,
    segments,
    dutyHours,
    primaryVehicle,
    primaryJob,
    isSignedOn,
    isShiftEnded,
  };
}

export async function signOnDriver(driver, { lat, lng } = {}) {
  const { ensureLocationPermission } = await import("@/services/fleet-tracking.service");
  const permission = await ensureLocationPermission();
  if (!permission.ok) return { ok: false, message: permission.message };

  const shiftDate = localToday();
  const existing = await loadOpenShift(driver, shiftDate);
  if (existing) {
    try {
      const { getActiveFleetSession, startFleetSession } = await import("@/services/fleet-tracking.service");
      const activeSession = await getActiveFleetSession(driver);
      if (!activeSession) {
        await startFleetSession(driver, {
          shiftId: existing.id,
          vehicleId: existing.vehicleId,
          depotId: driver.homeDepotId ?? null,
          lat,
          lng,
        });
      }
    } catch {
      /* optional */
    }
    return { ok: true, shift: existing, message: "Already signed on." };
  }

  const options = await listAssignableVehicles(driver);
  const primary = options[0] ?? null;
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("driver_shifts")
    .insert({
      organisation_id: driver.organisationId,
      driver_id: driver.id,
      depot_id: driver.homeDepotId ?? null,
      shift_date: shiftDate,
      vehicle_id: primary?.vehicleId ?? null,
      job_id: primary?.job?.id ?? null,
      sign_on_at: now,
      sign_on_lat: lat ?? null,
      sign_on_lng: lng ?? null,
      status: "open",
      source: "driver_app",
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  await supabase.from("driver_shift_events").insert({
    organisation_id: driver.organisationId,
    shift_id: data.id,
    driver_id: driver.id,
    event_type: "sign_on",
    event_time: now,
  });

  try {
    const { startFleetSession } = await import("@/services/fleet-tracking.service");
    await startFleetSession(driver, {
      shiftId: data.id,
      vehicleId: primary?.vehicleId ?? data.vehicle_id ?? null,
      depotId: driver.homeDepotId ?? null,
      lat,
      lng,
    });
  } catch {
    /* fleet tracking optional */
  }

  return { ok: true, shift: mapShift(data), message: "Signed on." };
}

async function closeOpenSegment(driver, endedAt) {
  const open = await loadOpenSegment(driver);
  if (!open) return null;

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("driver_activity_segments")
    .update({ ended_at: endedAt, status: "closed" })
    .eq("id", open.id)
    .eq("driver_id", driver.id);

  if (error) throw new Error(error.message);
  return open;
}

async function hasEndOfDutyCheckToday(driver, vehicleId = null) {
  const supabase = getSupabaseClient();
  const today = localToday();
  let query = supabase
    .from("driver_checks")
    .select("id")
    .eq("driver_id", driver.id)
    .in("check_type", ["end_of_duty", "post_journey"])
    .gte("checked_at", `${today}T00:00:00.000Z`);

  if (vehicleId) {
    query = query.eq("vehicle_id", vehicleId);
  }

  const { data, error } = await query.limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

export async function signOffDriver(driver, { lat, lng, skipPostJourneyCheck = false } = {}) {
  const shift = await loadOpenShift(driver);
  if (!shift) return { ok: false, message: "No open shift to sign off." };

  if (!skipPostJourneyCheck && shift.vehicleId) {
    const eodDone = await hasEndOfDutyCheckToday(driver, shift.vehicleId);
    if (!eodDone) {
      return {
        ok: false,
        needsEndOfDutyCheck: true,
        needsPostJourneyCheck: true,
        message: "Complete your end-of-duty check before signing off.",
      };
    }
  }

  const now = new Date().toISOString();
  await closeOpenSegment(driver, now);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_shifts")
    .update({
      sign_off_at: now,
      sign_off_lat: lat ?? null,
      sign_off_lng: lng ?? null,
      status: "closed",
    })
    .eq("id", shift.id)
    .eq("driver_id", driver.id)
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };

  await supabase.from("driver_shift_events").insert({
    organisation_id: driver.organisationId,
    shift_id: shift.id,
    driver_id: driver.id,
    event_type: "sign_off",
    event_time: now,
  });

  try {
    const { stopFleetSession } = await import("@/services/fleet-tracking.service");
    const stopResult = await stopFleetSession(driver, { lat, lng });
    if (stopResult?.safetyScore != null) {
      return {
        ok: true,
        shift: mapShift(data),
        message: "Signed off.",
        dutySummary: {
          safetyScore: stopResult.safetyScore,
          sessionStats: stopResult.session,
        },
      };
    }
  } catch {
    /* fleet tracking optional */
  }

  return { ok: true, shift: mapShift(data), message: "Signed off." };
}

export async function startActivitySegment(driver, input) {
  const shift = await loadOpenShift(driver);
  if (!shift) return { ok: false, message: "Sign on before logging activity." };

  const now = new Date().toISOString();
  await closeOpenSegment(driver, now);

  const activityType = input.activityType;
  const isBreak = activityType === "break";
  const isPoa = activityType === "poa";
  const isWtdWork = !isBreak && !(isPoa && input.poaKnownInAdvance === true);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_activity_segments")
    .insert({
      organisation_id: driver.organisationId,
      shift_id: shift.id,
      driver_id: driver.id,
      vehicle_id: shift.vehicleId,
      job_id: shift.jobId,
      activity_type: activityType,
      started_at: now,
      ended_at: null,
      source: "driver_app",
      source_ref: input.sourceRef ?? null,
      is_wtd_work: isWtdWork,
      is_break: isBreak,
      is_poa: isPoa,
      poa_known_in_advance: isPoa ? Boolean(input.poaKnownInAdvance) : null,
      notes: input.notes ?? null,
      status: "open",
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: error.message };
  return { ok: true, segment: mapSegment(data) };
}

export async function endCurrentActivitySegment(driver) {
  const open = await loadOpenSegment(driver);
  if (!open) return { ok: true, message: "No open activity." };

  const now = new Date().toISOString();
  await closeOpenSegment(driver, now);
  return { ok: true, message: "Activity ended." };
}

/** Called when a job starts — opens a driving segment. */
export async function startDrivingSegment(driver, { jobId, jobAssignmentId, vehicleId }) {
  const shift = await loadOpenShift(driver);
  const now = new Date().toISOString();
  if (shift) await closeOpenSegment(driver, now);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_activity_segments")
    .insert({
      organisation_id: driver.organisationId,
      shift_id: shift?.id ?? null,
      driver_id: driver.id,
      vehicle_id: vehicleId ?? shift?.vehicleId ?? null,
      job_id: jobId,
      job_assignment_id: jobAssignmentId ?? null,
      activity_type: "driving",
      started_at: now,
      ended_at: null,
      source: "driver_app",
      source_ref: jobAssignmentId ? `job_assignment:${jobAssignmentId}:driving` : null,
      is_wtd_work: true,
      is_break: false,
      is_poa: false,
      status: "open",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "42P01" || error.code === "23505") return { ok: true };
    return { ok: false, message: error.message };
  }
  return { ok: true, segment: mapSegment(data) };
}

/** Called when a job completes — closes the driving segment for that job. */
export async function endDrivingSegmentForJob(driver, jobId) {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { data: open } = await supabase
    .from("driver_activity_segments")
    .select("id")
    .eq("organisation_id", driver.organisationId)
    .eq("driver_id", driver.id)
    .eq("job_id", jobId)
    .eq("activity_type", "driving")
    .eq("status", "open")
    .maybeSingle();

  if (!open?.id) return { ok: true };

  const { error } = await supabase
    .from("driver_activity_segments")
    .update({ ended_at: now, status: "closed" })
    .eq("id", open.id);

  if (error && error.code !== "42P01") return { ok: false, message: error.message };
  return { ok: true };
}

export function formatDutyElapsed(signOnAt) {
  if (!signOnAt) return "0:00";
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(signOnAt).getTime()) / 1000));
  return formatSecondsAsDutyClock(elapsed);
}

export function formatDutyDuration(signOnAt, signOffAt) {
  if (!signOnAt || !signOffAt) return "0:00";
  const elapsed = Math.max(
    0,
    Math.floor((new Date(signOffAt).getTime() - new Date(signOnAt).getTime()) / 1000),
  );
  return formatSecondsAsDutyClock(elapsed);
}

function formatSecondsAsDutyClock(elapsed) {
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
