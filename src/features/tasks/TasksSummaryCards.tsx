import { Bell, CheckCircle2, Hourglass } from "lucide-react";
import { TrendBadge } from "@/features/home/HomeDashboardPrimitives";

function SummaryCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: number;
  trend: number;
  icon: typeof CheckCircle2;
}) {
  return (
    <div className="flex min-w-[220px] flex-1 flex-col justify-between rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg border border-[#e4e7ec] bg-[#f9fafb] text-[#667085]">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="font-display text-[28px] font-bold leading-none tabular-nums text-ink">{value}</span>
        <TrendBadge value={trend} />
      </div>
    </div>
  );
}

export function TasksSummaryCards({
  completed,
  pending,
  upcoming,
}: {
  completed: number;
  pending: number;
  upcoming: number;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
      <SummaryCard label="Task completed" value={completed} trend={10} icon={CheckCircle2} />
      <SummaryCard label="Pending tasks" value={pending} trend={14} icon={Hourglass} />
      <SummaryCard label="Upcoming deadlines" value={upcoming} trend={-5} icon={Bell} />
    </div>
  );
}
