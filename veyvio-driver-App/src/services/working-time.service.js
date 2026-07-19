import { getSupabaseClient } from "@/lib/supabase/client";
import { addLocalDays, formatLocalDate, localDateFromTimestamp, localToday } from "@/lib/local-date";
import { formatUkWeekdayShort } from "@/lib/uk-locale";

const OPEN_INFRINGEMENT_STATUSES = ["open", "needs_review", "escalated", "debrief_required", "debrief_issued"];

const LIMITS = {
  weeklyMaxHours: 60,
  referenceAverageHours: 48,
  warningThresholdHours: 52,
  criticalThresholdHours: 58,
};

const ACTIVITY_LABELS = {
  driving: "Driving",
  break: "Break",
  poa: "Available (POA)",
  other_work: "Other work",
  vehicle_check: "Vehicle check",
  end_of_duty_check: "End-of-duty check",
  incident_report: "Incident report",
  admin_time: "Admin",
  rest: "Rest",
};

function getWeekBounds(anchor) {
  const base = anchor ? new Date(`${anchor}T12:00:00`) : new Date();
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return {
    weekStart: formatLocalDate(monday),
    weekEnd: formatLocalDate(sunday),
  };
}

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0;
  return roundHours((endMs - startMs) / (1000 * 60 * 60));
}

function roundHours(value) {
  return Math.round(value * 100) / 100;
}

function resolveStatus(projectedHours) {
  if (projectedHours >= LIMITS.weeklyMaxHours) return "breach";
  if (projectedHours >= LIMITS.criticalThresholdHours) return "critical";
  if (projectedHours >= LIMITS.warningThresholdHours) return "warning";
  return "ok";
}

function dutyFromAssignment(row) {
  const job = row.job;
  if (!job || job.status === "cancelled") return null;

  let hours = 0;
  let source = "scheduled";
  let startAt = job.scheduled_start_at;
  let endAt = job.scheduled_end_at;

  const actual = hoursBetween(row.started_at, row.completed_at);
  if (actual > 0) {
    hours = actual;
    source = "actual";
    startAt = row.started_at;
    endAt = row.completed_at;
  } else {
    hours = hoursBetween(job.scheduled_start_at, job.scheduled_end_at);
    if (row.started_at) source = "projected";
  }

  if (hours <= 0) return null;

  return {
    jobId: job.id,
    assignmentId: row.id,
    routeName: job.route_name,
    serviceDate: job.service_date,
    startAt,
    endAt,
    hours,
    source,
    jobStatus: job.status,
    kind: "job",
  };
}

function segmentOverlapHours(segment, rangeStartIso, rangeEndIso) {
  const startMs = new Date(rangeStartIso).getTime();
  const endMs = new Date(rangeEndIso).getTime();
  const segStart = new Date(segment.startedAt).getTime();
  const segEnd = new Date(segment.endedAt ?? rangeEndIso).getTime();
  if (!Number.isFinite(segStart) || !Number.isFinite(segEnd)) return 0;
  const overlapStart = Math.max(segStart, startMs);
  const overlapEnd = Math.min(segEnd, endMs);
  if (overlapEnd <= overlapStart) return 0;
  return roundHours((overlapEnd - overlapStart) / (1000 * 60 * 60));
}

function mapSegmentRow(row) {
  return {
    id: row.id,
    activityType: row.activity_type,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    isBreak: Boolean(row.is_break),
    isWtdWork: Boolean(row.is_wtd_work),
    isPoa: Boolean(row.is_poa),
    jobId: row.job_id,
    notes: row.notes,
    status: row.status,
  };
}

function activityFromSegment(segment) {
  const hours = hoursBetween(segment.startedAt, segment.endedAt ?? new Date().toISOString());
  const serviceDate = localDateFromTimestamp(segment.startedAt);
  return {
    id: segment.id,
    kind: "activity",
    activityType: segment.activityType,
    routeName: ACTIVITY_LABELS[segment.activityType] ?? segment.activityType.replace(/_/g, " "),
    serviceDate,
    startAt: segment.startedAt,
    endAt: segment.endedAt,
    hours,
    source: segment.isBreak ? "break" : segment.isWtdWork ? "actual" : "other",
    isBreak: segment.isBreak,
    isWtdWork: segment.isWtdWork,
  };
}

