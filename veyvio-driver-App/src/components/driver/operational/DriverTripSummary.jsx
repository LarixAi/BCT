import { Button } from "@/components/ui/button";
import { formatUkDateTime } from "@/lib/uk-locale";

export default function DriverTripSummary({ summary, onClose }) {
  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Trip summary</h2>
          <p className="text-sm text-muted-foreground mt-1">Job completed — duty tracking continues.</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Drive time</dt>
            <dd className="font-semibold tabular-nums">
              {summary.driveMinutes != null ? `${summary.driveMinutes} min` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Max speed</dt>
            <dd className="font-semibold tabular-nums">
              {summary.maxSpeedMph != null ? `${Math.round(summary.maxSpeedMph)} mph` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Location pings</dt>
            <dd className="font-semibold tabular-nums">{summary.pingCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ended</dt>
            <dd className="font-semibold">
              {summary.endedAt ? formatUkDateTime(summary.endedAt) : "—"}
            </dd>
          </div>
        </dl>

        <Button className="w-full" onClick={onClose}>
          Continue
        </Button>
      </div>
    </div>
  );
}
