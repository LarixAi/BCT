import { cn } from "@/lib/utils";
import type { TripsTab } from "@/types/trips";

const tabs: { id: TripsTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

export function TripsTabBar({
  active,
  onChange,
}: {
  active: TripsTab;
  onChange: (tab: TripsTab) => void;
}) {
  return (
    <nav
      className="flex gap-1 rounded-xl border border-border bg-[#F2F4F7] p-1"
      aria-label="Duties schedule"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
            active === tab.id
              ? "bg-white text-link shadow-sm"
              : "text-muted hover:text-foreground",
          )}
          aria-current={active === tab.id ? "page" : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
