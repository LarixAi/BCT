import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";
import { isOnline } from "@/platform/device/connectivity";

/** Brief feedback after a yard write is queued for sync. */
export function notifyAfterEnqueue(): void {
  if (!isOnline()) {
    toast.info(yardCopy.sync.savedOnDevice, { duration: 3500 });
  }
}

export function notifySyncComplete(processedCount: number): void {
  if (processedCount > 0) {
    toast.success(yardCopy.sync.allSynced, { duration: 3000 });
  }
}

export function notifyConnectionRestored(): void {
  toast.success(yardCopy.sync.connectionRestored, { duration: 3500 });
}

export function notifySyncFailed(): void {
  toast.error(yardCopy.sync.syncFailed, {
    duration: 5000,
    action: { label: yardCopy.sync.viewQueue, onClick: () => { window.location.href = "/more/sync"; } },
  });
}
