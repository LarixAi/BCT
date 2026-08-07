import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Filter, MoreHorizontal, Search } from "lucide-react";
import type { YardTask, YardTaskStatus } from "@/types/tasks";
import { StatusPill, ThickProgressBar } from "./HomeDashboardPrimitives";

type Props = {
  tasks: YardTask[];
};

type StatusFilter = "all" | "open" | "in_progress" | "completed";
type SortKey = "title" | "assignee" | "project" | "status" | "progress" | "due";

const FILTER_CYCLE: StatusFilter[] = ["all", "open", "in_progress", "completed"];

function taskStatusLabel(status: YardTaskStatus): string {
  switch (status) {
    case "open": return "To-do";
    case "assigned": return "Assigned";
    case "in_progress": return "In progress";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
  }
}

function taskStatusTone(status: YardTaskStatus): "neutral" | "progress" | "ok" | "warn" | "review" {
  switch (status) {
    case "open": return "neutral";
    case "assigned": return "review";
    case "in_progress": return "progress";
    case "completed": return "ok";
    case "cancelled": return "warn";
  }
}

function taskProgress(status: YardTaskStatus): number {
  switch (status) {
    case "open": return 0;
    case "assigned": return 30;
    case "in_progress": return 65;
    case "completed": return 100;
    case "cancelled": return 0;
  }
}

function taskProject(task: YardTask): string {
  if (task.tripId) return "Departure run";
  if (task.vehicleId) return "Vehicle action";
  if (task.defectId) return "Defect follow-up";
  return "Depot task";
}

function formatDueDate(dueAt?: string): string {
  if (!dueAt) return "—";
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return dueAt;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function filterLabel(filter: StatusFilter): string {
  switch (filter) {
    case "all": return "All";
    case "open": return "To-do";
    case "in_progress": return "In progress";
    case "completed": return "Done";
  }
}

function matchesFilter(task: YardTask, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "open") return task.status === "open" || task.status === "assigned";
  return task.status === filter;
}

function SortableHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-3 text-left text-xs font-medium text-[#667085]">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? "text-ink" : ""}`}
      >
        {label}
        <ArrowUpDown className="size-3 opacity-60" />
      </button>
    </th>
  );
}

export function RecentTasksTable({ tasks }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = tasks.filter(t => matchesFilter(t, statusFilter));
    if (q) {
      rows = rows.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          (t.assigneeName?.toLowerCase().includes(q) ?? false) ||
          taskProject(t).toLowerCase().includes(q),
      );
    }

    const sorted = [...rows].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "assignee":
          return (a.assigneeName ?? "").localeCompare(b.assigneeName ?? "") * dir;
        case "project":
          return taskProject(a).localeCompare(taskProject(b)) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "progress":
          return (taskProgress(a.status) - taskProgress(b.status)) * dir;
        case "due":
        default: {
          const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
          const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
          return (aDue - bDue) * dir;
        }
      }
    });
    return sorted;
  }, [tasks, query, statusFilter, sortKey, sortAsc]);

  const cycleFilter = () => {
    setStatusFilter(prev => {
      const idx = FILTER_CYCLE.indexOf(prev);
      return FILTER_CYCLE[(idx + 1) % FILTER_CYCLE.length] ?? "all";
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <section className="rounded-2xl border border-[#e4e7ec] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-col gap-3 border-b border-[#eaecf0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <h2 className="text-base font-semibold text-ink">Recent tasks</h2>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search task"
              className="h-9 w-full rounded-lg border border-[#e4e7ec] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#98a2b3] focus:border-[#98a2b3] sm:w-52"
            />
          </label>
          <button
            type="button"
            onClick={cycleFilter}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#e4e7ec] px-3 text-sm font-medium text-ink"
            aria-label={`Filter tasks: ${filterLabel(statusFilter)}`}
          >
            <Filter className="size-4 text-[#667085]" />
            <span className="hidden sm:inline">{filterLabel(statusFilter)}</span>
          </button>
        </div>
      </div>

      <div className="divide-y divide-[#eaecf0] md:hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#667085]">No tasks match this search.</p>
        ) : (
          filtered.map(task => (
            <Link
              key={task.id}
              to="/tasks/$taskId"
              params={{ taskId: task.id }}
              className="block space-y-3 px-4 py-4 active:bg-[#f9fafb]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{task.title}</p>
                  <p className="mt-1 text-xs text-[#667085]">{taskProject(task)}</p>
                </div>
                <StatusPill label={taskStatusLabel(task.status)} tone={taskStatusTone(task.status)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-[#eef4ff] text-[10px] font-semibold text-[#3538cd]">
                    {initials(task.assigneeName)}
                  </span>
                  <span className="text-xs text-[#475467]">{task.assigneeName ?? "Unassigned"}</span>
                </div>
                <span className="text-xs text-[#667085]">{formatDueDate(task.dueAt)}</span>
              </div>
              <ThickProgressBar value={taskProgress(task.status)} />
            </Link>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="border-b border-[#eaecf0] bg-[#fcfcfd]">
            <tr>
              <SortableHeader label="Task" active={sortKey === "title"} onClick={() => toggleSort("title")} />
              <SortableHeader label="Assigned to" active={sortKey === "assignee"} onClick={() => toggleSort("assignee")} />
              <SortableHeader label="Project" active={sortKey === "project"} onClick={() => toggleSort("project")} />
              <SortableHeader label="Status" active={sortKey === "status"} onClick={() => toggleSort("status")} />
              <SortableHeader label="Progress" active={sortKey === "progress"} onClick={() => toggleSort("progress")} />
              <SortableHeader label="Due date" active={sortKey === "due"} onClick={() => toggleSort("due")} />
              <th className="w-10 px-3 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#667085]">
                  No tasks match this search.
                </td>
              </tr>
            ) : (
              filtered.map(task => (
                <tr key={task.id} className="border-b border-[#f2f4f7] last:border-0 hover:bg-[#fcfcfd]">
                  <td className="px-3 py-4 font-medium text-ink">
                    <Link to="/tasks/$taskId" params={{ taskId: task.id }} className="hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-full bg-[#eef4ff] text-[10px] font-semibold text-[#3538cd]">
                        {initials(task.assigneeName)}
                      </span>
                      <span className="text-[#475467]">{task.assigneeName ?? "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-[#475467]">{taskProject(task)}</td>
                  <td className="px-3 py-4">
                    <StatusPill label={taskStatusLabel(task.status)} tone={taskStatusTone(task.status)} />
                  </td>
                  <td className="min-w-[150px] px-3 py-4">
                    <ThickProgressBar value={taskProgress(task.status)} />
                  </td>
                  <td className="px-3 py-4 text-[#475467]">{formatDueDate(task.dueAt)}</td>
                  <td className="px-3 py-4">
                    <Link
                      to="/tasks/$taskId"
                      params={{ taskId: task.id }}
                      className="grid size-8 place-items-center rounded-lg text-[#667085] hover:bg-[#f2f4f7]"
                      aria-label={`Open ${task.title}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
