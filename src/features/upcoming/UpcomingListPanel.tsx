import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { DashboardSurface, StatusPill } from "@/features/home/HomeDashboardPrimitives";
import { formatUpcomingDue, getUpcomingItemLink } from "@/domain/upcoming/upcoming-item-links";
import type { UpcomingItem } from "@/types/upcoming";
import { UPCOMING_CATEGORY_LABELS } from "@/types/upcoming";

function priorityTone(priority: UpcomingItem["priority"]) {
  switch (priority) {
    case "critical":
      return "warn" as const;
    case "urgent":
      return "progress" as const;
    case "upcoming":
      return "review" as const;
    default:
      return "neutral" as const;
  }
}

function priorityLabel(priority: UpcomingItem["priority"]) {
  return priority.toUpperCase();
}

export function UpcomingListPanel({ items }: { items: UpcomingItem[] }) {
  return (
    <DashboardSurface>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Upcoming work</h2>
          <p className="mt-0.5 text-xs text-[#667085]">{items.length} in this view</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e4e7ec] px-4 py-10 text-center text-sm text-[#667085]">
          No upcoming items match these filters.
        </p>
      ) : (
        <div className="grid gap-2">
          {items.map(item => {
            const link = getUpcomingItemLink(item);
            const detail = [
              UPCOMING_CATEGORY_LABELS[item.category],
              item.subtitle,
              formatUpcomingDue(item.dueAt),
            ]
              .filter(Boolean)
              .join(" · ");

            const content = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    <StatusPill label={priorityLabel(item.priority)} tone={priorityTone(item.priority)} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#667085]">{detail}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" />
              </>
            );

            if (link) {
              return (
                <Link
                  key={item.id}
                  to={link.to}
                  params={link.params}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </DashboardSurface>
  );
}
