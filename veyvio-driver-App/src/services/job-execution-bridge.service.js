import {
  commandGetJobExecution,
  commandRecordJobExecution,
  getCommandApiBaseUrl,
} from "@/lib/command-api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { requireDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
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

/** Blueprint F-18 / TD-010 — Command is authoritative when configured. */
export function isCommandJobExecutionAuthoritative() {
  return Boolean(getCommandApiBaseUrl());
}

async function resolveDutyContext(jobId) {
  const boot = await loadDriverBootstrap().catch(() => null);
  const duties = boot?.ok ? boot.bootstrap?.duties ?? [] : [];
  const duty =
    duties.find((row) => String(row.id ?? row.dutyId) === String(jobId)) ??
    duties.find((row) => row?.actualSignOnAt && !row?.actualSignOffAt) ??
    null;

  if (!duty) return { dutyId: null, journeyId: null };
  return {
    dutyId: String(duty.id ?? duty.dutyId ?? ""),
    journeyId: duty.journeyId ?? duty.runId ?? duty.activeJourneyId ?? null,
  };
}

function buildExecutionPayload(input) {
  const dutyContext = input.dutyId
    ? { dutyId: input.dutyId, journeyId: input.journeyId }
    : null;

  return {
    jobId: String(input.jobId),
    eventType: input.eventType,
    stopId: input.stopId ?? null,
    stopSequence: input.stopSequence ?? null,
    payload: input.payload ?? {},
    clientId: input.clientId ?? `${input.eventType}-${input.jobId}-${Date.now()}`,
    dutyId: dutyContext?.dutyId ?? input.dutyId ?? null,
    journeyId: dutyContext?.journeyId ?? input.journeyId ?? null,
  };
}

/**
 * Record a job execution step on Command (required when authoritative).
 * Queues offline/transient failures — never silently drops.
 */
export async function recordJobExecutionAuthoritative(driver, session, input) {
  if (!isCommandJobExecutionAuthoritative()) {
    return { ok: true, skipped: true, authoritative: false };
  }

  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in.", authoritative: true };

  const dutyContext = input.dutyId ? { dutyId: input.dutyId, journeyId: input.journeyId } : await resolveDutyContext(input.jobId);
  const payload = buildExecutionPayload({
    ...input,
    dutyId: dutyContext.dutyId,
    journeyId: dutyContext.journeyId ?? input.journeyId,
  });

  const { companyId, membershipId } = requireDriverWorkspaceScope(driver, session);

  if (isOffline()) {
    try {
      await enqueueOpsCommand(driver.id, { type: "job_execution", payload }, companyId, membershipId);
    } catch (error) {
      return { ok: false, queued: false, authoritative: true, message: error.message, code: error.code };
    }
    return {
      ok: true,
      queued: true,
      authoritative: true,
      message: "Step saved on this device — Command will apply it when connection returns.",
    };
  }

  const result = await commandRecordJobExecution(token, payload);
  if (result.ok) return { ok: true, authoritative: true, event: result.event };

  if (shouldQueueOnFailure(result)) {
    try {
      await enqueueOpsCommand(driver.id, { type: "job_execution", payload }, companyId, membershipId);
    } catch (error) {
      return { ok: false, queued: false, authoritative: true, message: error.message, code: error.code };
    }
    return {
      ok: true,
      queued: true,
      authoritative: true,
      message: "Step saved on this device — Command will apply it when connection returns.",
    };
  }

  return { ok: false, authoritative: true, message: result.message ?? "Job step could not be recorded." };
}

/** @deprecated Use recordJobExecutionAuthoritative — kept for transitional callers. */
export async function mirrorJobExecutionToCommand(input) {
  if (!isCommandJobExecutionAuthoritative()) return { ok: true, skipped: true };
  const token = await accessToken();
  if (!token) return { ok: false, message: "Not signed in." };
  const dutyContext = input.dutyId ? { dutyId: input.dutyId, journeyId: input.journeyId } : await resolveDutyContext(input.jobId);
  return commandRecordJobExecution(token, buildExecutionPayload({
    ...input,
    dutyId: dutyContext.dutyId,
    journeyId: dutyContext.journeyId ?? input.journeyId,
  }));
}

export async function fetchJobExecutionSnapshot(jobId) {
  if (!isCommandJobExecutionAuthoritative()) return null;
  const token = await accessToken();
  if (!token) return null;
  const result = await commandGetJobExecution(token, jobId);
  if (!result.ok) return null;
  return result.snapshot ?? null;
}

export function mergeStopsWithCommandExecution(stops, snapshot) {
  if (!snapshot || !Array.isArray(stops)) return stops;
  return stops.map((stop) => {
    const fromId = snapshot.stopStatusById?.[stop.id];
    const seq = stop.stopOrder ?? stop.sequence;
    const fromSeq = seq != null ? snapshot.stopStatusBySequence?.[seq] : null;
    const next = fromId ?? fromSeq;
    return next ? { ...stop, status: next } : stop;
  });
}

export function assignmentFromExecutionSnapshot(snapshot, assignment) {
  if (!snapshot || !assignment) return assignment;
  return {
    ...assignment,
    acceptedAt: assignment.acceptedAt ?? snapshot.acceptedAt ?? null,
    startedAt: assignment.startedAt ?? snapshot.startedAt ?? null,
  };
}

export function jobStatusFromExecutionSnapshot(snapshot, status) {
  if (!snapshot) return status;
  if (snapshot.completedAt) return "completed";
  if (snapshot.startedAt) return "in_progress";
  return status;
}

export async function enrichJobRowsWithExecution(rows) {
  if (!isCommandJobExecutionAuthoritative() || !Array.isArray(rows) || rows.length === 0) {
    return rows;
  }

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const snapshot = await fetchJobExecutionSnapshot(String(row.job_id ?? row.id ?? ""));
      if (!snapshot) return row;

      const assignment = row._assignment ?? {};
      return {
        ...row,
        status: jobStatusFromExecutionSnapshot(snapshot, row.status),
        _assignment: {
          ...assignment,
          accepted_at: assignment.accepted_at ?? snapshot.acceptedAt ?? null,
          started_at: assignment.started_at ?? snapshot.startedAt ?? null,
        },
      };
    }),
  );

  return enriched;
}
