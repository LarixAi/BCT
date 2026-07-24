import type { UpcomingBucket, UpcomingItem } from "@/types/upcoming";
import { countByBucket } from "@/domain/upcoming/upcoming-scheduling";

const BUCKETS: { id: UpcomingBucket; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
];

export function UpcomingSummaryCards({
  items,
  activeBucket,
  onSelect,
}: {
  items: UpcomingItem[];
  activeBucket: UpcomingBucket | "all";
  onSelect: (bucket: UpcomingBucket | "all") => void;
}) {
  const counts = countByBucket(items);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {BUCKETS.map(bucket => {
        const count =
          bucket.id === "overdue" ? counts.overdue
          : bucket.id === "today" ? counts.today
          : bucket.id === "week" ? counts.week
          : counts.month;
        const active = activeBucket === bucket.id;
        return (
          <button
            key={bucket.id}
            type="button"
            onClick={() => onSelect(activeBucket === bucket.id ? "all" : bucket.id)}
            className={`rounded-2xl border p-3.5 text-left transition-shadow sm:p-4 ${
              active
                ? "border-[#12a89d] bg-[#f0fdf9] shadow-[0_4px_16px_rgba(18,168,157,0.12)]"
                : "border-[#e4e7ec] bg-white hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)]"
            }`}
          >
            <div className="text-sm font-semibold text-ink">{bucket.label}</div>
            <div className="mt-2 font-display text-2xl font-bold tabular-nums text-ink">{count}</div>
          </button>
        );
      })}
    </div>
  );
}
