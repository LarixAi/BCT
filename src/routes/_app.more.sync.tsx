import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Trash2 } from "lucide-react";
import { yardCopy } from "@/copy/yard-messages";
import { mutationLabel, MUTATION_STATUS_LABELS } from "@/domain/sync/mutation-labels";
import { formatSyncError, isMissingSyncRouteError } from "@/domain/sync/format-sync-error";
import { isMockApi } from "@/platform/api";
import { getYardApi } from "@/platform/api";
import { listOutboxMutations } from "@/platform/storage/local-db";
import {
  clearFailedOutbox,
  probeYardSyncRoute,
  processOutbox,
  releaseStuckSyncingMutations,
  requeueFailedOutbox,
} from "@/platform/sync/sync-engine";
import { useSyncStore } from "@/platform/sync/outbox";
import type { OutboxMutation } from "@/types/sync";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubCallout, HubMiniStat, HubSectionHeading, hubListPanelClass } from "@/features/hub/HubContentPrimitives";
import { HubPrimaryButton, HubSecondaryButton } from "@/features/hub/HubPageHeader";

export const Route = createFileRoute("/_app/more/sync")({
  head: () => ({
    meta: [{ title: "Sync queue — Veyvio Yard" }],
  }),
  component: SyncQueuePage,
});

const STATUS_TONE: Record<OutboxMutation["status"], string> = {
  pending: "text-warn",
  syncing: "text-warn",
  synced: "text-ok",
  failed: "text-vor",
  conflict: "text-vor",
};

function countByType(rows: OutboxMutation[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function SyncQueuePage() {
  const [mutations, setMutations] = useState<OutboxMutation[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [apiMode, setApiMode] = useState<string>("mock");
  const [syncRouteLive, setSyncRouteLive] = useState<boolean | null>(null);
  const pendingCount = useSyncStore(s => s.pendingCount);
  const failedCount = useSyncStore(s => s.failedCount);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await listOutboxMutations();
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setMutations(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pendingCount, failedCount]);

  useEffect(() => {
    if (isMockApi()) {
      setApiMode("mock");
      setSyncRouteLive(true);
      return;
    }
    void getYardApi().healthCheck()
      .then(r => setApiMode(r.mode))
      .catch(() => setApiMode("live (unreachable)"));
    void probeYardSyncRoute().then(setSyncRouteLive);
  }, []);

  async function handleRetryPending() {
    setRetrying(true);
    await releaseStuckSyncingMutations();
    await processOutbox();
    await useSyncStore.getState().hydrate();
    await refresh();
    setRetrying(false);
  }

  async function handleRetryFailed() {
    setRetrying(true);
    await requeueFailedOutbox();
    await processOutbox();
    await useSyncStore.getState().hydrate();
    await refresh();
    setRetrying(false);
  }

  async function handleClearFailed() {
    if (!window.confirm(yardCopy.sync.clearFailedConfirm)) return;
    setRetrying(true);
    await clearFailedOutbox();
    await refresh();
    setRetrying(false);
  }

  const pending = mutations.filter(m => m.status === "pending" || m.status === "syncing");
  const failed = mutations.filter(m => m.status === "failed" || m.status === "conflict");
  const synced = mutations.filter(m => m.status === "synced");
  const typeBreakdown = useMemo(() => countByType(mutations), [mutations]);
  const staleRouteErrors = failed.some(m => isMissingSyncRouteError(m.error));
  const showDeployBanner = syncRouteLive === false;
  const showStaleHint = syncRouteLive === true && staleRouteErrors;

  return (
    <MoreSubpageLayout title="Sync queue" eyebrow="Pending uploads and retry">
      <DashboardSurface className="space-y-4">
        <p className="text-sm text-[#667085]">{yardCopy.sync.queueExplainer}</p>
        <p className="text-sm text-[#667085]">
          API mode · <span className="font-semibold text-ink">{apiMode}</span>
          {syncRouteLive === true ? <span className="text-[#027a48]"> · Yard sync route live</span> : null}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <HubMiniStat label="Waiting" value={pending.length} tone="warn" />
          <HubMiniStat label="Failed" value={failed.length} tone="vor" />
          <HubMiniStat label="Total" value={mutations.length} />
        </div>
      </DashboardSurface>

      {typeBreakdown.length > 0 && (
        <DashboardSurface>
          <HubSectionHeading title={yardCopy.sync.byType} />
          <ul className="space-y-2 text-sm">
            {typeBreakdown.map(([type, count]) => (
              <li key={type} className="flex justify-between gap-2">
                <span className="text-ink">{mutationLabel(type)}</span>
                <span className="font-mono font-semibold tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
          {synced.length > 0 ? (
            <p className="mt-3 text-xs text-[#667085]">
              {synced.length} already synced on a previous attempt — history kept on this device.
            </p>
          ) : null}
        </DashboardSurface>
      )}

      {showDeployBanner ? <HubCallout tone="error">{yardCopy.sync.routeNotDeployed}</HubCallout> : null}
      {showStaleHint ? <HubCallout tone="warn">{yardCopy.sync.staleFailureHint}</HubCallout> : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <HubPrimaryButton onClick={() => void handleRetryPending()} disabled={retrying || pending.length === 0} className="w-full">
          <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? yardCopy.sync.syncing : yardCopy.sync.retryPending}
        </HubPrimaryButton>
        <HubSecondaryButton onClick={() => void handleRetryFailed()} disabled={retrying || failed.length === 0} className="w-full">
          <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
          {yardCopy.sync.retryFailed}
        </HubSecondaryButton>
      </div>

      {failed.length > 0 && (
        <HubSecondaryButton onClick={() => void handleClearFailed()} disabled={retrying} className="w-full text-[#b42318]">
          <Trash2 className="size-4" />
          {yardCopy.sync.clearFailed}
        </HubSecondaryButton>
      )}

      <DashboardSurface>
        {loading ? (
          <p className="py-8 text-center text-sm text-[#667085]">{yardCopy.sync.loading}</p>
        ) : mutations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e7ec] py-8 text-center text-sm text-[#667085]">
            {yardCopy.sync.emptyQueue}
          </p>
        ) : (
          <div className={hubListPanelClass}>
            {mutations.map(m => (
              <article key={m.localOperationId} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{mutationLabel(m.type)}</p>
                    <p className="truncate font-mono text-xs text-[#667085]">{m.localOperationId}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${STATUS_TONE[m.status]}`}>
                    {m.status === "syncing" ? "Uploading…" : MUTATION_STATUS_LABELS[m.status]}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[#667085]">
                  {new Date(m.createdAt).toLocaleString()}
                  {m.error ? (
                    <span className="mt-1 block text-[#b42318]">
                      {syncRouteLive && isMissingSyncRouteError(m.error)
                        ? "Failed before server update — tap Retry failed"
                        : formatSyncError(m.error)}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </DashboardSurface>
    </MoreSubpageLayout>
  );
}

