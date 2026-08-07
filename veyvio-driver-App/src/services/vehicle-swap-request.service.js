import {
  commandCreateVehicleSwapRequest,
  commandListDriverVehicleSwapRequests,
  getCommandApiBaseUrl,
} from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import { enqueueOpsCommand } from "@/lib/driver-ops-outbox.storage";

async function accessToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
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

export async function listDriverVehicleSwapRequests() {
  if (!getCommandApiBaseUrl()) return { ok: true, requests: [] };

  const token = await accessToken();
  if (!token) return { ok: false, requests: [], message: "Not signed in." };

  return commandListDriverVehicleSwapRequests(token);
}

export async function requestVehicleSwap(driver, session, input) {
  if (!getCommandApiBaseUrl()) {
    return {
      ok: false,
      message: "Vehicle swap requests need Command — contact dispatch by radio or message.",
    };
  }

  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };

  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  const payload = {
    ...input,
    clientId: input.clientId ?? `swap-${input.dutyId}-${Date.now()}`,
  };

  if (isOffline()) {
    enqueueOpsCommand(driver.id, { type: "vehicle_swap_request", payload }, companyId, membershipId);
    return {
      ok: true,
      queued: true,
      message: "Swap request saved — dispatch will see it when connection returns.",
    };
  }

  const result = await commandCreateVehicleSwapRequest(token, payload);
  if (result.ok) return result;

  if (shouldQueueOnFailure(result)) {
    enqueueOpsCommand(driver.id, { type: "vehicle_swap_request", payload }, companyId, membershipId);
    return {
      ok: true,
      queued: true,
      message: "Swap request saved — dispatch will see it when connection returns.",
    };
  }

  return result;
}
