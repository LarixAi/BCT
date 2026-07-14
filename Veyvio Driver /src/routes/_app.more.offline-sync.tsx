import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { OfflineSyncStatusCard } from "@/components/driver/more/OfflineSyncStatusCard";
import { SyncQueuePanel } from "@/components/driver/more/SyncQueuePanel";
import { ClearCachePanel } from "@/components/driver/more/ClearCachePanel";
import { driverCopy } from "@/copy/driver-messages";
import { isOnline } from "@/platform/device/connectivity";
import { listOutboxMutations } from "@/platform/storage/local-db";
import { processOutbox } from "@/platform/sync/sync-engine";
import { useSyncStore } from "@/platform/sync/outbox";
import { useMoreStore } from "@/store/more";
import type { OutboxMutation } from "@/types/sync";

export const Route = createFileRoute("/_app/more/offline-sync")({
  head: () => ({ meta: [{ title: "Offline data and sync — Veyvio Driver" }] }),
  component: OfflineSyncPage,
});

function OfflineSyncPage() {
  const syncStatus = useMoreStore((s) => s.driverMore.syncStatus);
  const hydrate = useSyncStore((s) => s.hydrate);
  const retryMutation = useSyncStore((s) => s.retryMutation);
  const lastSynced = useSyncStore((s) => s.lastSyncedAt);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const failedCount = useSyncStore((s) => s.failedCount);

  const [mutations, setMutations] = useState<OutboxMutation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(isOnline());

  const refresh = useCallback(async () => {
    await hydrate();
    setMutations(await listOutboxMutations());
    setOnline(isOnline());
  }, [hydrate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleConnectivity = () => setOnline(isOnline());
    window.addEventListener("online", handleConnectivity);
    window.addEventListener("offline", handleConnectivity);
    return () => {
      window.removeEventListener("online", handleConnectivity);
      window.removeEventListener("offline", handleConnectivity);
    };
  }, []);

  async function runSync() {
    if (!online) {
      toast.error(driverCopy.offlineSync.offlineRetryBlocked);
      return;
    }

    setSyncing(true);
    const result = await processOutbox();
    await refresh();
    setSyncing(false);

    if (result.failed > 0) {
      toast.error(driverCopy.sync.syncFailed);
      return;
    }

    if (result.processed > 0) {
      toast.success(driverCopy.offlineSync.syncSuccess(result.processed));
    }
  }

  async function handleRetryItem(localOperationId: string) {
    await retryMutation(localOperationId);
    await runSync();
  }

  const queueBlocked = pendingCount + failedCount > 0;

  return (
    <MoreSubpageLayout title="Offline data and sync">
      <p className="text-sm text-muted">{driverCopy.offlineSync.intro}</p>

      <OfflineSyncStatusCard
        online={online}
        syncStatus={syncStatus}
        lastSyncedAt={lastSynced}
        pendingCount={pendingCount}
        failedCount={failedCount}
      />

      <SyncQueuePanel
        mutations={mutations}
        syncing={syncing}
        online={online}
        onRetryAll={() => void runSync()}
        onRetryItem={(id) => void handleRetryItem(id)}
      />

      <ClearCachePanel blocked={queueBlocked} onCleared={() => void refresh()} />
    </MoreSubpageLayout>
  );
}
