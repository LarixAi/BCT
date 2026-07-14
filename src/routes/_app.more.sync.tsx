import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/yard/primitives";
import { Button } from "@/components/ui/button";
import { yardCopy } from "@/copy/yard-messages";
import { mutationLabel, MUTATION_STATUS_LABELS } from "@/domain/sync/mutation-labels";
import { isMockApi } from "@/platform/api";
import { getYardApi } from "@/platform/api";
import { listOutboxMutations } from "@/platform/storage/local-db";
import { processOutbox } from "@/platform/sync/sync-engine";
import { useSyncStore } from "@/platform/sync/outbox";
import type { OutboxMutation } from "@/types/sync";

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

function SyncQueuePage() {
  const [mutations, setMutations] = useState<OutboxMutation[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [apiMode, setApiMode] = useState<string>("mock");
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
      return;
    }
    void getYardApi().healthCheck()
      .then(r => setApiMode(r.mode))
      .catch(() => setApiMode("live (unreachable)"));
  }, []);

  async function handleRetry() {
    setRetrying(true);
    await processOutbox();
    await useSyncStore.getState().hydrate();
    await refresh();
    setRetrying(false);
  }

  const pending = mutations.filter(m => m.status === "pending" || m.status === "syncing");
  const failed = mutations.filter(m => m.status === "failed" || m.status === "conflict");

  return (
    <div className="space-y-5 animate-in-up pb-4">
      <Link to="/more" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> More
      </Link>

      <SectionHeader title={yardCopy.sync.title} />

      <div className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">
        API mode · <span className="text-primary">{apiMode}</span>
      </div>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Waiting" value={pending.length} tone="warn" />
        <Stat label="Failed" value={failed.length} tone="vor" />
        <Stat label="Total" value={mutations.length} tone="muted" />
      </section>

      <Button
        onClick={() => void handleRetry()}
        disabled={retrying || pending.length === 0}
        className="w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold"
      >
        <RefreshCw className={`size-4 mr-2 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? yardCopy.sync.syncing : yardCopy.sync.retryPending}
      </Button>

      {loading ? (
        <p className="text-sm text-muted text-center py-8">{yardCopy.sync.loading}</p>
      ) : mutations.length === 0 ? (
        <p className="text-sm text-muted text-center py-8 border border-dashed border-border rounded-xs">
          {yardCopy.sync.emptyQueue}
        </p>
      ) : (
        <div className="space-y-2">
          {mutations.map(m => (
            <article key={m.localOperationId} className="bg-white border border-border rounded-xs p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider">{mutationLabel(m.type)}</div>
                  <div className="text-[10px] text-muted font-mono truncate">{m.localOperationId}</div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ${STATUS_TONE[m.status]}`}>
                  {MUTATION_STATUS_LABELS[m.status]}
                </span>
              </div>
              <div className="mt-2 text-[10px] text-muted">
                {new Date(m.createdAt).toLocaleString()}
                {m.error && <span className="block text-vor mt-1">{m.error}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "warn" | "vor" | "muted" }) {
  const toneClass = tone === "warn" ? "text-warn" : tone === "vor" ? "text-vor" : "text-muted";
  return (
    <div className="bg-white border border-border rounded-xs p-3 text-center">
      <div className={`text-2xl font-display font-extrabold ${toneClass}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}
