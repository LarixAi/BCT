import type { UpcomingItem } from "@/types/upcoming";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { AlertTriangle } from "lucide-react";

export function UpcomingAttentionStrip({ items }: { items: UpcomingItem[] }) {
  const urgent = items
    .filter(item => item.priority === "critical" || item.priority === "urgent")
    .slice(0, 4);

  if (urgent.length === 0) return null;

  return (
    <DashboardSurface className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-[#d92d20]" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">Urgent attention</h2>
      </div>
      <ul className="space-y-2">
        {urgent.map(item => (
          <li
            key={item.id}
            className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-3 py-2.5 text-sm text-[#912018]"
          >
            <span className="font-medium">{item.title}</span>
            {item.subtitle ? <span className="text-[#b42318]"> — {item.subtitle}</span> : null}
          </li>
        ))}
      </ul>
    </DashboardSurface>
  );
}
