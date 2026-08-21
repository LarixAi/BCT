import { Link } from "@tanstack/react-router";
import { Calendar, ListTodo, RefreshCw } from "lucide-react";
import { useSyncStore } from "@/platform/sync/outbox";
import { SegmentedControl } from "./HomeDashboardPrimitives";

export type HomeRange = "daily" | "weekly" | "monthly" | "yearly";

const RANGE_OPTIONS: { id: HomeRange; label: string }[] = [
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

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function HomeDashboardHeader({
  range,
  onRangeChange,
}: {
  range: HomeRange;
  onRangeChange: (range: HomeRange) => void;
}) {
  const lastSyncedAt = useSyncStore(s => s.lastSyncedAt);
  const isToday = range === "daily";

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
          <ListTodo className="size-4" />
          Open tasks
        </Link>
      </div>

      <div className="-mx-1 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => onRangeChange("daily")}
          aria-pressed={isToday}
          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium shadow-sm sm:w-auto ${
            isToday
              ? "border-[var(--brand-yard-teal,#12A89D)] bg-[var(--brand-yard-teal,#12A89D)]/10 text-ink"
              : "border-[#e4e7ec] bg-white text-ink"
          }`}
        >
          <Calendar className="size-4 text-[#667085]" />
          Today · {todayLabel()}
        </button>

        <div className="overflow-x-auto pb-1 sm:pb-0">
          <SegmentedControl value={range} onChange={onRangeChange} options={RANGE_OPTIONS} className="min-w-max" />
        </div>
      </div>
    </header>
  );
}
