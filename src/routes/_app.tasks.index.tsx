import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown, Filter } from "lucide-react";
import { useYard } from "@/store/yard";
import { useSessionStore } from "@/platform/auth/session-store";
import { RecentTasksTable } from "@/features/home/RecentTasksTable";
import { DashboardSurface, SegmentedControl } from "@/features/home/HomeDashboardPrimitives";
import { TaskCalendarStrip } from "@/features/tasks/TaskCalendarStrip";
import { TasksKanbanBoard } from "@/features/tasks/TasksKanbanBoard";
import { TasksPageHeader } from "@/features/tasks/TasksPageHeader";
import { TaskStatusOverview } from "@/features/tasks/TaskStatusOverview";
import { TasksSummaryCards } from "@/features/tasks/TasksSummaryCards";
import {
  activeBoardTasks,
  buildStatusBreakdown,
  isTaskUrgent,
  pendingTaskCount,
  sortTasks,
  upcomingDeadlineCount,
  type SortKey,
} from "@/features/tasks/task-board-utils";
import { getUserDisplayName, isTaskAssignedToUser } from "@/domain/tasks/task-workflow";

export const Route = createFileRoute("/_app/tasks/")({
  head: () => ({
    meta: [
      { title: "Tasks — Veyvio Yard" },
      { name: "description", content: "Assigned yard work: movements, checks, equipment and inspections." },
    ],
  }),
  component: TasksPage,
});

type ViewMode = "table" | "kanban" | "timeline";

const VIEW_OPTIONS: { id: ViewMode; label: string }[] = [
  { id: "table", label: "Table" },
  { id: "kanban", label: "Kanban" },
  { id: "timeline", label: "Timeline" },
];

function TasksPage() {
  const tasks = useYard(s => s.tasks) ?? [];
  const acceptTask = useYard(s => s.acceptTask);
  const user = useSessionStore(s => s.user);
  const userId = user?.id;
  const userName = getUserDisplayName(user);
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const [view, setView] = useState<ViewMode>("kanban");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("due");

  const breakdown = useMemo(() => buildStatusBreakdown(tasks), [tasks]);
  const boardTasks = useMemo(() => {
    let list = activeBoardTasks(tasks);
    if (myTasksOnly) list = list.filter(t => isTaskAssignedToUser(t, userId, userName));
    if (urgentOnly) list = list.filter(isTaskUrgent);
    return sortTasks(list, sort);
  }, [tasks, myTasksOnly, userId, userName, urgentOnly, sort]);

  const completed = breakdown.find(item => item.id === "completed")?.count ?? 0;
  const pending = pendingTaskCount(tasks);
  const upcoming = upcomingDeadlineCount(tasks);

  return (
    <div className="space-y-5 pb-6 animate-in-up">
      <TasksPageHeader />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <TaskStatusOverview breakdown={breakdown} />
        <TasksSummaryCards completed={completed} pending={pending} upcoming={upcoming} />
      </div>

      <TaskCalendarStrip tasks={tasks} />

      <DashboardSurface className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">All tasks</h2>
            <p className="mt-0.5 text-sm text-[#667085]">{boardTasks.length} in this view</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMyTasksOnly(v => !v)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
                myTasksOnly
                  ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]"
                  : "border-[#e4e7ec] bg-white text-[#344054]"
              }`}
            >
              Assigned to me
            </button>
            <button
              type="button"
              onClick={() => setUrgentOnly(v => !v)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
                urgentOnly
                  ? "border-[#fecdca] bg-[#fef3f2] text-[#b42318]"
                  : "border-[#e4e7ec] bg-white text-[#344054]"
              }`}
            >
              <Filter className="size-3.5" />
              Urgent
            </button>
            <button
              type="button"
              onClick={() => setSort(s => (s === "due" ? "priority" : "due"))}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e4e7ec] bg-white px-3 text-xs font-medium text-[#344054]"
            >
              <ArrowUpDown className="size-3.5" />
              Sort
            </button>
            <SegmentedControl value={view} onChange={setView} options={VIEW_OPTIONS} />
          </div>
        </div>

        {view === "kanban" && (
          <TasksKanbanBoard tasks={boardTasks} userId={userId} userName={userName} onAccept={acceptTask} />
        )}
        {view === "table" && <RecentTasksTable tasks={boardTasks} />}
        {view === "timeline" && <TaskCalendarStrip tasks={boardTasks} />}
      </DashboardSurface>
    </div>
  );
}
