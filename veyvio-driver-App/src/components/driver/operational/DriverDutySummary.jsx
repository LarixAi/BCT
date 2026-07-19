import { Button } from "@/components/ui/button";

export default function DriverDutySummary({ safetyScore, sessionStats, onClose }) {
  const tone =
    safetyScore == null
      ? "text-muted-foreground"
      : safetyScore >= 85
        ? "text-emerald-700"
        : safetyScore >= 70
          ? "text-amber-700"
          : "text-red-700";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-lg">
        <h2 className="text-lg font-bold">Duty complete</h2>
        <p className={`text-4xl font-bold tabular-nums mt-3 ${tone}`}>
          {safetyScore != null ? `${safetyScore}` : "—"}
          <span className="text-base font-medium text-muted-foreground ml-2">safety score</span>
        </p>
        {sessionStats ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Pings</dt>
              <dd className="font-semibold tabular-nums">{sessionStats.pingCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Max speed</dt>
              <dd className="font-semibold tabular-nums">
                {sessionStats.maxSpeedMph != null ? `${Math.round(sessionStats.maxSpeedMph)} mph` : "—"}
              </dd>
            </div>
          </dl>
        ) : null}
        <Button className="w-full mt-5" onClick={() => onClose?.()}>
          Done
        </Button>
      </div>
    </div>
  );
}
