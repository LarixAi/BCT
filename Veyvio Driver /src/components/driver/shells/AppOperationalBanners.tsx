import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DismissibleNotice } from "@/components/driver/status/DismissibleNotice";
import { driverCopy } from "@/copy/driver-messages";
import { useBannerDismissal } from "@/features/banners/use-banner-dismissal";
import { useDriverFocusRuntime } from "@/features/driver-focus/DriverFocusProvider";
import { useSyncNotice } from "@/features/sync/use-sync-lifecycle";
import { useDriverFocusStore } from "@/store/driver-focus";
import { useSyncStore } from "@/platform/sync/outbox";

const LOW_BATTERY_THRESHOLD = 15;

export function AppOperationalBanners() {
  return (
    <div className="mx-auto max-w-lg space-y-2 px-4 pt-2 empty:hidden">
      <BatteryLowBanner />
      <TripRecoveryBanner />
      <SyncNoticeBanner />
    </div>
  );
}

function BatteryLowBanner() {
  const runtime = useDriverFocusRuntime();
  const updateSettings = useDriverFocusStore((state) => state.updateSettings);
  const batteryPercent = runtime.batteryPercent ?? 0;
  const fingerprint = String(batteryPercent);
  const { isDismissed, dismiss } = useBannerDismissal("battery_low", fingerprint);

  const shouldShow =
    runtime.keepScreenAwake &&
    !runtime.isCharging &&
    runtime.batteryPercent != null &&
    runtime.batteryPercent <= LOW_BATTERY_THRESHOLD &&
    !isDismissed;

  if (!shouldShow) return null;

  return (
    <DismissibleNotice
      title={`Battery at ${runtime.batteryPercent}%`}
      tone="warn"
      onDismiss={dismiss}
      actions={
        <button
          type="button"
          className="text-xs font-bold text-link"
          onClick={() => updateSettings({ reduceBrightnessWhenStationary: true })}
        >
          Reduce brightness preference
        </button>
      }
    >
      Your screen is being kept awake for the active trip. Connect the phone to a charger when safe.
    </DismissibleNotice>
  );
}

function TripRecoveryBanner() {
  const snapshot = useDriverFocusStore((state) => state.recoverySnapshot);
  const setRecoverySnapshot = useDriverFocusStore((state) => state.setRecoverySnapshot);
  const fingerprint = snapshot ? `${snapshot.dutyId}:${snapshot.recordedAt}` : "none";
  const { isDismissed, dismiss } = useBannerDismissal("trip_recovery", fingerprint);

  if (!snapshot || isDismissed) return null;

  return (
    <DismissibleNotice
      title="Active trip restored"
      tone="info"
      onDismiss={() => {
        dismiss();
        setRecoverySnapshot(null);
      }}
      actions={
        <div className="flex gap-3">
          <Link
            to="/duties/$dutyId/nav"
            params={{ dutyId: snapshot.dutyId }}
            className="text-xs font-bold text-link"
            onClick={() => setRecoverySnapshot(null)}
          >
            Open navigation
          </Link>
        </div>
      }
    >
      {snapshot.tripStateLabel} · Next: {snapshot.nextStopStreet}
    </DismissibleNotice>
  );
}

function SyncNoticeBanner() {
  const [mounted, setMounted] = useState(false);
  const { visible, message, tone, showLink } = useSyncNotice();
  const failedCount = useSyncStore((s) => s.failedCount);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const syncStatus = useSyncStore((s) => s.status);
  const fingerprint = `${tone}:${syncStatus}:${failedCount}:${pendingCount}`;
  const { isDismissed, dismiss } = useBannerDismissal("sync_notice", fingerprint);

  useEffect(() => setMounted(true), []);

  if (!mounted || !visible || isDismissed) return null;

  const noticeTone = tone === "failed" ? "vor" : tone === "offline" ? "warn" : "info";

  return (
    <DismissibleNotice
      title={
        tone === "failed"
          ? syncStatus === "conflict"
            ? "Assignment conflict"
            : "Sync needs attention"
          : tone === "offline"
            ? "Working offline"
            : "Sync pending"
      }
      tone={noticeTone}
      onDismiss={dismiss}
      actions={
        showLink ? (
          <Link to="/more/offline-sync" className="text-xs font-bold text-link">
            {driverCopy.sync.viewQueue} →
          </Link>
        ) : undefined
      }
    >
      {message}
    </DismissibleNotice>
  );
}
