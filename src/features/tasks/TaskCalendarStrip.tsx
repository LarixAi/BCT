import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import type { YardTask } from "@/types/tasks";
import {
  activeBoardTasks,
  dayKey,
  formatTaskShortDue,
  startOfWeek,
  taskDueDayKey,
  weekDays,
} from "./task-board-utils";

type Props = {
  tasks: YardTask[];
};

export function TaskCalendarStrip({ tasks }: Props) {
  const weekStart = useMemo(() => startOfWeek(), []);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const todayKey = dayKey(new Date());

  const tasksByDay = useMemo(() => {
    const map = new Map<string, YardTask[]>();
    activeBoardTasks(tasks).forEach(task => {
      const key = taskDueDayKey(task);
      if (!key) return;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    return map;
  }, [tasks]);

  return (
    <DashboardSurface>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Task calendar</h2>
        <button type="button" className="rounded-lg p-1 text-[#98a2b3] hover:bg-[#f2f4f7]">
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-2 border-b border-[#eaecf0] pb-2 text-center text-xs font-medium text-[#667085]">
            {days.map(day => (
              <div key={dayKey(day)} className={dayKey(day) === todayKey ? "text-ink" : ""}>
                {day.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </div>
            ))}
          </div>

          <div className="relative mt-3 grid min-h-[120px] grid-cols-7 gap-2">
            {days.map((day, colIndex) => {
              const key = dayKey(day);
              const dayTasks = tasksByDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <div key={key} className="relative space-y-2">
                  {isToday && (
                    <div
                      className="pointer-events-none absolute -top-3 bottom-0 left-1/2 w-px -translate-x-1/2 bg-ink/20"
                      aria-hidden
                    />
                  )}
                  {dayTasks.map((task, rowIndex) => (
                    <Link
                      key={task.id}
                      to="/tasks/$taskId"
                      params={{ taskId: task.id }}
                      className={`block truncate rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        isToday
                          ? "bg-ink text-white"
                          : "border border-[#e4e7ec] bg-[#f9fafb] text-[#344054] hover:bg-white"
                      }`}
                      style={{ marginTop: rowIndex > 0 ? 4 : colIndex * 8 }}
                      title={task.title}
                    >
                      {task.title}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#98a2b3]">
            {activeBoardTasks(tasks)
              .filter(t => t.dueAt)
              .slice(0, 4)
              .map(task => (
                <span key={task.id}>
                  {formatTaskShortDue(task.dueAt)} · {task.title.slice(0, 24)}
                  {task.title.length > 24 ? "…" : ""}
                </span>
              ))}
          </div>
        </div>
      </div>
    </DashboardSurface>
  );
}
