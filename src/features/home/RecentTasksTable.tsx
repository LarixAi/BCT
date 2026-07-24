import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Filter, MoreHorizontal, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { YardTask, YardTaskStatus } from "@/types/tasks";
import { StatusPill, ThickProgressBar } from "./HomeDashboardPrimitives";

type Props = {
  tasks: YardTask[];
};

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

function SortableHeader({ label }: { label: string }) {
  return (
    <th className="px-3 py-3 text-left text-xs font-medium text-[#667085]">
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="size-3 opacity-60" />
      </span>
    </th>
  );
}

export function RecentTasksTable({ tasks }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        (t.assigneeName?.toLowerCase().includes(q) ?? false) ||
        taskProject(t).toLowerCase().includes(q),
    );
  }, [tasks, query]);

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#e4e7ec] px-3 text-sm font-medium text-ink"
          >
            <Filter className="size-4 text-[#667085]" />
            <span className="hidden sm:inline">Filter</span>
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
              <th className="w-10 px-3 py-3" aria-label="Select" />
              <SortableHeader label="Task" />
              <SortableHeader label="Assigned to" />
              <SortableHeader label="Project" />
              <SortableHeader label="Status" />
              <SortableHeader label="Progress" />
              <SortableHeader label="Due date" />
              <th className="w-10 px-3 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-[#667085]">
                  No tasks match this search.
                </td>
              </tr>
            ) : (
              filtered.map(task => {
                const checked = selected.has(task.id);
                return (
                  <tr
                    key={task.id}
                    className={`border-b border-[#f2f4f7] last:border-0 ${checked ? "bg-[#f9fafb]" : "hover:bg-[#fcfcfd]"}`}
                  >
                    <td className="px-3 py-4">
                      <Checkbox checked={checked} onCheckedChange={() => toggleRow(task.id)} />
                    </td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
