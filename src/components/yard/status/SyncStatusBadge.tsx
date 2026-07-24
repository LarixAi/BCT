import { Bell, Check, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSyncStatusLabel } from "@/features/sync/use-sync-lifecycle";
import { useSyncStore } from "@/platform/sync/outbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DARK_TONE_CLS = {
  ok: "border-white/15 bg-white/5 text-white/80 hover:bg-white/10",
  warn: "border-warn/40 bg-white/5 text-warn hover:bg-white/10",
  vor: "border-vor/50 bg-white/5 text-white hover:bg-white/10",
  muted: "border-white/15 bg-white/5 text-white/65 hover:bg-white/10",
} as const;

const LIGHT_TONE_CLS = {
  ok: "border-border bg-white text-foreground hover:bg-secondary/40",
  warn: "border-warn/40 bg-white text-warn hover:bg-secondary/40",
  vor: "border-vor/40 bg-white text-vor hover:bg-secondary/40",
  muted: "border-border bg-white text-muted-foreground hover:bg-secondary/40",
} as const;

const ICON = {
  ok: Check,
  warn: RefreshCw,
  vor: TriangleAlert,
  muted: CloudOff,
} as const;

export function SyncStatusBadge({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [mounted, setMounted] = useState(false);
  const { label, tone } = useSyncStatusLabel();
  const pendingCount = useSyncStore(s => s.pendingCount);
  const failedCount = useSyncStore(s => s.failedCount);
  const lastSyncedAt = useSyncStore(s => s.lastSyncedAt);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`flex min-w-[72px] items-center gap-1.5 rounded-sm border px-2 py-0.5 ${
          variant === "light"
            ? "border-border bg-background text-muted-foreground"
            : "border-white/10 bg-white/10 text-white/70"
        }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider">···</span>
      </div>
    );
  }

  const Icon = ICON[tone];
  const toneClasses = variant === "light" ? LIGHT_TONE_CLS : DARK_TONE_CLS;
  const notificationCount = failedCount + pendingCount;
  const statusMessage =
    tone === "vor"
      ? `${failedCount} ${failedCount === 1 ? "record needs" : "records need"} attention`
      : tone === "warn"
        ? pendingCount > 0
          ? `${pendingCount} ${pendingCount === 1 ? "record is" : "records are"} waiting to sync`
          : "Working offline — records remain on this device"
        : tone === "ok"
          ? "All depot records are safely synced"
          : "Record sync is ready";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative flex size-9 items-center justify-center gap-2 rounded-lg border transition-colors lg:min-h-9 lg:w-auto lg:px-2.5 ${toneClasses[tone]}`}
          aria-label={`Record notifications: ${label}`}
        >
          <span className="relative">
            <Bell className="size-4" aria-hidden />
            {notificationCount === 0 ? (
              <span className={`absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary ${variant === "light" ? "ring-2 ring-white" : "ring-2 ring-accent"}`} />
            ) : null}
          </span>
          <span className="hidden text-[10px] font-bold uppercase tracking-wider lg:inline">{label}</span>
          {notificationCount > 0 ? (
            <span className={`grid min-w-4 place-items-center rounded-full px-1 text-[9px] font-extrabold text-white ${
              failedCount > 0 ? "bg-vor" : "bg-warn"
            }`}>
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(19rem,calc(100vw-1.5rem))] rounded border-border p-0 shadow-none">
        <div className="border-b border-border p-4">
          <div className="flex items-start gap-3">
            <div className={`grid size-9 shrink-0 place-items-center rounded border ${
              tone === "vor"
                ? "border-vor/30 bg-vor/10 text-vor"
                : tone === "warn"
                  ? "border-warn/30 bg-warn/10 text-warn"
                  : "border-primary/25 bg-primary/10 text-primary"
            }`}>
              <Icon className={`size-4 ${tone === "warn" && pendingCount > 0 ? "animate-spin" : ""}`} aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Record status</div>
              <div className="mt-1 text-sm font-extrabold leading-snug">{statusMessage}</div>
              <div className="mt-1 text-[10px] text-muted">
                {lastSyncedAt
                  ? `Last synced ${new Date(lastSyncedAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`
                  : "This device has not completed its first upload yet"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-white p-3">
            <div className="text-lg font-extrabold tabular-nums">{pendingCount}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted">Waiting</div>
          </div>
          <div className="bg-white p-3">
            <div className={`text-lg font-extrabold tabular-nums ${failedCount > 0 ? "text-vor" : ""}`}>{failedCount}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-muted">Needs attention</div>
          </div>
        </div>

        <Link
          to="/more/sync"
          className="flex min-h-11 items-center justify-between border-t border-border px-4 text-xs font-bold text-foreground hover:bg-secondary/40"
        >
          Open record queue
          <span className="text-primary" aria-hidden>→</span>
        </Link>
      </PopoverContent>
    </Popover>
  );
}
