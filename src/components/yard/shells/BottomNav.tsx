import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardCheck, Home, Map, MoreHorizontal, Truck } from "lucide-react";
import type { ReactNode } from "react";
import {
  isChecksNavActive,
  isMoreNavActive,
  isVehiclesNavActive,
  isYardNavActive,
} from "@/domain/yard/nav-routes";

export function BottomNav() {
  const pathname = useRouterState({ select: s => s.location.pathname });

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 inset-x-0 z-40 bg-accent text-white border-t border-white/10">
      <div className="mx-auto flex max-w-5xl items-end justify-around px-1 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <NavTab to="/" label="Home" icon={<Home className="size-5" />} active={pathname === "/"} />
        <NavTab
          to="/checks"
          label="Checks"
          icon={<ClipboardCheck className="size-5" />}
          active={isChecksNavActive(pathname)}
        />
        <NavTab
          to="/yard"
          label="Vehicles"
          icon={<Truck className="size-5" />}
          active={isVehiclesNavActive(pathname)}
        />
        <NavTab
          to="/yard/map"
          label="Yard"
          icon={<Map className="size-5" />}
          active={isYardNavActive(pathname)}
        />
        <NavTab
          to="/more"
          label="More"
          icon={<MoreHorizontal className="size-5" />}
          active={isMoreNavActive(pathname)}
        />
      </div>
    </nav>
  );
}

function NavTab({
  to, label, icon, active,
}: { to: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 min-w-[56px] min-h-[48px] py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors ${
        active ? "text-primary" : "text-white/60 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
