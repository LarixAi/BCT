import { useCallback, useEffect, useMemo, useState } from "react";
import { OperationalPage, InfoRow, DriverSectionTitle } from "./DriverOperationalPageParts";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import { op } from "@/lib/driver-operational-theme";
import { refreshCommandBootstrap } from "@/services/command-driver-ops.service";
import {
  describeOfflineQueue,
  probeDriverCommandCapabilities,
} from "@/services/driver-sync-status.service";
import { flushOpsOutbox } from "@/services/driver-ops-outbox.service";
import { probeDriverTrainingConnection } from "@/services/training.service";
import { formatUkDateTime } from "@/lib/uk-locale";
import { withTimeout } from "@/lib/withTimeout";

const PROBE_TIMEOUT_MS = 12000;

function emptyQueue() {
  return { status: "READY", total: 0, walkaroundChecks: 0, locationPings: 0, opsCommands: 0 };
}

function unavailableQueue() {
  return {
    status: "CONTEXT_UNAVAILABLE",
    code: "OFFLINE_CONTEXT_NOT_READY",
    total: null,
    walkaroundChecks: null,
    locationPings: null,
    opsCommands: null,
  };
}

export default function DriverSyncCentre() {
  const { session, driver } = useDriverSupabaseAuth();
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState("");
  const [trainingProbe, setTrainingProbe] = useState(null);
  const [capabilityProbe, setCapabilityProbe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flushMsg, setFlushMsg] = useState("");
  const [offlineQueue, setOfflineQueue] = useState(emptyQueue);
  const [syncing, setSyncing] = useState(false);

  const workspace = useMemo(
    () => resolveDriverWorkspaceScope(driver, session),
    [driver, session],
  );

  const refreshQueue = useCallback(async () => {
    if (!driver?.id || !workspace.companyId || !workspace.membershipId) {
      setOfflineQueue(unavailableQueue());
      return unavailableQueue();
    }
    const next = await describeOfflineQueue(driver.id, workspace.companyId, workspace.membershipId);
    setOfflineQueue(next);
    return next;
  }, [driver?.id, workspace.companyId, workspace.membershipId]);

  const runFlush = useCallback(async () => {
    if (!driver?.id) return { remaining: 0 };
    setSyncing(true);
    setFlushMsg("");
    try {
      const result = await flushOpsOutbox(driver, session);
      const remaining = await refreshQueue();
      if (result.status === "CONTEXT_UNAVAILABLE" || remaining.status === "CONTEXT_UNAVAILABLE") {
        setFlushMsg("Offline work cannot currently be inspected. Restore your account context before syncing.");
      } else if (result.synced > 0) {
        setFlushMsg(
          remaining.total === 0
            ? `Synced ${result.synced} item${result.synced === 1 ? "" : "s"} to Command.`
            : `Synced ${result.synced}; ${remaining.total} still waiting.`,
        );
      } else if (result.blocked > 0) {
        setFlushMsg(result.blockedItems?.[0]?.message ?? "Command rejected a queued report.");
      } else if (remaining.total > 0 && typeof navigator !== "undefined" && navigator.onLine === false) {
        setFlushMsg("Still offline — queued items will sync when connection returns.");
      } else if (remaining.total > 0) {
        setFlushMsg("Could not sync yet — check connection and try again.");
      }
      return remaining;
    } finally {
      setSyncing(false);
    }
  }, [driver, session, refreshQueue]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      // Flush first — never block queue drain behind slow capability probes.
      if (driver?.id && typeof navigator !== "undefined" && navigator.onLine !== false) {
        await runFlush().catch(() => {});
      } else {
        await refreshQueue();
      }
      if (cancelled) return;

      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const [result, training, capabilities] = await Promise.all([
        withTimeout(refreshCommandBootstrap(depotId), PROBE_TIMEOUT_MS, {
          ok: false,
          message: "Bootstrap timed out. Pull Sync again.",
        }),
        withTimeout(probeDriverTrainingConnection(session ?? {}), PROBE_TIMEOUT_MS, {
          ok: false,
          message: "Training probe timed out",
        }),
        withTimeout(probeDriverCommandCapabilities(session ?? {}, { depotId }), PROBE_TIMEOUT_MS, {
          ok: false,
          configured: true,
          capabilities: [],
        }),
      ]);
      if (cancelled) return;

      await refreshQueue();
      if (!result.ok) {
        setError(result.message ?? "Sync failed");
        setTrainingProbe(training);
        setCapabilityProbe(capabilities);
        setLoading(false);
        return;
      }
      setBootstrap(result.bootstrap);
      setTrainingProbe(training);
      setCapabilityProbe(capabilities);
      setError("");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.activeDepotId, session?.depots, session?.accessToken, session?.driverId, session, driver?.id, runFlush, refreshQueue]);

  useEffect(() => {
    const onOnline = () => {
      void runFlush();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [runFlush]);

  const serverTime = bootstrap?.serverTime;
  const dutyCount = bootstrap?.duties?.length ?? 0;
  const capabilities = capabilityProbe?.capabilities ?? [];
  const connectionStatus =
    typeof navigator !== "undefined" && navigator.onLine === false
      ? "Offline"
      : error
        ? "Error"
        : loading
          ? "Checking…"
          : "Online";
  const pendingLabel =
    offlineQueue.status === "CONTEXT_UNAVAILABLE"
      ? "Offline work cannot currently be inspected. Restore your account context before syncing."
      : offlineQueue.total === 0
      ? "Pending offline queue · none"
      : `Pending offline queue · ${offlineQueue.total} (${offlineQueue.walkaroundChecks} checks, ${offlineQueue.locationPings} location${offlineQueue.opsCommands ? `, ${offlineQueue.opsCommands} reports` : ""})`;

  const noticeStatus =
    offlineQueue.total > 0 ? "partial" : capabilityProbe?.configured === false ? "missing" : "partial";

  return (
    <OperationalPage title="Offline & sync" subtitle="Command bootstrap status for this device.">
      <CommandBackendNotice
        status={noticeStatus}
        title="Command connection status"
        description={
          offlineQueue.total > 0
            ? `${offlineQueue.total} item${offlineQueue.total === 1 ? "" : "s"} waiting to reach Command. Keep the app open until sync completes.`
            : "Capabilities below are probed live from Command — not a static checklist."
        }
      />
      <DriverSectionTitle>Overview</DriverSectionTitle>
      <div className={op.listCard}>
        <InfoRow label={`Connection · ${connectionStatus}`} to="/contact" />
        <InfoRow
          label={`Training centre · ${
            trainingProbe?.ok
              ? `${trainingProbe.assignmentCount} courses (${trainingProbe.requiredOpen ?? 0} open)`
              : trainingProbe?.message ?? (loading ? "…" : "Not checked")
          }`}
          to="/training"
        />
        <InfoRow
          label={`Last successful sync · ${loading ? "…" : serverTime ? formatUkDateTime(serverTime) : "Not yet"}`}
          to="/"
        />
        <InfoRow label={`Published duties cached · ${dutyCount}`} to="/jobs" />
        <InfoRow label={pendingLabel} to={offlineQueue.total > 0 ? "/check" : "/contact"} />
      </div>

      {offlineQueue.total > 0 || flushMsg ? (
        <div className="mt-4 space-y-2 px-1">
          {flushMsg ? <p className="text-sm text-muted-foreground">{flushMsg}</p> : null}
          <button
            type="button"
            disabled={syncing || (typeof navigator !== "undefined" && navigator.onLine === false)}
            onClick={() => void runFlush()}
            className={`h-11 w-full rounded-xl text-sm font-semibold ${op.primaryBtn} disabled:opacity-45`}
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      ) : null}

      <DriverSectionTitle>Admin readiness</DriverSectionTitle>
      <div className={op.listCard}>
        {capabilities.length > 0 ? (
          capabilities.map((item) => (
            <InfoRow
              key={item.label}
              label={`${item.label} · ${item.status}`}
              to={item.status === "Live" ? "/jobs" : "/help"}
            />
          ))
        ) : (
          <InfoRow label="Probing Command capabilities…" to="/help" />
        )}
      </div>
      {error ? (
        <p className="mt-4 text-sm text-destructive">
          {error.includes("not configured")
            ? "Command API is not in this build. Reinstall from a build that includes veyvio-driver-App/.env.local."
            : error}
        </p>
      ) : null}
    </OperationalPage>
  );
}
