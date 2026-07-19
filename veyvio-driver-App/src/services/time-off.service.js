import { getSupabaseClient } from "@/lib/supabase/client";
import { formatUkDate } from "@/lib/uk-locale";

const TYPE_LABELS = {
  holiday: "Holiday",
  sick: "Sickness",
  training: "Training",
  other: "Other",
};

const STATUS_LABELS = {
  requested: "Pending approval",
  approved: "Approved",
  rejected: "Declined",
  cancelled: "Cancelled",
};

function localKey(driverId) {
  return `veyvio.time-off.v1.${driverId || "driver"}`;
}

function readLocal(driverId) {
  try {
    const raw = localStorage.getItem(localKey(driverId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(driverId, rows) {
  try {
    localStorage.setItem(localKey(driverId), JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function isMissingTableError(error) {
  if (!error) return false;
  const msg = String(error.message || "");
  return (
    error.code === "42P01" ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /organisation_id/i.test(msg)
  );
}

function mapRow(row) {
  return {
    id: row.id,
    absenceType: row.absence_type ?? row.absenceType,
    absenceLabel: TYPE_LABELS[row.absence_type ?? row.absenceType] ?? row.absence_type ?? row.absenceType,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] ?? row.status,
    dateFrom: row.date_from ?? row.dateFrom,
    dateTo: row.date_to ?? row.dateTo,
    partOfDay: row.part_of_day ?? row.partOfDay ?? "full_day",
    reason: row.reason,
    notes: row.notes,
    createdAt: row.created_at ?? row.createdAt,
    source: row.source || "remote",
  };
}

export async function listDriverTimeOffRequests(driverId, { limit = 40 } = {}) {
  const local = readLocal(driverId).map(mapRow);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("driver_absences")
    .select("id, absence_type, status, date_from, date_to, part_of_day, reason, notes, created_at")
    .eq("driver_id", driverId)
    .neq("status", "cancelled")
    .order("date_from", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      return { items: local, source: local.length ? "local" : "empty" };
    }
    throw new Error(error.message);
  }

  const remote = (data ?? []).map(mapRow);
  const remoteIds = new Set(remote.map((r) => r.id));
  const merged = [...remote, ...local.filter((r) => !remoteIds.has(r.id))];
  return {
    items: merged.slice(0, limit),
    source: remote.length ? "remote" : local.length ? "local" : "empty",
  };
}

export async function getNextApprovedLeave(driverId) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { items } = await listDriverTimeOffRequests(driverId, { limit: 40 });
    return (
      items.find(
        (row) => row.status === "approved" && row.dateTo >= today,
      ) ?? null
    );
  } catch {
    return null;
  }
}

export async function submitDriverTimeOffRequest(
  driver,
  { absenceType, dateFrom, dateTo, partOfDay, reason, notes },
) {
  if (!dateFrom || !dateTo) {
    return { ok: false, message: "Choose a start and end date." };
  }
  if (dateTo < dateFrom) {
    return { ok: false, message: "End date must be on or after the start date." };
  }
  if (absenceType === "sick" && !reason?.trim()) {
    return { ok: false, message: "Add a short reason for sickness leave." };
  }

  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = driver.organisationId || driver.companyId || null;

  const { error } = await supabase.from("driver_absences").insert({
    organisation_id: orgId,
    company_id: orgId,
    driver_id: driver.id,
    depot_id: driver.homeDepotId ?? driver.depotId ?? null,
    absence_type: absenceType,
    status: "requested",
    date_from: dateFrom,
    date_to: dateTo,
    part_of_day: partOfDay ?? "full_day",
    reason: reason?.trim() || null,
    notes: notes?.trim() || null,
    requested_by: user?.id ?? null,
  });

  if (!error) {
    return { ok: true, source: "remote" };
  }

  if (error.code === "42501") {
    return {
      ok: false,
      message: "You do not have permission to request time off yet. Contact your transport manager.",
    };
  }

  if (!isMissingTableError(error) && !/organisation_id|company_id/i.test(error.message || "")) {
    return { ok: false, message: error.message };
  }

  // Command may not have driver_absences yet — keep request on-device for the manager conversation.
  const localRow = {
    id: `local-${Date.now()}`,
    absence_type: absenceType,
    status: "requested",
    date_from: dateFrom,
    date_to: dateTo,
    part_of_day: partOfDay ?? "full_day",
    reason: reason?.trim() || null,
    notes: notes?.trim() || null,
    created_at: new Date().toISOString(),
    source: "local",
  };
  writeLocal(driver.id, [localRow, ...readLocal(driver.id)]);

  return {
    ok: true,
    source: "local",
    message:
      "Saved on this device. Tell your transport manager — Admin leave approval is not live on Command yet.",
  };
}

/** Dates covered by a leave request (inclusive). */
export function eachDateInRange(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return [];
  const out = [];
  let cur = dateFrom;
  while (cur <= dateTo) {
    out.push(cur);
    const d = new Date(`${cur}T12:00:00`);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    cur = `${y}-${m}-${day}`;
    if (out.length > 400) break;
  }
  return out;
}

export function formatDateRange(dateFrom, dateTo) {
  const fmt = (iso) => formatUkDate(`${iso}T12:00:00`);
  if (dateFrom === dateTo) return fmt(dateFrom);
  return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
}

export { TYPE_LABELS, STATUS_LABELS };
