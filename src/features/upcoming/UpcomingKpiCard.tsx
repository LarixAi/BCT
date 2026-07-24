import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { TrendBadge } from "@/features/home/HomeDashboardPrimitives";

export function UpcomingKpiCard({
  label,
  value,
  trend,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  trend: number;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[108px] w-full flex-col justify-between rounded-2xl border p-3.5 text-left transition-shadow sm:min-h-[118px] sm:p-4 ${
        active
          ? "border-[#12a89d] bg-[#f0fdf9] shadow-[0_4px_16px_rgba(18,168,157,0.12)]"
          : "border-[#e4e7ec] bg-white hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[#e4e7ec] text-[#667085] transition-colors group-hover:border-[#d0d5dd] group-hover:text-ink">
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-xl border border-[#e4e7ec] bg-[#f9fafb] text-[#667085]">
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="font-display text-2xl font-bold leading-none tabular-nums text-ink sm:text-[28px]">
          {value}
        </span>
        <TrendBadge value={trend} />
      </div>
    </button>
  );
}
