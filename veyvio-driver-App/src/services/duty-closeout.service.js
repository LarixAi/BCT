import {
  commandGetDutyCloseout,
  commandSubmitDutyCloseout,
  getCommandApiBaseUrl,
} from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import { enqueueOpsCommand } from "@/lib/driver-ops-outbox.storage";
import { loadDriverBootstrap } from "@/services/driver-bootstrap.service";

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

async function resolveDutyIdForJob(jobId) {
  const boot = await loadDriverBootstrap().catch(() => null);
  const duties = boot?.ok ? boot.bootstrap?.duties ?? [] : [];
  const duty = duties.find((row) => String(row.id ?? row.dutyId) === String(jobId));
  return duty ? String(duty.id ?? duty.dutyId) : null;
}

export async function hasDutyCloseoutOnCommand(jobId) {
  if (!getCommandApiBaseUrl()) return null;

  const token = await accessToken();
  if (!token) return null;

  const dutyId = await resolveDutyIdForJob(jobId);
  const result = await commandGetDutyCloseout(token, { jobId, dutyId: dutyId ?? undefined });
  if (!result.ok) return null;
  return Boolean(result.closeout);
}

export async function submitDutyCloseoutViaCommand(driver, session, jobId, payload) {
  if (!getCommandApiBaseUrl()) return { ok: false, skipped: true };

  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };

  const { companyId, membershipId } = resolveDriverWorkspaceScope(driver, session);
  const dutyId = await resolveDutyIdForJob(jobId);
  const clientId = `closeout-${jobId}-${Date.now()}`;
  const input = {
    jobId,
    jobReference: jobId,
    dutyId,
    payload,
    clientId,
  };

  if (isOffline()) {
    enqueueOpsCommand(driver.id, { type: "duty_closeout", payload: input }, companyId, membershipId);
    return {
      ok: true,
      queued: true,
      message: "Closeout saved on this device — Command will receive it when connection returns.",
    };
  }

  const result = await commandSubmitDutyCloseout(token, input);
  if (result.ok) return { ok: true, closeout: result.closeout };

  if (shouldQueueOnFailure(result)) {
    enqueueOpsCommand(driver.id, { type: "duty_closeout", payload: input }, companyId, membershipId);
    return {
      ok: true,
      queued: true,
      message: "Closeout saved on this device — Command will receive it when connection returns.",
    };
  }

  return result;
}
