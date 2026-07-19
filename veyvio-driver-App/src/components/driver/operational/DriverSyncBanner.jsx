import { CloudOff } from "lucide-react";
import { op } from "@/lib/driver-operational-theme";

export default function DriverSyncBanner({ pendingCount, className = "" }) {
  if (!pendingCount || pendingCount <= 0) return null;

  return (
    <div
      className={`rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3 ${className}`}
      role="status"
    >
      <CloudOff className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-blue-950">
          {pendingCount} check{pendingCount === 1 ? "" : "s"} waiting to sync
        </p>
        <p className="text-xs text-blue-900 mt-0.5">
          Saved on this device — will upload when you&apos;re back online.
        </p>
      </div>
    </div>
  );
}
