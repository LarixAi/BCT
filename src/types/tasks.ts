export type YardTaskKind = "move" | "check" | "equipment" | "defect" | "inspection" | "general";

export type YardTaskPriority = "Low" | "Normal" | "High" | "Urgent";

export type YardTaskStatus = "open" | "assigned" | "in_progress" | "completed" | "cancelled";

export interface YardTask {
  id: string;
  title: string;
  description?: string;
  kind: YardTaskKind;
  priority: YardTaskPriority;
  status: YardTaskStatus;
  dueAt?: string;
  vehicleId?: string;
  defectId?: string;
  tripId?: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  createdBy: string;
  acceptedAt?: string;
  completedAt?: string;
  completedBy?: string;
  completionNote?: string;
}
