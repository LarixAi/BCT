import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SectionHeader } from "@/components/yard/primitives";
import { useYard } from "@/store/yard";
import { useSessionStore } from "@/platform/auth/session-store";
import { taskStats, formatTaskDue, isTaskOpen } from "@/domain/tasks/task-stats";
import { canAcceptTask } from "@/domain/tasks/task-workflow";
import type { YardTask, YardTaskPriority, YardTaskStatus } from "@/types/tasks";
import { ListTodo, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/tasks/")({
  head: () => ({
    meta: [
      { title: "Tasks — Veyvio Yard" },
      { name: "description", content: "Assigned yard work: movements, checks, equipment and inspections." },
    ],
  }),
  component: TasksPage,
});

type Filter = "all" | "mine" | "open" | "done";

const PRIORITY_TONE: Record<YardTaskPriority, string> = {
  Urgent: "bg-vor/10 text-vor border-vor/30",
  High: "bg-warn/10 text-warn border-warn/40",
  Normal: "bg-secondary text-muted border-border",
  Low: "bg-secondary text-muted border-border",
};

const STATUS_LABEL: Record<YardTaskStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Done",
  cancelled: "Cancelled",
};

function TasksPage() {
  const tasks = useYard(s => s.tasks) ?? [];
  const vehicles = useYard(s => s.vehicles);
  const acceptTask = useYard(s => s.acceptTask);
  const userId = useSessionStore(s => s.user?.id);
  const [filter, setFilter] = useState<Filter>("open");

  const stats = useMemo(() => taskStats(tasks, userId), [tasks, userId]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "mine":
        return (tasks ?? []).filter(t => isTaskOpen(t) && t.assigneeId === userId);
      case "open":
        return (tasks ?? []).filter(isTaskOpen);
      case "done":
        return (tasks ?? []).filter(t => t.status === "completed");
      default:
        return tasks ?? [];
    }
  }, [tasks, filter, userId]);

  return (
    <div className="space-y-4 animate-in-up pb-4">
      <SectionHeader title="Tasks" sub="assigned work" />

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<ListTodo className="size-4" />} label="Open" value={String(stats.open)} />
        <StatCard icon={<Clock className="size-4" />} label="Due soon" value={String(stats.dueSoon)} />
        <StatCard icon={<AlertTriangle className="size-4" />} label="Urgent" value={String(stats.urgent)} tone={stats.urgent > 0 ? "warn" : "default"} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(["open", "mine", "all", "done"] as Filter[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-xs border text-[10px] font-bold uppercase tracking-widest ${
              filter === f ? "border-primary bg-primary text-white" : "border-border bg-white text-muted"
            }`}
          >
            {f === "mine" ? `Mine (${stats.mine})` : f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(task => {
          const vehicle = task.vehicleId ? vehicles.find(v => v.id === task.vehicleId) : undefined;
          return (
            <TaskRow
              key={task.id}
              task={task}
              vehicleReg={vehicle?.reg}
              userId={userId}
              onAccept={acceptTask}
            />
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted text-center py-8 border border-dashed border-border rounded-xs">
            No tasks in this view.
          </p>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  vehicleReg,
  userId,
  onAccept,
}: {
  task: YardTask;
  vehicleReg?: string;
  userId?: string;
  onAccept: (id: string) => void;
}) {
  const canAccept = canAcceptTask(task, userId);

  return (
    <div className="bg-white border border-border rounded-xs p-3">
      <div className="flex items-start justify-between gap-2">
        <Link to="/tasks/$taskId" params={{ taskId: task.id }} className="min-w-0 flex-1 hover:opacity-90">
          <div className="font-bold text-sm">{task.title}</div>
          {vehicleReg && (
            <div className="text-[10px] font-mono text-muted mt-0.5">{vehicleReg}</div>
          )}
        </Link>
        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border shrink-0 ${PRIORITY_TONE[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-[10px] text-muted uppercase tracking-widest">
          Due {formatTaskDue(task.dueAt)}
          {task.assigneeName && <span className="ml-2 text-primary">· {task.assigneeName}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{STATUS_LABEL[task.status]}</span>
          {canAccept && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAccept(task.id)}
              className="text-[9px] uppercase tracking-widest font-bold h-7"
            >
              Accept
            </Button>
          )}
          <Link to="/tasks/$taskId" params={{ taskId: task.id }}>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone = "default" }: { icon: ReactNode; label: string; value: string; tone?: "default" | "warn" }) {
  return (
    <div className="bg-white border border-border rounded-xs p-3 text-center">
      <div className={`flex justify-center mb-1 ${tone === "warn" ? "text-warn" : "text-muted"}`}>{icon}</div>
      <div className={`text-xl font-extrabold font-display ${tone === "warn" ? "text-vor" : ""}`}>{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}
