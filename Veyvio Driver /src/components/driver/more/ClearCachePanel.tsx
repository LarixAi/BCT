import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { driverCopy } from "@/copy/driver-messages";
import { clearDownloadedOperationalData } from "@/platform/sync/sync-engine";
import { useTenancyStore } from "@/platform/tenancy/context-store";

export function ClearCachePanel({
  blocked,
  onCleared,
}: {
  blocked: boolean;
  onCleared: () => void;
}) {
  const depotId = useTenancyStore((s) => s.depotId);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    if (!depotId) {
      toast.error(driverCopy.offlineSync.clearBlockedNoDepot);
      return;
    }

    setClearing(true);
    const result = await clearDownloadedOperationalData(depotId);
    setClearing(false);
    setConfirming(false);

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success(driverCopy.offlineSync.clearSuccess);
    onCleared();
  }

  return (
    <HomeCard>
      <p className="text-sm font-semibold">{driverCopy.offlineSync.clearTitle}</p>
      <p className="mt-1 text-sm text-muted">{driverCopy.offlineSync.clearHint}</p>

      {!confirming ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-11 w-full text-vor"
          disabled={blocked}
          onClick={() => setConfirming(true)}
        >
          {driverCopy.offlineSync.clearAction}
        </Button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted">{driverCopy.offlineSync.clearConfirm}</p>
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full"
            disabled={clearing}
            onClick={() => void handleClear()}
          >
            {clearing ? driverCopy.offlineSync.clearing : driverCopy.offlineSync.clearConfirmAction}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full"
            disabled={clearing}
            onClick={() => setConfirming(false)}
          >
            {driverCopy.offlineSync.cancel}
          </Button>
        </div>
      )}

      {blocked && (
        <p className="mt-3 text-xs text-warn">{driverCopy.offlineSync.clearBlockedPending}</p>
      )}

      <p className="mt-3 text-xs text-muted">{driverCopy.offlineSync.signOutNote}</p>
    </HomeCard>
  );
}
