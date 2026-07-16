import { Link } from "@tanstack/react-router";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { yardCopy } from "@/copy/yard-messages";
import { useSyncNotice } from "@/features/sync/use-sync-lifecycle";
import { useSyncStore } from "@/platform/sync/outbox";

const TONE_STYLES = {
  offline: "bg-warn/10 border-warn/30 text-warn",
  pending: "bg-primary/5 border-primary/20 text-foreground",
  failed: "bg-vor/10 border-vor/30 text-vor",
} as const;

const TONE_ICON = {
  offline: CloudOff,
  pending: RefreshCw,
  failed: TriangleAlert,
} as const;

export function SyncNoticeBanner() {
  const { visible, message, tone, showLink } = useSyncNotice();
  const syncing = useSyncStore(s => s.status === "syncing");
  if (!visible) return null;

  const Icon = TONE_ICON[tone];
  const spin = tone === "pending" && syncing;

  return (
    <div className={`border-b px-4 py-2 ${TONE_STYLES[tone]}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 lg:mx-0 lg:max-w-none">
        <p className="flex items-center gap-2 text-xs font-medium min-w-0">
          <Icon className={`size-3.5 shrink-0 ${spin ? "animate-spin" : ""}`} aria-hidden />
          <span className="truncate">{message}</span>
        </p>
        {showLink && (
          <Link
            to="/more/sync"
            className="text-[10px] font-bold uppercase tracking-widest shrink-0 hover:underline"
          >
            {yardCopy.sync.viewQueue} →
          </Link>
        )}
      </div>
    </div>
  );
}
