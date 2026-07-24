import { Info } from "lucide-react";
import { DashboardSurface, StatusPill } from "@/features/home/HomeDashboardPrimitives";
import type { StatusBreakdownItem } from "./task-board-utils";
import { TaskStatusBarCanvas } from "./TaskStatusBarCanvas";

export function TaskStatusOverview({ breakdown }: { breakdown: StatusBreakdownItem[] }) {
  return (
    <DashboardSurface className="flex h-full flex-col">
      <h2 className="text-sm font-semibold text-ink">Task status overview</h2>
      <TaskStatusBarCanvas breakdown={breakdown} className="mt-4" />
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {breakdown.map(item => (
          <div
            key={item.id}
            className="relative rounded-xl border border-[#e4e7ec] bg-[#f9fafb] p-3"
          >
            <Info className="absolute right-2 top-2 size-3.5 text-[#98a2b3]" aria-hidden />
            <StatusPill label={item.label} tone={item.tone} />
            <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink">{item.pct}%</p>
            <p className="mt-0.5 text-xs text-[#667085]">
              {item.count} task{item.count === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>
    </DashboardSurface>
  );
}
