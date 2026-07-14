import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { HomeCard, HomeCardLabel, HomeCardTitle } from "@/components/driver/home/HomeCard";
import { driverCopy } from "@/copy/driver-messages";
import { formatSyncTime } from "@/domain/more/more-helpers";
import { getConnectionQuality } from "@/platform/device/connectivity";
import type { OfflineSyncStatus } from "@/types/more";
import { cn } from "@/lib/utils";

export function OfflineSyncStatusCard({
  online,
  syncStatus,
  lastSyncedAt,
  pendingCount,
  failedCount,
}: {
  online: boolean;
  syncStatus: OfflineSyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  failedCount: number;
}) {
  const connection = online ? getConnectionQuality() : "offline";
  const headline =
    connection === "offline"
      ? driverCopy.offlineSync.offlineHeadline
      : connection === "weak"
        ? driverCopy.offlineSync.weakHeadline
        : failedCount > 0
          ? driverCopy.offlineSync.failedHeadline
          : pendingCount > 0
            ? driverCopy.offlineSync.pendingHeadline(pendingCount)
            : driverCopy.offlineSync.readyHeadline;

  const Icon =
    connection === "offline" ? CloudOff : connection === "weak" ? RefreshCw : failedCount > 0 ? CloudOff : Wifi;

  const tone =
    connection === "offline" || failedCount > 0
      ? "red"
      : pendingCount > 0 || connection === "weak"
        ? "amber"
        : "green";

  return (
    <HomeCard tone={tone === "red" ? "red" : tone === "amber" ? "amber" : "green"}>
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", tone === "green" ? "text-ok" : tone === "amber" ? "text-warn" : "text-vor")} />
        <div className="min-w-0 flex-1">
          <HomeCardLabel>Device sync</HomeCardLabel>
          <HomeCardTitle>{headline}</HomeCardTitle>
          <p className="mt-2 text-sm text-muted">
            Last synced {formatSyncTime(lastSyncedAt ?? syncStatus.lastSyncedAt)}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Connection</dt>
          <dd className="font-medium">{online ? driverCopy.offlineSync.online : driverCopy.offlineSync.offline}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Queue</dt>
          <dd className="font-medium">
            {pendingCount > 0
              ? driverCopy.offlineSync.queuePending(pendingCount)
              : failedCount > 0
                ? driverCopy.offlineSync.queueFailed(failedCount)
                : driverCopy.offlineSync.queueClear}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Vehicle checks</dt>
          <dd className="font-medium">{syncStatus.pendingVehicleChecks}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Documents</dt>
          <dd className="font-medium">{syncStatus.pendingDocuments}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted">Cached trip data</dt>
          <dd className="font-medium">{driverCopy.offlineSync.cachedTrips(syncStatus.cachedTrips)}</dd>
        </div>
      </dl>
    </HomeCard>
  );
}
