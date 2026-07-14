import { CloudOff, CloudUpload, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useSyncStatusLabel } from "@/features/sync/use-sync-lifecycle";

const TONE_CLS = {
  ok: "bg-ok/20 text-ok border-ok/30",
  warn: "bg-warn/20 text-warn border-warn/40",
  vor: "bg-vor/20 text-vor border-vor/30",
  muted: "bg-white/10 text-white/70 border-white/10",
} as const;

const ICON = { ok: Wifi, warn: RefreshCw, vor: CloudOff, muted: CloudUpload } as const;

export function SyncStatusBadge() {
  const [mounted, setMounted] = useState(false);
  const { label, tone } = useSyncStatusLabel();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex min-w-[72px] items-center gap-1.5 rounded-sm border border-white/10 bg-white/10 px-2 py-0.5 text-white/70">
        <span className="text-[10px] font-bold uppercase tracking-wider">···</span>
      </div>
    );
  }

  const Icon = ICON[tone];
  return (
    <div className={`flex items-center gap-1.5 rounded-sm border px-2 py-0.5 ${TONE_CLS[tone]}`}>
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}
