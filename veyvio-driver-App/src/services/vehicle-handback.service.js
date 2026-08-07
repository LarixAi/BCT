import { commandPostDriverVehicleParked, getCommandApiBaseUrl } from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { enqueueOpsCommand } from "@/lib/driver-ops-outbox.storage";
import {
  clearHandbackDraft,
  saveHandbackDraft,
} from "@/lib/vehicle-handback-draft.storage";
import { loadAssignedVehicleTimeline } from "@/services/vehicle-timeline.service";
import { parseHandbackChecksFromDetail } from "@/lib/vehicle-handback-checks";

function parseHandbackDetail(detail) {
  const text = String(detail ?? "");
  const referenceMatch = text.match(/\b(VR-[A-Z0-9-]+)\b/i);
  const bayMatch = text.match(/Parked at (Bay \d+|[^·]+)/i);
  return {
    handbackReference: referenceMatch?.[1] ?? null,
    parkingLabel: bayMatch?.[1]?.trim() ?? null,
    handbackChecks: parseHandbackChecksFromDetail(text),
  };
}

/** True when Command already has a handback on the vehicle timeline (e.g. synced from another session). */
export async function loadCommandHandbackStatus({ bootstrap, vehicle } = {}) {
  const timeline = await loadAssignedVehicleTimeline({ bootstrap, vehicle });
  if (!timeline.ok) {
    return { ok: false, recorded: false, message: timeline.message };
  }

  const event = (timeline.events ?? []).find((row) => row.category === "handback") ?? null;
  if (!event) return { ok: true, recorded: false };

  const parsed = parseHandbackDetail(event.detail);
  return {
    ok: true,
    recorded: true,
    submittedAt: event.occurredAt ?? null,
    handbackReference: parsed.handbackReference,
    parkingLabel: parsed.parkingLabel,
    handbackChecks: parsed.handbackChecks,
    detail: event.detail ?? null,
    title: event.title ?? null,
  };
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function shouldQueueOnFailure(result) {
  const message = String(result?.message ?? "").toLowerCase();
  if (typeof result?.status === "number") {
    if (result.status >= 500) return true;
    if (result.status === 429) return true;
    if (result.status >= 400 && result.status < 500) return false;
  }
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("timeout")
  );
}

async function readAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function persistHandbackDraft(companyId, membershipId, vehicleId, draft) {
  saveHandbackDraft(companyId, membershipId, vehicleId, draft);
}

export async function submitVehicleHandback({
  vehicleId,
  depotId,
  dutyId,
  locationType = "BAY",
  bayNumber = null,
  freeTextLocation = null,
  keysReturned = true,
  keyLocation = "Key cabinet",
  fullyInsideBay = true,
  endMileage,
  fuelLevel,
  notes,
  handbackChecks,
  companyId,
  membershipId,
  driverId,
}) {
  const payload = {
    vehicleId,
    depotId,
    dutyId,
    locationType,
    bayNumber,
    freeTextLocation,
    keysReturned,
    keyLocation,
    fullyInsideBay,
    endMileage: endMileage != null ? Number(endMileage) : undefined,
    fuelLevel,
    notes,
    handbackChecks,
  };

  if (isOffline()) {
    if (!driverId) return { ok: false, message: "Driver session missing." };
    enqueueOpsCommand(driverId, { type: "handback", payload }, companyId, membershipId);
    if (companyId && membershipId && vehicleId) {
      clearHandbackDraft(companyId, membershipId, vehicleId);
    }
    return {
      ok: true,
      queued: true,
      message: "Handback saved on this device — will reach Command when connection returns.",
    };
  }

  const token = await readAccessToken();
  if (!token) return { ok: false, message: "Sign in again to submit handback." };

  const result = await commandPostDriverVehicleParked(token, payload);

  if (!result.ok && getCommandApiBaseUrl() && shouldQueueOnFailure(result)) {
    if (!driverId) return result;
    enqueueOpsCommand(driverId, { type: "handback", payload }, companyId, membershipId);
    if (companyId && membershipId && vehicleId) {
      clearHandbackDraft(companyId, membershipId, vehicleId);
    }
    return {
      ok: true,
      queued: true,
      message: "Handback saved on this device — will reach Command when connection returns.",
    };
  }

  if (result.ok && companyId && membershipId && vehicleId) {
    clearHandbackDraft(companyId, membershipId, vehicleId);
  }

  return result;
}
