import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { yardCopy } from "@/copy/yard-messages";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { getUpcomingItemLink } from "@/domain/upcoming/upcoming-item-links";
import type { UpcomingItem } from "@/types/upcoming";

export function UpcomingAttentionPanel({ items }: { items: UpcomingItem[] }) {
  const urgent = items
    .filter(item => item.priority === "critical" || item.priority === "urgent")
    .slice(0, 6);

  if (urgent.length === 0) return null;

  return (
    <DashboardSurface>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{yardCopy.home.needsAttention}</h2>
        <span className="text-xs text-[#667085]">{urgent.length} actions</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {urgent.map(item => {
          const link = getUpcomingItemLink(item);
          const detail = [item.subtitle, item.statusLabel].filter(Boolean).join(" · ");
          if (!link) {
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[#667085]">{detail}</p>
                </div>
              </div>
            );
          }
          return (
            <Link
              key={item.id}
              to={link.to}
              params={link.params}
              className="flex items-center justify-between rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 truncate text-xs text-[#667085]">{detail}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" />
            </Link>
          );
        })}
      </div>
    </DashboardSurface>
  );
}
