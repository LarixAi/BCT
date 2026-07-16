import { CloudOff, CloudUpload, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useSyncStatusLabel } from "@/features/sync/use-sync-lifecycle";

const DARK_TONE_CLS = {
  ok: "bg-ok/20 text-ok border-ok/30",
  warn: "bg-warn/20 text-warn border-warn/40",
  vor: "bg-vor/20 text-vor border-vor/30",
  muted: "bg-white/10 text-white/70 border-white/10",
} as const;

const LIGHT_TONE_CLS = {
  ok: "bg-background text-ok border-border",
  warn: "bg-background text-warn border-border",
  vor: "bg-background text-vor border-border",
  muted: "bg-background text-muted-foreground border-border",
} as const;

const ICON = {
  ok: Wifi,
  warn: RefreshCw,
  vor: CloudOff,
  muted: CloudUpload,
} as const;

export function SyncStatusBadge({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [mounted, setMounted] = useState(false);
  const { label, tone } = useSyncStatusLabel();

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

  return (
    <div className={`flex items-center gap-1.5 rounded-sm border px-2 py-0.5 ${toneClasses[tone]}`}>
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}
