import { formatUkTime } from "@/lib/uk-locale";

const ACTIVITY_COLORS = {
  driving: "bg-[#1eaeae]",
  break: "bg-amber-400",
  poa: "bg-sky-400",
  other_work: "bg-violet-500",
  vehicle_check: "bg-emerald-500",
  end_of_duty_check: "bg-emerald-600",
  incident_report: "bg-red-400",
  admin_time: "bg-slate-400",
  rest: "bg-muted-foreground/40",
  default: "bg-[#8ec63f]",
};

function segmentMinutes(seg) {
  const start = new Date(seg.startedAt).getTime();
  const end = seg.endedAt ? new Date(seg.endedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || end <= start) return 1;
  return Math.max(1, Math.round((end - start) / 60000));
}

export default function DriverDutyTimelineStrip({ segments, activityLabels }) {
  if (!segments?.length) return null;

  const blocks = segments.map((seg) => ({
    ...seg,
    minutes: segmentMinutes(seg),
  }));
  const totalMinutes = blocks.reduce((sum, b) => sum + b.minutes, 0);

  return (
    <div className="space-y-3">
      <div
        className="flex h-8 rounded-lg overflow-hidden border border-border"
        role="img"
        aria-label="Today's duty timeline"
      >
        {blocks.map((seg) => (
          <div
            key={seg.id}
            className={`h-full ${ACTIVITY_COLORS[seg.activityType] ?? ACTIVITY_COLORS.default}`}
            style={{ flex: seg.minutes }}
            title={`${activityLabels[seg.activityType] ?? seg.activityType}: ${seg.minutes} min`}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {blocks.map((seg) => (
          <li key={seg.id} className="flex items-center gap-2 text-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${ACTIVITY_COLORS[seg.activityType] ?? ACTIVITY_COLORS.default}`}
              aria-hidden
            />
            <span className="font-medium flex-1 min-w-0 truncate">
              {activityLabels[seg.activityType] ?? seg.activityType}
            </span>
            <span className="text-muted-foreground tabular-nums shrink-0 text-xs">
              {formatUkTime(seg.startedAt)}
              {seg.endedAt ? ` – ${formatUkTime(seg.endedAt)}` : " – now"}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Total tracked: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
      </p>
    </div>
  );
}
