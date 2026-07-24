import { Link, useRouterState } from "@tanstack/react-router";
import type { Vehicle } from "@/types/yard";

interface VehicleTabBarProps {
  vehicle: Vehicle;
}

const TABS = [
  { id: "overview", label: "Overview", to: "/yard/$vehicleId" as const, exact: true },
  { id: "condition", label: "Condition", to: "/yard/$vehicleId/condition" as const },
  { id: "equipment", label: "Equipment", to: "/yard/$vehicleId/equipment" as const },
] as const;

export function VehicleTabBar({ vehicle }: VehicleTabBarProps) {
  const pathname = useRouterState({ select: s => s.location.pathname });

  return (
    <nav
      className="inline-flex w-full min-w-0 items-center gap-0.5 overflow-x-auto rounded-full border border-[#e4e7ec] bg-[#f2f4f7] p-1 sm:w-auto"
      role="tablist"
      aria-label={`${vehicle.reg} sections`}
    >
      {TABS.map(tab => {
        const href = tab.to.replace("$vehicleId", vehicle.id);
        const active = tab.exact
          ? pathname === href || pathname === `${href}/`
          : pathname.startsWith(href);
        return (
          <Link
            key={tab.id}
            to={tab.to}
            params={{ vehicleId: vehicle.id }}
            role="tab"
            aria-selected={active}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all sm:px-4 ${
              active
                ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                : "text-[#667085] hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
