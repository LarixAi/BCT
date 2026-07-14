import { CloudOff, Wifi, WifiLow } from "lucide-react";
import { useEffect, useState } from "react";
import { driverCopy } from "@/copy/driver-messages";
import { getConnectionQuality } from "@/platform/device/connectivity";
import { cn } from "@/lib/utils";

const TONE = {
  online: "border-ok/30 bg-ok/10 text-ok",
  weak: "border-warn/40 bg-warn/10 text-warn",
  offline: "border-border bg-secondary text-muted",
} as const;

export function ConnectionStatusBadge({ className }: { className?: string }) {
  const [quality, setQuality] = useState(getConnectionQuality());

  useEffect(() => {
    const refresh = () => setQuality(getConnectionQuality());
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  const Icon = quality === "online" ? Wifi : quality === "weak" ? WifiLow : CloudOff;
  const label =
    quality === "online"
      ? driverCopy.auth.online
      : quality === "weak"
        ? driverCopy.auth.weakConnection
        : driverCopy.auth.offlineAuth;

  return (
    <div
      className={cn(
        "mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
        TONE[quality],
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </div>
  );
}
