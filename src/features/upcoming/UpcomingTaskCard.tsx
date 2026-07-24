import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/features/home/HomeDashboardPrimitives";
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
  switch (priority) {
    case "critical":
      return "CRITICAL";
    case "urgent":
      return "URGENT";
    case "upcoming":
      return "UPCOMING";
    default:
      return "PLANNED";
  }
}

function formatDue(dueAt?: string) {
  if (!dueAt) return "No due date";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return dueAt;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  if (d < start) return "Overdue";
  if (d <= end) return "Due today";
  return `Due ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

function startAction(item: UpcomingItem) {
  if (item.yardTaskId) {
    return { label: "Start task", to: "/tasks/$taskId" as const, params: { taskId: item.yardTaskId } };
  }
  if (item.category === "inactive_vehicle" || item.category === "weekly_check" || item.category === "safety_inspection") {
    if (item.vehicleId) {
      return { label: "Start check", to: "/yard/$vehicleId/check" as const, params: { vehicleId: item.vehicleId } };
    }
  }
  if (item.category === "wheel_nut_retorque" && item.vehicleId) {
    return { label: "Start re-torque", to: "/yard/$vehicleId/check" as const, params: { vehicleId: item.vehicleId } };
  }
  if (item.vehicleId) {
    return { label: "View vehicle", to: "/yard/$vehicleId" as const, params: { vehicleId: item.vehicleId } };
  }
  return null;
}

export function UpcomingTaskCard({ item }: { item: UpcomingItem }) {
  const action = startAction(item);

  return (
    <article className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
            {UPCOMING_CATEGORY_LABELS[item.category]}
          </p>
          <h3 className="mt-1 text-base font-semibold text-ink">{item.title}</h3>
          {item.subtitle ? <p className="mt-0.5 text-sm text-[#667085]">{item.subtitle}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill label={priorityLabel(item.priority)} tone={priorityTone(item.priority)} />
          <span className="text-xs font-medium text-[#667085]">{formatDue(item.dueAt)}</span>
        </div>
      </div>

      {item.detailLines.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-[#475467]">
          {item.detailLines.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {action ? (
          <Button asChild size="sm" className="rounded-full">
            <Link to={action.to} params={action.params}>
              {action.label}
            </Link>
          </Button>
        ) : null}
        {item.vehicleId ? (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/yard/$vehicleId" params={{ vehicleId: item.vehicleId }}>
              View vehicle
            </Link>
          </Button>
        ) : null}
        {item.defectId ? (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/defects/$defectId" params={{ defectId: item.defectId }}>
              View defect
            </Link>
          </Button>
        ) : null}
        {item.blocksAllocation ? (
          <span className="inline-flex items-center rounded-full bg-[#fef3f2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#b42318]">
            Blocks allocation
          </span>
        ) : null}
        {item.evidenceMissing ? (
          <span className="inline-flex items-center rounded-full bg-[#fff6ed] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#c4320a]">
            Evidence missing
          </span>
        ) : null}
      </div>
    </article>
  );
}
