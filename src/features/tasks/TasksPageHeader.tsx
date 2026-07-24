import { HubPageHeader } from "@/features/hub/HubPageHeader";
import { Plus, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function TasksPageHeader() {
  return (
    <HubPageHeader
      title="Tasks"
      primaryAction={
        <Link
          to="/tasks"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto"
        >
          <Plus className="size-4" />
          Add task
        </Link>
      }
      secondaryAction={
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm sm:w-auto"
        >
          <Upload className="size-4 text-[#667085]" />
          Import task
        </button>
      }
    />
  );
}
