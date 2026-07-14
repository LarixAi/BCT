import { Link } from "@tanstack/react-router";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { driverCopy } from "@/copy/driver-messages";
import { useSyncNotice } from "@/features/sync/use-sync-lifecycle";
import { useSyncStore } from "@/platform/sync/outbox";

const TONE_STYLES = {
  offline: "bg-warn/10 border-warn/30 text-warn",
  pending: "bg-link/5 border-link/20 text-foreground",
  failed: "bg-vor/10 border-vor/30 text-vor",
} as const;

export function SyncNoticeBanner() {
  const [mounted, setMounted] = useState(false);
  const { visible, message, tone, showLink } = useSyncNotice();
  const syncing = useSyncStore((s) => s.status === "syncing");

  useEffect(() => setMounted(true), []);

  if (!mounted || !visible) return null;

  const Icon = tone === "offline" ? CloudOff : tone === "failed" ? TriangleAlert : RefreshCw;

  return (
    <div className={`border-b px-4 py-2 ${TONE_STYLES[tone]}`}>
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-xs font-medium">
          <Icon className={`size-3.5 shrink-0 ${syncing && tone === "pending" ? "animate-spin" : ""}`} aria-hidden />
          <span className="truncate">{message}</span>
        </p>
        {showLink && (
          <Link to="/more/sync" className="shrink-0 text-[10px] font-bold uppercase tracking-widest hover:underline">
            {driverCopy.sync.viewQueue} →
          </Link>
        )}
      </div>
    </div>
  );
}
