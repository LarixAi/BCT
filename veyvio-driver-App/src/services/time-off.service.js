import { getSupabaseClient } from "@/lib/supabase/client";
import { formatUkDate } from "@/lib/uk-locale";
import {
  getCommandApiBaseUrl,
  commandGetDriverHolidayBalance,
  commandListDriverHolidayRequests,
  commandSubmitDriverHolidayRequest,
} from "@/lib/command-api";

const TYPE_LABELS = {
  holiday: "Annual leave",
  unpaid: "Unpaid leave",
  medical_appointment: "Medical appointment",
  emergency: "Emergency dependant leave",
  compassionate: "Compassionate leave",
  sick: "Sickness",
  training: "Training",
  other: "Other",
  annual_leave: "Annual leave",
  unpaid_leave: "Unpaid leave",
  sick_leave: "Sickness",
};

const STATUS_LABELS = {
  requested: "Pending approval",
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Declined",
  cancelled: "Cancelled",
  moved: "Approved",
};

async function accessTokenFromSession(session) {
  if (session?.accessToken || session?.access_token) {
    return session.accessToken ?? session.access_token;
  }
  const supabase = getSupabaseClient();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  return authSession?.access_token ?? null;
}

function mapRow(row) {
  const absenceType = row.absenceType ?? row.absence_type ?? row.leaveType ?? "holiday";
  const status = row.status === "pending" ? "requested" : row.status;
  return {
    id: row.id,
    absenceType,
    absenceLabel: TYPE_LABELS[absenceType] ?? String(absenceType).replace(/_/g, " "),
    status,
    statusLabel: STATUS_LABELS[status] ?? STATUS_LABELS[row.status] ?? row.statusLabel ?? status,
    dateFrom: row.dateFrom ?? row.date_from ?? row.startDate,
    dateTo: row.dateTo ?? row.date_to ?? row.endDate,
    partOfDay: row.partOfDay ?? row.part_of_day ?? "full_day",
    reason: row.reason,
    notes: row.notes,
    createdAt: row.createdAt ?? row.created_at ?? row.submittedAt,
    decidedAt: row.decidedAt ?? null,
    decidedBy: row.decidedBy ?? null,
    reference: row.reference,
    source: row.source || "command",
  };
}

export async function loadDriverHolidayBalance(session) {
  const token = await accessTokenFromSession(session);
  if (!token) {
    return {
      ok: false,
      message: "Sign in again to load holiday balance.",
      wired: Boolean(getCommandApiBaseUrl()),
    };
  }
  if (!getCommandApiBaseUrl()) {
    return { ok: false, message: "Command API URL is not configured in this app build.", wired: false };
  }
  const result = await commandGetDriverHolidayBalance(token);
  return { ...result, wired: true };
}

export async function listDriverTimeOffRequests(driverId, { limit = 40, session } = {}) {
  const token = await accessTokenFromSession(session);
  if (token && getCommandApiBaseUrl()) {
    const result = await commandListDriverHolidayRequests(token);
    if (result.ok) {
      const items = (result.items ?? []).map(mapRow).slice(0, limit);
      return { items, source: "command", ok: true };
    }
    return { items: [], source: "error", ok: false, message: result.message };
  }

  return {
    items: [],
    source: "empty",
    ok: false,
    message: "Sign in with Command to see holiday requests.",
  };
}

export async function getNextApprovedLeave(driverId, session) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { items } = await listDriverTimeOffRequests(driverId, { limit: 40, session });
    return (
      items.find((row) => row.status === "approved" && row.dateTo >= today) ?? null
    );
  } catch {
    return null;
  }
}

export async function submitDriverTimeOffRequest(
  driver,
  { absenceType, dateFrom, dateTo, partOfDay, reason, notes, session },
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

  const token = await accessTokenFromSession(session);
  if (!token || !getCommandApiBaseUrl()) {
    return {
      ok: false,
      message: "Command is not connected. Sign in again to request time off.",
    };
  }

  const result = await commandSubmitDriverHolidayRequest(token, {
    absenceType,
    dateFrom,
    dateTo,
    partOfDay: partOfDay ?? "full_day",
    reason: reason?.trim() || notes?.trim() || undefined,
    notes: notes?.trim() || undefined,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return {
    ok: true,
    source: "command",
    item: result.item ? mapRow(result.item) : null,
    workingDays: result.workingDays,
    message: "Request sent to your transport manager for approval.",
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
