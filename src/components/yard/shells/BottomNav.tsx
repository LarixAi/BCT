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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight text-white lg:hidden"
    >
      <div className="h-[2px] w-full bg-command-500" aria-hidden />
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
      className={`flex min-h-[52px] min-w-[56px] flex-col items-center gap-0.5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors ${
        active ? "text-command-500" : "text-white/60 hover:text-white"
      }`}
    >
      <span
        className={`mb-0.5 h-0.5 rounded-full bg-command-500 transition-[width] ${active ? "w-5" : "w-0"}`}
        aria-hidden
      />
      <span className="grid h-6 place-items-center" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}
