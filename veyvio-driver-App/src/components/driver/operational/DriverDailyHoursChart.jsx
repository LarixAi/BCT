const DAY_TYPE_LABEL = {
  rest: "Rest",
  today: "Today",
  future: "—",
  scheduled: "Sched",
};

const DAY_TYPE_BAR = {
  rest: "bg-slate-300/60",
  work: "bg-[#1eaeae]",
  today: "bg-[#1eaeae]",
  future: "bg-transparent",
  scheduled: "bg-[#1eaeae]/40",
};

export default function DriverDailyHoursChart({ days, maxHours = 12 }) {
  const peak = Math.max(maxHours, ...(days ?? []).map((d) => d.hours), 1);

  return (
    <div className="space-y-2" aria-label="Hours by day of week">
      {(days ?? []).map((day) => {
        const dayType = day.dayType ?? (day.hours > 0 ? "work" : "rest");
        const isRest = dayType === "rest";
        const showHours = day.hours > 0;
        const rightLabel = showHours
          ? `${day.hours}h`
          : DAY_TYPE_LABEL[dayType] ?? (isRest ? "Rest" : "—");

        return (
          <div key={day.iso} className="flex items-center gap-3 min-h-[28px]">
            <span className="w-8 text-xs font-medium text-muted-foreground shrink-0">{day.label}</span>
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${DAY_TYPE_BAR[dayType] ?? DAY_TYPE_BAR.work}`}
                style={{
                  width: showHours ? `${(day.hours / peak) * 100}%` : isRest ? "100%" : "0%",
                  minWidth: showHours ? 4 : isRest ? 0 : 0,
                  opacity: isRest ? 0.35 : 1,
                }}
              />
            </div>
            <span
              className={`w-12 text-xs font-semibold tabular-nums text-right shrink-0 ${
                isRest ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {rightLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
