import { Link } from "@tanstack/react-router";
import { Flag, MessageSquare, MoreVertical, Paperclip, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThickProgressBar } from "@/features/home/HomeDashboardPrimitives";
import { canAcceptTask, isTaskAssignedToUser } from "@/domain/tasks/task-workflow";
import { taskProgressPercent } from "@/domain/tasks/task-progress";
import type { YardTask } from "@/types/tasks";
import {
  BOARD_COLUMNS,
  formatTaskCardDue,
  taskInitials,
  taskProjectLabel,
  tasksForColumn,
  type BoardColumn,
} from "./task-board-utils";

type Props = {
  tasks: YardTask[];
  userId?: string | null;
  userName?: string | null;
  onAccept: (id: string) => void;
};

function KanbanCard({
  task,
  userId,
  userName,
  onAccept,
}: {
  task: YardTask;
  userId?: string | null;
  userName?: string | null;
  onAccept: (id: string) => void;
}) {
  const progress = taskProgressPercent(task.status);
  const canAccept = canAcceptTask(task, userId, userName);
  const assignedToMe = isTaskAssignedToUser(task, userId, userName);

  return (
    <article className="rounded-xl border border-[#e4e7ec] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-[#667085]">{formatTaskCardDue(task.dueAt)}</span>
        <button type="button" className="rounded p-0.5 text-[#98a2b3] hover:bg-[#f2f4f7]">
          <MoreVertical className="size-3.5" />
        </button>
      </div>

      <Link to="/tasks/$taskId" params={{ taskId: task.id }} className="mt-2 block hover:opacity-90">
        <div className="flex items-start gap-1.5">
          <Flag className="mt-0.5 size-3.5 shrink-0 text-[#98a2b3]" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug text-ink">{task.title}</h3>
            <p className="mt-0.5 text-xs text-[#667085]">{taskProjectLabel(task)}</p>
            {assignedToMe ? (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#027a48]">
                Assigned to you
              </p>
            ) : null}
          </div>
        </div>
      </Link>

      {progress > 0 && (
        <div className="mt-3">
          <ThickProgressBar value={progress} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-[#f2f4f7] text-[10px] font-semibold text-[#475467]">
          {taskInitials(task.assigneeName ?? task.createdBy)}
        </span>
        <div className="flex items-center gap-2 text-[#98a2b3]">
          {task.vehicleId && (
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <Paperclip className="size-3" />
              1
            </span>
          )}
          {task.description && (
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <MessageSquare className="size-3" />
              1
            </span>
          )}
        </div>
      </div>

      {canAccept && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAccept(task.id)}
          className="mt-3 h-8 w-full text-[10px] font-bold uppercase tracking-widest"
        >
          Accept
        </Button>
      )}
    </article>
  );
}

function KanbanColumn({
  column,
  tasks,
  userId,
  userName,
  onAccept,
}: {
  column: BoardColumn;
  tasks: YardTask[];
  userId?: string | null;
  userName?: string | null;
  onAccept: (id: string) => void;
}) {
  const columnTasks = tasksForColumn(tasks, column);

  return (
    <section className="flex w-[260px] shrink-0 flex-col sm:w-[280px]">
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="text-sm font-semibold text-ink">{column.label}</h3>
          <span className="rounded-md bg-[#f2f4f7] px-1.5 py-0.5 text-xs font-medium tabular-nums text-[#667085]">
            {columnTasks.length}
          </span>
        </div>
        <button type="button" className="rounded-lg p-1 text-[#98a2b3] hover:bg-[#f2f4f7]">
          <Plus className="size-4" />
        </button>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {columnTasks.map(task => (
          <KanbanCard key={task.id} task={task} userId={userId} userName={userName} onAccept={onAccept} />
        ))}
        {columnTasks.length === 0 && (
          <p className="rounded-xl border border-dashed border-[#e4e7ec] px-3 py-6 text-center text-xs text-[#98a2b3]">
            No tasks
          </p>
        )}
      </div>
    </section>
  );
}

export function TasksKanbanBoard({ tasks, userId, userName, onAccept }: Props) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {BOARD_COLUMNS.map(column => (
        <KanbanColumn
          key={column.id}
          column={column}
          tasks={tasks}
          userId={userId}
          userName={userName}
          onAccept={onAccept}
        />
      ))}
    </div>
  );
}
