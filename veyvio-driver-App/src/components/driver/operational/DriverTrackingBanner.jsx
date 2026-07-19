import { formatUkTime } from "@/lib/uk-locale";

export default function DriverTrackingBanner({ trackingActive, lastSyncAt, batteryLevel, pingError }) {
  if (!trackingActive) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden />
          <p className="text-sm font-semibold text-emerald-900">Tracking active</p>
        </div>
        <div className="text-right text-xs text-emerald-800 shrink-0">
          {lastSyncAt ? <p>Last sync {formatUkTime(lastSyncAt)}</p> : <p>Waiting for GPS…</p>}
          {batteryLevel != null ? <p className="tabular-nums">Battery {batteryLevel}%</p> : null}
        </div>
      </div>
      {pingError ? <p className="mt-2 text-xs text-red-700">{pingError}</p> : null}
    </div>
  );
}
