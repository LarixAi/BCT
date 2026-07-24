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
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e4e7ec] bg-white shadow-[0_-4px_20px_rgba(16,24,40,0.06)] lg:hidden"
    >
      <div className="mx-auto flex max-w-5xl items-stretch justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
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
      className={`flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors ${
        active
          ? "bg-[#f2f4f7] text-ink"
          : "text-[#667085] hover:bg-[#f9fafb] hover:text-ink"
      }`}
    >
      <span className={`grid h-6 place-items-center ${active ? "text-ink" : "text-[#98a2b3]"}`} aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}
