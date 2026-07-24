import { Link } from "@tanstack/react-router";
import { Calendar, ChevronDown, Plus, RefreshCw } from "lucide-react";
import { useSyncStore } from "@/platform/sync/outbox";
import { SegmentedControl } from "./HomeDashboardPrimitives";

type Range = "daily" | "weekly" | "monthly" | "yearly";

const RANGE_OPTIONS: { id: Range; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

function formatLastSync(iso: string | null): string {
  if (!iso) return "Not synced yet";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} min ago`;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function HomeDashboardHeader({
  range,
  onRangeChange,
}: {
  range: Range;
  onRangeChange: (range: Range) => void;
}) {
  const lastSyncedAt = useSyncStore(s => s.lastSyncedAt);

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[32px]">Depot board</h1>
          <p className="mt-1 hidden items-center gap-1.5 text-sm text-[#667085] sm:flex">
            <RefreshCw className="size-3.5" aria-hidden />
            Last sync: {formatLastSync(lastSyncedAt)}
          </p>
        </div>

        <Link
          to="/tasks"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto"
        >
          <Plus className="size-4" />
          Add task
        </Link>
      </div>

      <div className="-mx-1 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#e4e7ec] bg-white px-4 text-sm font-medium text-ink shadow-sm sm:w-auto"
        >
          <Calendar className="size-4 text-[#667085]" />
          Today
          <ChevronDown className="size-4 text-[#98a2b3]" />
        </button>

        <div className="overflow-x-auto pb-1 sm:pb-0">
          <SegmentedControl value={range} onChange={onRangeChange} options={RANGE_OPTIONS} className="min-w-max" />
        </div>
      </div>
    </header>
  );
}
