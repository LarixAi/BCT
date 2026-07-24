import type { YardTaskStatus } from "@/types/tasks";

export type TaskProgressStep = {
  id: "assigned" | "in_progress" | "completed";
  label: string;
};

export const TASK_PROGRESS_STEPS: TaskProgressStep[] = [
  { id: "assigned", label: "Assigned" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

export function taskProgressStepIndex(status: YardTaskStatus): number {
  switch (status) {
    case "open":
    case "assigned":
      return 0;
    case "in_progress":
      return 1;
    case "completed":
      return 2;
    default:
      return 0;
  }
}

export function taskProgressPercent(status: YardTaskStatus): number {
  switch (status) {
    case "open":
      return 10;
    case "assigned":
      return 33;
    case "in_progress":
      return 66;
    case "completed":
      return 100;
    default:
      return 0;
  }
}

export function taskProgressLabel(status: YardTaskStatus): string {
  switch (status) {
    case "open":
      return "Waiting for yard";
    case "assigned":
      return "Assigned to yard";
    case "in_progress":
      return "Yard working on it";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
