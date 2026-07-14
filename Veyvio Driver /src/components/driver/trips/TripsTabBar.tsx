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
    <nav className="flex gap-1 rounded-lg bg-secondary p-1" aria-label="Trips schedule">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
            active === tab.id
              ? "bg-card text-link shadow-sm ring-1 ring-link/20"
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
