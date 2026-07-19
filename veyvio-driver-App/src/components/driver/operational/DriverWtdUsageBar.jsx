const WEEKLY_MAX = 60;

const SEGMENT_COLORS = {
  actual: "bg-emerald-500",
  scheduled: "bg-[#1eaeae]",
  other: "bg-violet-500",
  remainder: "bg-muted",
};

export default function DriverWtdUsageBar({
  projectedHours,
  actualHours = 0,
  scheduledHours = 0,
  otherWorkHours = 0,
  maxHours = WEEKLY_MAX,
}) {
  const total = Math.max(maxHours, projectedHours, 0.01);
  const scheduledOnly = Math.max(0, scheduledHours - actualHours);
  const segments = [
    { id: "actual", value: actualHours, color: SEGMENT_COLORS.actual, label: "Actual" },
    { id: "scheduled", value: scheduledOnly, color: SEGMENT_COLORS.scheduled, label: "Scheduled" },
    { id: "other", value: otherWorkHours, color: SEGMENT_COLORS.other, label: "Other work" },
  ].filter((s) => s.value > 0);

  const used = Math.min(maxHours, segments.reduce((sum, s) => sum + s.value, 0));
  const remainder = Math.max(0, maxHours - used);
  const pct = Math.min(100, Math.round((projectedHours / maxHours) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">{pct}% of {maxHours}h weekly max</span>
        <span className="text-muted-foreground tabular-nums">
          {projectedHours.toFixed(1)}h projected · {remainder.toFixed(1)}h remaining
        </span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden flex bg-muted"
        role="meter"
        aria-valuenow={projectedHours}
        aria-valuemin={0}
        aria-valuemax={maxHours}
        aria-label="Weekly working time usage"
      >
        {segments.map((seg) => (
          <div
            key={seg.id}
            className={`h-full ${seg.color}`}
            style={{ width: `${(seg.value / maxHours) * 100}%`, minWidth: seg.value > 0 ? 4 : 0 }}
            title={`${seg.label}: ${seg.value.toFixed(1)}h`}
          />
        ))}
        {remainder > 0 ? (
          <div className={`h-full flex-1 ${SEGMENT_COLORS.remainder}`} title={`Remaining: ${remainder.toFixed(1)}h`} />
        ) : null}
      </div>
      {segments.length > 1 ? (
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {segments.map((seg) => (
            <span key={seg.id} className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${seg.color}`} aria-hidden />
              {seg.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
