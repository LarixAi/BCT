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
    <nav className="flex gap-1 border-b border-border bg-white rounded-xs overflow-x-auto">
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
            className={`shrink-0 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
              active
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
