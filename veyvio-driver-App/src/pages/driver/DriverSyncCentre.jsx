import { useEffect, useMemo, useState } from "react";
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

export default function DriverSyncCentre() {
  const { session, driver } = useDriverSupabaseAuth();
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState("");
  const [trainingProbe, setTrainingProbe] = useState(null);
  const [capabilityProbe, setCapabilityProbe] = useState(null);
  const [loading, setLoading] = useState(true);

  const workspace = useMemo(
    () => resolveDriverWorkspaceScope(driver, session),
    [driver, session],
  );

  const offlineQueue = useMemo(
    () =>
      driver?.id
        ? describeOfflineQueue(driver.id, workspace.companyId, workspace.membershipId)
        : { total: 0, walkaroundChecks: 0, locationPings: 0 },
    [driver?.id, workspace.companyId, workspace.membershipId],
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const [result, training, capabilities] = await Promise.all([
        refreshCommandBootstrap(depotId),
        probeDriverTrainingConnection(session ?? {}),
        probeDriverCommandCapabilities(session ?? {}, { depotId }),
      ]);
      if (driver?.id) {
        await flushOpsOutbox(driver, session).catch(() => {});
      }
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
  }, [session?.activeDepotId, session?.depots, session?.accessToken, session?.driverId, session, driver?.id]);

  const serverTime = bootstrap?.serverTime;
  const dutyCount = bootstrap?.duties?.length ?? 0;
  const capabilities = capabilityProbe?.capabilities ?? [];
  const connectionStatus = error ? "Error" : loading ? "Checking…" : "Online";
  const pendingLabel =
    offlineQueue.total === 0
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
