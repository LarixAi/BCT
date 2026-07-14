import { useEffect, useRef, useState } from "react";
import { driverCopy } from "@/copy/driver-messages";
import { useSyncStore } from "@/platform/sync/outbox";
import { isOnline } from "@/platform/device/connectivity";
import { notifyConnectionRestored } from "@/platform/sync/sync-notify";
import { processOutbox } from "@/platform/sync/sync-engine";

export function useSyncLifecycle() {
  const hydrate = useSyncStore((s) => s.hydrate);
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const failedCount = useSyncStore((s) => s.failedCount);
  const wasOfflineRef = useRef(!isOnline());

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    function onOnline() {
      const hadBeenOffline = wasOfflineRef.current;
      wasOfflineRef.current = false;
      void hydrate().then(() => {
        if (hadBeenOffline) notifyConnectionRestored();
        void processOutbox();
      });
    }
    function onOffline() {
      wasOfflineRef.current = true;
      useSyncStore.getState().setStatus("offline");
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [hydrate]);

  return { status, pendingCount, failedCount, isOnline: isOnline() };
}

export function useSyncStatusLabel(): { label: string; tone: "ok" | "warn" | "vor" | "muted" } {
  const { status, pendingCount, failedCount } = useSyncLifecycle();
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const tick = () => setOnline(isOnline());
    window.addEventListener("online", tick);
    window.addEventListener("offline", tick);
    return () => {
      window.removeEventListener("online", tick);
      window.removeEventListener("offline", tick);
    };
  }, []);

  if (!online) return { label: driverCopy.sync.badge.offline, tone: "warn" };
  if (status === "conflict") {
    return { label: driverCopy.sync.badge.conflict, tone: "vor" };
  }
  if (status === "failed" || failedCount > 0) {
    return { label: driverCopy.sync.badge.failed, tone: "vor" };
  }
  if (status === "syncing" || pendingCount > 0) {
    return { label: driverCopy.sync.badge.syncing(pendingCount), tone: "warn" };
  }
  if (status === "synced") return { label: driverCopy.sync.badge.synced, tone: "ok" };
  return { label: driverCopy.sync.badge.ready, tone: "muted" };
}

export function useSyncNotice(): {
  visible: boolean;
  message: string;
  tone: "offline" | "pending" | "failed";
  showLink: boolean;
} {
  const { pendingCount, failedCount } = useSyncLifecycle();
  const status = useSyncStore((s) => s.status);
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const tick = () => setOnline(isOnline());
    window.addEventListener("online", tick);
    window.addEventListener("offline", tick);
    return () => {
      window.removeEventListener("online", tick);
      window.removeEventListener("offline", tick);
    };
  }, []);

  if (!online) {
    return {
      visible: true,
      message: driverCopy.sync.workingOffline,
      tone: "offline",
      showLink: pendingCount > 0,
    };
  }
  if (status === "conflict") {
    return {
      visible: true,
      message: driverCopy.sync.assignmentConflict,
      tone: "failed",
      showLink: true,
    };
  }
  if (failedCount > 0) {
    return {
      visible: true,
      message: driverCopy.sync.syncFailed,
      tone: "failed",
      showLink: true,
    };
  }
  if (pendingCount > 0) {
    return {
      visible: true,
      message: driverCopy.sync.pendingUpdates(pendingCount),
      tone: "pending",
      showLink: true,
    };
  }
  return { visible: false, message: "", tone: "pending", showLink: false };
}
