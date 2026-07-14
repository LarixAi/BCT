import { Link } from "@tanstack/react-router";
import type { DriverScheduleItem, ScheduleItemStatus } from "@/types/home";
import { HomeCard, HomeCardLabel, HomeCardTitle } from "./HomeCard";
import { cn } from "@/lib/utils";

const statusStyles: Record<ScheduleItemStatus, string> = {
  upcoming: "text-muted",
  ready: "text-link font-semibold",
  in_progress: "text-ok font-semibold",
  completed: "text-muted line-through",
  delayed: "text-warn font-semibold",
  cancelled: "text-muted line-through",
  reassigned: "text-warn",
  action_required: "text-vor font-semibold",
};

export function ScheduleTimeline({ items }: { items: DriverScheduleItem[] }) {
  const visible = items.slice(0, 4);

  return (
    <HomeCard>
      <HomeCardLabel>Today</HomeCardLabel>
      <HomeCardTitle>Schedule</HomeCardTitle>
      <div className="mt-3 overflow-hidden rounded-xs border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left text-[10px] uppercase tracking-widest text-muted">
              <th className="px-3 py-2 font-bold">Time</th>
              <th className="px-3 py-2 font-bold">Work</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2.5 font-mono text-xs">{item.time}</td>
                <td className={cn("px-3 py-2.5", statusStyles[item.status])}>{item.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        to="/trips"
        className="mt-3 inline-flex text-xs font-bold uppercase tracking-widest text-link hover:underline"
      >
        View full schedule →
      </Link>
    </HomeCard>
  );
}
