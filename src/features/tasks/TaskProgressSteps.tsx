import type { YardTaskStatus } from "@/types/tasks";
import {
  TASK_PROGRESS_STEPS,
  taskProgressLabel,
  taskProgressPercent,
  taskProgressStepIndex,
} from "@/domain/tasks/task-progress";
import { ThickProgressBar } from "@/features/home/HomeDashboardPrimitives";

export function TaskProgressSteps({
  status,
  assigneeName,
  compact = false,
}: {
  status: YardTaskStatus;
  assigneeName?: string | null;
  compact?: boolean;
}) {
  const activeIndex = taskProgressStepIndex(status);
  const percent = taskProgressPercent(status);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-ink">{taskProgressLabel(status)}</span>
          {assigneeName ? <span className="text-[#667085]">{assigneeName}</span> : null}
        </div>
      ) : null}
      <ThickProgressBar value={percent} />
      <ol className="flex items-center justify-between gap-1">
        {TASK_PROGRESS_STEPS.map((step, index) => {
          const done = index < activeIndex || status === "completed";
          const active = index === activeIndex && status !== "completed";
          return (
            <li
              key={step.id}
              className={`flex flex-1 flex-col items-center gap-1 text-center ${
                index < TASK_PROGRESS_STEPS.length - 1 ? "relative" : ""
              }`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${
                  done
                    ? "bg-[#ecfdf3] text-[#027a48]"
                    : active
                      ? "bg-[#fff6ed] text-[#c4320a] ring-2 ring-[#fdb022]"
                      : "bg-[#f2f4f7] text-[#98a2b3]"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className={`text-[10px] font-medium ${active ? "text-ink" : "text-[#98a2b3]"}`}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