function manualEntryToDuty(row) {
  const hours = hoursBetween(row.started_at, row.ended_at);
  if (hours <= 0) return null;
  return {
    jobId: row.id,
    assignmentId: row.id,
    routeName: `Other work (${String(row.entry_type ?? "other").replace(/_/g, " ")})`,
    serviceDate: row.entry_date,
    startAt: row.started_at,
    endAt: row.ended_at,
    hours,
    source: row.status === "approved" ? "actual" : "scheduled",
    jobStatus: row.status,
    kind: "manual",
    manualEntryType: row.entry_type,
  };
}

async function loadWeekSegments(driverId, organisationId, weekStart, weekEnd) {
  const supabase = getSupabaseClient();
  const rangeStart = `${weekStart}T00:00:00.000Z`;
  const rangeEnd = `${weekEnd}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from("driver_activity_segments")
    .select("id, activity_type, started_at, ended_at, is_wtd_work, is_break, is_poa, job_id, notes, status")
    .eq("organisation_id", organisationId)
    .eq("driver_id", driverId)
    .lt("started_at", rangeEnd)
    .order("started_at", { ascending: true });

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }

  const rangeStartMs = new Date(rangeStart).getTime();
  const rangeEndMs = new Date(rangeEnd).getTime();

  return (data ?? [])
    .map(mapSegmentRow)
    .filter((segment) => {
      const segStart = new Date(segment.startedAt).getTime();
      const segEnd = segment.endedAt ? new Date(segment.endedAt).getTime() : rangeEndMs;
      return segEnd > rangeStartMs && segStart < rangeEndMs;
    });
}

async function loadWeekManualEntries(driverId, organisationId, weekStart, weekEnd) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_working_time_entries")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("driver_id", driverId)
    .gte("entry_date", weekStart)
    .lte("entry_date", weekEnd)
    .in("status", ["pending", "approved"])
    .order("entry_date", { ascending: true });

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

async function loadWeekShifts(driverId, organisationId, weekStart, weekEnd) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_shifts")
    .select("id, shift_date, sign_on_at, sign_off_at, status")
    .eq("organisation_id", organisationId)
    .eq("driver_id", driverId)
    .gte("shift_date", weekStart)
    .lte("shift_date", weekEnd);

  if (error) {
    if (error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return data ?? [];
}

function sumWtdHoursOnDate(segments, manualEntries, isoDate, nowIso) {
  const dayStart = `${isoDate}T00:00:00.000Z`;
  const dayEnd = isoDate === localToday() ? nowIso : `${isoDate}T23:59:59.999Z`;

  let total = 0;
  for (const segment of segments) {
    if (!segment.isWtdWork || segment.isBreak) continue;
    if (localDateFromTimestamp(segment.startedAt) !== isoDate) continue;
    total += segmentOverlapHours(segment, dayStart, dayEnd);
  }

  for (const row of manualEntries) {
    if (row.entry_date !== isoDate) continue;
    if (row.status === "approved") {
      total += hoursBetween(row.started_at, row.ended_at);
    }
  }

  return roundHours(total);
}

function sumBreakHoursOnDate(segments, isoDate, nowIso) {
  const dayStart = `${isoDate}T00:00:00.000Z`;
  const dayEnd = isoDate === localToday() ? nowIso : `${isoDate}T23:59:59.999Z`;
  let total = 0;
  for (const segment of segments) {
    if (!segment.isBreak && segment.activityType !== "break") continue;
    if (localDateFromTimestamp(segment.startedAt) !== isoDate) continue;
    total += segmentOverlapHours(segment, dayStart, dayEnd);
  }
  return roundHours(total);
}

/**
 * Build per-day breakdown including implicit rest days (WTD: non-working days count as rest).
 */
export function buildWeeklyDayBreakdown({
  weekStart,
  duties = [],
  segments = [],
  manualEntries = [],
  shifts = [],
  today = localToday(),
}) {
  const nowIso = new Date().toISOString();
  const shiftDates = new Set((shifts ?? []).map((s) => s.shift_date));
  const days = [];

  for (let i = 0; i < 7; i++) {
    const iso = addLocalDays(weekStart, i);
    const label = formatUkWeekdayShort(`${iso}T12:00:00`);

    const segmentWtd = sumWtdHoursOnDate(segments, manualEntries, iso, nowIso);
    const breakHours = sumBreakHoursOnDate(segments, iso, nowIso);

    const rosterHours = (duties ?? [])
      .filter((duty) => duty.serviceDate === iso)
      .reduce((sum, duty) => sum + duty.hours, 0);

    const hasSegmentsOnDay = segments.some((s) => localDateFromTimestamp(s.startedAt) === iso);
    const rosterFallback = !hasSegmentsOnDay && segmentWtd === 0 ? rosterHours : 0;
    const hours = roundHours(segmentWtd + rosterFallback);

    let dayType = "future";
    if (iso < today) {
      dayType = hours > 0 || breakHours > 0 || shiftDates.has(iso) ? "work" : "rest";
    } else if (iso === today) {
      dayType = hours > 0 || breakHours > 0 || shiftDates.has(iso) ? "work" : "today";
    } else {
      dayType = rosterFallback > 0 ? "scheduled" : "future";
    }

    days.push({ label, iso, hours, breakHours, dayType });
  }

  return days;
}

/** @deprecated use buildWeeklyDayBreakdown */
export function buildDailyHoursFromDuties(duties, weekStart) {
  return buildWeeklyDayBreakdown({ weekStart, duties }).map((d) => ({
    label: d.label,
    iso: d.iso,
    hours: d.hours,
  }));
}

async function resolveDriverOrganisationId(supabase, driverId, fallbackOrgId) {
  const { data, error } = await supabase
    .from("drivers")
    .select("organisation_id, company_id")
    .eq("id", driverId)
    .maybeSingle();

  if (!error && data) {
    return data.organisation_id || data.company_id || fallbackOrgId || null;
  }

  // Command schema uses company_id only — column organisation_id does not exist.
  if (error && /organisation_id/i.test(error.message || "")) {
    const retry = await supabase
      .from("drivers")
      .select("company_id")
      .eq("id", driverId)
      .maybeSingle();
    if (!retry.error && retry.data?.company_id) return retry.data.company_id;
  }

  return fallbackOrgId || null;
}

/** Build a WTD-style summary from Command published duties when legacy tables are unavailable. */
export function buildWorkingTimeSummaryFromCommandDuties(commandDuties = [], weekStartInput, opts = {}) {
  const { weekStart, weekEnd } = weekStartInput
    ? { weekStart: weekStartInput, weekEnd: getWeekBounds(weekStartInput).weekEnd }
    : getWeekBounds();
  const today = localToday();
  const nowIso = new Date().toISOString();

  const duties = [];
  let scheduledHours = 0;
  let actualHours = 0;

  for (const duty of commandDuties) {
    const serviceDate =
      (duty.serviceDate || duty.scheduledStartAt || duty.plannedStartAt || "").slice(0, 10);
    if (!serviceDate || serviceDate < weekStart || serviceDate > weekEnd) continue;

    const startAt = duty.actualSignOnAt || duty.scheduledStartAt || duty.plannedStartAt || null;
    const endAt =
      duty.actualSignOffAt ||
      duty.scheduledEndAt ||
      duty.plannedEndAt ||
      (duty.actualSignOnAt ? nowIso : null);
    const hours = hoursBetween(startAt, endAt);
    if (hours <= 0 && !duty.scheduledStartAt && !duty.plannedStartAt) continue;

    const scheduled = hoursBetween(
      duty.scheduledStartAt || duty.plannedStartAt,
      duty.scheduledEndAt || duty.plannedEndAt,
    );
    const useHours = hours > 0 ? hours : scheduled;
    if (useHours <= 0) continue;

    const source = duty.actualSignOnAt ? (duty.actualSignOffAt ? "actual" : "projected") : "scheduled";
    if (source === "actual" || source === "projected") actualHours += useHours;
    else scheduledHours += useHours;

    duties.push({
      jobId: duty.id,
      assignmentId: duty.id,
      routeName: duty.routeName || duty.reference || "Published duty",
      serviceDate,
      startAt,
      endAt,
      hours: roundHours(useHours),
      source,
      jobStatus: duty.lifecycleStatus || duty.status || "published",
      kind: "job",
    });
  }

  duties.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate) || a.routeName.localeCompare(b.routeName));
  const projectedHours = roundHours(duties.reduce((s, d) => s + d.hours, 0));
  const dailyBreakdown = buildWeeklyDayBreakdown({ weekStart, duties, today });
  const restDays = dailyBreakdown.filter((d) => d.dayType === "rest").length;

  return {
    weekStart,
    weekEnd,
    scheduledHours: roundHours(scheduledHours),
    actualHours: roundHours(actualHours),
    projectedHours,
    segmentWtdHours: 0,
    liveRecordedHours: roundHours(actualHours),
    restDays,
    remainingHours: Math.max(0, roundHours(LIMITS.weeklyMaxHours - projectedHours)),
    limits: LIMITS,
    status: resolveStatus(projectedHours),
    duties,
    activities: [],
    timelineItems: duties,
    dailyBreakdown,
    openWorkingTimeInfringements: 0,
    hasLiveTimeline: Boolean(opts.hasLiveSignOn),
    source: "command_duties",
    calculatedAt: nowIso,
  };
}

export async function getDriverWorkingTimeSummary(driverId, weekStartInput, opts = {}) {
  const { weekStart, weekEnd } = weekStartInput
    ? { weekStart: weekStartInput, weekEnd: getWeekBounds(weekStartInput).weekEnd }
    : getWeekBounds();

  const supabase = getSupabaseClient();
  const today = localToday();
  const nowIso = new Date().toISOString();
  const rangeStart = `${weekStart}T00:00:00.000Z`;
  const rangeEnd = `${weekEnd}T23:59:59.999Z`;

  const organisationId = await resolveDriverOrganisationId(
    supabase,
    driverId,
    opts.organisationId ?? null,
  );

  if (!organisationId) {
    if (opts.commandDuties?.length) {
      return buildWorkingTimeSummaryFromCommandDuties(opts.commandDuties, weekStart, {
        hasLiveSignOn: opts.hasLiveSignOn,
      });
    }
    throw new Error("Driver company not found for working time");
  }

  const [assignmentsRes, segments, manualEntries, shifts] = await Promise.all([
    supabase
      .from("job_assignments")
      .select(`
        id,
        driver_id,
        started_at,
        completed_at,
        status,
        job:jobs!inner(
          id,
          route_name,
          service_date,
          status,
          scheduled_start_at,
          scheduled_end_at
        )
      `)
      .eq("driver_id", driverId)
      .eq("is_current", true)
      .gte("job.service_date", weekStart)
      .lte("job.service_date", weekEnd),
    loadWeekSegments(driverId, organisationId, weekStart, weekEnd).catch(() => []),
    loadWeekManualEntries(driverId, organisationId, weekStart, weekEnd).catch(() => []),
    loadWeekShifts(driverId, organisationId, weekStart, weekEnd).catch(() => []),
  ]);

  if (assignmentsRes.error && opts.commandDuties) {
    return buildWorkingTimeSummaryFromCommandDuties(opts.commandDuties, weekStart, {
      hasLiveSignOn: opts.hasLiveSignOn,
    });
  }

  if (assignmentsRes.error) {
    if (opts.commandDuties?.length) {
      return buildWorkingTimeSummaryFromCommandDuties(opts.commandDuties, weekStart, {
        hasLiveSignOn: opts.hasLiveSignOn,
      });
    }
    throw new Error(assignmentsRes.error.message);
  }

  const duties = [];
  let scheduledHours = 0;
  let actualHours = 0;

  for (const row of assignmentsRes.data ?? []) {
    const duty = dutyFromAssignment(row);
    if (!duty) continue;
    duties.push(duty);
    if (duty.source === "actual") actualHours += duty.hours;
    else scheduledHours += duty.hours;
  }

  const activities = segments.map(activityFromSegment);
  for (const row of manualEntries) {
    const duty = manualEntryToDuty(row);
    if (duty) duties.push(duty);
  }

  duties.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate) || a.routeName.localeCompare(b.routeName));
  activities.sort((a, b) => (a.startAt ?? "").localeCompare(b.startAt ?? ""));

  const rosterProjected = roundHours(duties.reduce((s, d) => s + d.hours, 0));

  let segmentWtdHours = 0;
  for (const segment of segments) {
    if (!segment.isWtdWork || segment.isBreak) continue;
    segmentWtdHours += segmentOverlapHours(segment, rangeStart, rangeEnd);
  }
  segmentWtdHours = roundHours(segmentWtdHours);

  const approvedManualHours = roundHours(
    manualEntries
      .filter((e) => e.status === "approved")
      .reduce((s, e) => s + hoursBetween(e.started_at, e.ended_at), 0),
  );

  const liveRecordedHours = roundHours(segmentWtdHours + approvedManualHours);
  const projectedHours = roundHours(Math.max(rosterProjected, liveRecordedHours));

  const dailyBreakdown = buildWeeklyDayBreakdown({
    weekStart,
    duties,
    segments,
    manualEntries,
    shifts,
    today,
  });

  const restDays = dailyBreakdown.filter((d) => d.dayType === "rest").length;

  let infringementCount = 0;
  try {
    const { count } = await supabase
      .from("driver_infringements")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", driverId)
      .in("status", OPEN_INFRINGEMENT_STATUSES)
      .in("category", ["working_time", "drivers_hours"]);
    infringementCount = count ?? 0;
  } catch {
    infringementCount = 0;
  }

  // Prefer Command duties when legacy roster is empty.
  if (duties.length === 0 && opts.commandDuties?.length) {
    return buildWorkingTimeSummaryFromCommandDuties(opts.commandDuties, weekStart, {
      hasLiveSignOn: opts.hasLiveSignOn,
    });
  }

  const timelineItems =
    activities.length > 0
      ? activities
      : duties.filter((d) => d.kind === "job");

  return {
    weekStart,
    weekEnd,
    scheduledHours: roundHours(scheduledHours),
    actualHours: roundHours(Math.max(actualHours, liveRecordedHours)),
    projectedHours,
    segmentWtdHours,
    liveRecordedHours,
    restDays,
    remainingHours: Math.max(0, roundHours(LIMITS.weeklyMaxHours - projectedHours)),
    limits: LIMITS,
    status: resolveStatus(projectedHours),
    duties,
    activities,
    timelineItems,
    dailyBreakdown,
    openWorkingTimeInfringements: infringementCount ?? 0,
    hasLiveTimeline: segments.length > 0,
    source: "legacy",
    calculatedAt: nowIso,
  };
}

export function formatWorkingHours(hours) {
  if (!Number.isFinite(hours)) return "0h";
  if (hours === Math.floor(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

export function shiftWeek(weekStart, deltaWeeks) {
  return addLocalDays(weekStart, deltaWeeks * 7);
}

export async function logDriverOtherWork(driverId, { entryDate, startTime, endTime, entryType, notes }, opts = {}) {
  const supabase = getSupabaseClient();
  const startedAt = new Date(`${entryDate}T${startTime}:00`).toISOString();
  const endedAt = new Date(`${entryDate}T${endTime}:00`).toISOString();

  const organisationId = await resolveDriverOrganisationId(
    supabase,
    driverId,
    opts.organisationId ?? null,
  );

  if (!organisationId) {
    return {
      ok: false,
      message: "Other work logging is not available on Command yet. Use My duty for sign-on hours.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("driver_working_time_entries").insert({
    organisation_id: organisationId,
    company_id: organisationId,
    driver_id: driverId,
    entry_date: entryDate,
    started_at: startedAt,
    ended_at: endedAt,
    entry_type: entryType,
    notes: notes?.trim() || null,
    status: "pending",
    created_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === "42P01" || /does not exist|organisation_id|company_id/i.test(error.message || "")) {
      return {
        ok: false,
        message: "Other work logging is not available on Command yet. Use My duty for sign-on hours.",
      };
    }
    return { ok: false, message: error.message };
  }

  return { ok: true };
}
