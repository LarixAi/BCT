import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { driverCopy } from "@/copy/driver-messages";
import {
  formatQueueTime,
  groupQueueItems,
  outboxMutationLabel,
  outboxStatusLabel,
  outboxStatusTone,
} from "@/domain/sync/sync-queue";
import type { OutboxMutation } from "@/types/sync";
import { cn } from "@/lib/utils";

const toneClass = {
  ok: "text-ok",
  warn: "text-warn",
  vor: "text-vor",
  muted: "text-muted",
  link: "text-link",
} as const;

export function SyncQueuePanel({
  mutations,
  syncing,
  online,
  onRetryAll,
  onRetryItem,
}: {
  mutations: OutboxMutation[];
  syncing: boolean;
  online: boolean;
  onRetryAll: () => void;
  onRetryItem: (localOperationId: string) => void;
}) {
  const { failed, pending, empty } = groupQueueItems(mutations);

  if (empty) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-5 text-sm">
        <p className="font-semibold">{driverCopy.offlineSync.queueEmptyTitle}</p>
        <p className="mt-1 text-muted">{driverCopy.offlineSync.queueEmptyHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{driverCopy.offlineSync.queueTitle}</h2>
          <p className="text-xs text-muted">{driverCopy.offlineSync.queueHint}</p>
        </div>
        <Button disabled={!online || syncing} size="sm" onClick={onRetryAll}>
          {syncing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {driverCopy.offlineSync.syncing}
            </>
          ) : (
            <>
              <RotateCcw className="size-4" />
              {driverCopy.offlineSync.retrySync}
            </>
          )}
        </Button>
      </div>

      {failed.length > 0 && (
        <QueueSection title={driverCopy.offlineSync.failedSection} items={failed} onRetryItem={onRetryItem} online={online} />
      )}

      {pending.length > 0 && (
        <QueueSection title={driverCopy.offlineSync.pendingSection} items={pending} online={online} />
      )}
    </div>
  );
}

function QueueSection({
  title,
  items,
  onRetryItem,
  online,
}: {
  title: string;
  items: OutboxMutation[];
  onRetryItem?: (localOperationId: string) => void;
  online: boolean;
}) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => {
          const tone = outboxStatusTone(item.status);
          return (
            <li key={item.localOperationId} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{outboxMutationLabel(item.type)}</p>
                  <p className={cn("mt-0.5 text-xs font-medium capitalize", toneClass[tone])}>
                    {outboxStatusLabel(item.status)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatQueueTime(item.createdAt)}</p>
                  {item.error && <p className="mt-2 text-xs text-vor">{item.error}</p>}
                </div>
                {onRetryItem && (item.status === "failed" || item.status === "conflict") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!online}
                    onClick={() => onRetryItem(item.localOperationId)}
                  >
                    {driverCopy.offlineSync.retryItem}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
