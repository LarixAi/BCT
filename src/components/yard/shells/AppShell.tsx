import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardCheck, CalendarClock, CarFront, Home, Map, MoreHorizontal, ScanLine, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useSessionStore } from "@/platform/auth/session-store";
import { BottomNav } from "./BottomNav";
import { SyncStatusBadge } from "@/components/yard/status/SyncStatusBadge";
import { SyncNoticeBanner } from "@/components/yard/status/SyncNoticeBanner";
import { DataConnectionBanner } from "@/components/yard/status/DataConnectionBanner";
import { useSyncLifecycle } from "@/features/sync/use-sync-lifecycle";
import {
  isChecksNavActive,
  isMoreNavActive,
  isVehicleBodyworkNavActive,
  isVehiclesNavActive,
  isYardNavActive,
} from "@/domain/yard/nav-routes";

export function AppShell({ children }: { children: ReactNode }) {
  const user = useSessionStore(s => s.user);
  const companyName = useTenancyStore(s => s.companyName);
  const depotName = useTenancyStore(s => s.depotName);
  const depotCode = useTenancyStore(s => s.depotCode);
  const role = useTenancyStore(s => s.role);
  const pathname = useRouterState({ select: s => s.location.pathname });
  useSyncLifecycle();

  return (
    <div className="min-h-screen bg-[#f2f4f7] pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-ink lg:pb-0">
      {/* Mobile header — light dashboard chrome (matches desktop/web) */}
      <header className="sticky top-0 z-40 border-b border-[#e4e7ec] bg-white pt-safe shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5" aria-label="Veyvio Yard home">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-ink text-[10px] font-black text-white sm:size-9 sm:text-xs">
              VY
            </span>
            <div className="min-w-0">
              <BrandWordmark size="header" onDark={false} className="hidden sm:block" />
              <p className="truncate text-[11px] font-medium text-[#667085] sm:mt-0.5">
                {depotName ?? "Depot"}
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              to="/scan"
              className="grid size-8 place-items-center rounded-full bg-ink text-white sm:inline-flex sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3 sm:text-xs sm:font-semibold"
              aria-label="Scan vehicle or item"
            >
              <ScanLine className="size-4" />
              <span className="hidden sm:inline">Scan</span>
            </Link>
            <SyncStatusBadge variant="light" />
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-fg lg:flex">
        <Link
          to="/"
          className="flex items-center gap-3 border-b border-sidebar-border px-2 pb-5"
          aria-label="Veyvio Yard home"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-sm font-black text-white">
            VY
          </span>
          <BrandWordmark size="header" onDark={false} />
        </Link>

        <div className="px-2 py-4">
          <div className="text-[9px] font-bold uppercase tracking-widest text-sidebar-muted">Depot</div>
          <div className="mt-1 truncate text-xs font-bold text-ink">
            {depotName ? `${depotName} (${depotCode})` : "No depot selected"}
          </div>
        </div>

        <nav aria-label="Desktop main navigation" className="space-y-1">
          <DesktopNavItem to="/" label="Home" icon={<Home />} active={pathname === "/"} />
          <DesktopNavItem
            to="/checks"
            label="Checks"
            icon={<ClipboardCheck />}
            active={isChecksNavActive(pathname)}
          />
          <DesktopNavItem
            to="/yard"
            label="Vehicles"
            icon={<Truck />}
            active={isVehiclesNavActive(pathname)}
          />
          <DesktopNavItem
            to="/vehicle-bodywork"
            label="Vehicle Bodywork"
            icon={<CarFront />}
            active={isVehicleBodyworkNavActive(pathname)}
          />
          <DesktopNavItem
            to="/upcoming"
            label="Upcoming"
            icon={<CalendarClock />}
            active={pathname.startsWith("/upcoming")}
          />
          <DesktopNavItem
            to="/yard/map"
            label="Yard"
            icon={<Map />}
            active={isYardNavActive(pathname)}
          />
          <DesktopNavItem
            to="/more"
            label="More"
            icon={<MoreHorizontal />}
            active={isMoreNavActive(pathname)}
          />
        </nav>

        <div className="mt-auto border-t border-sidebar-border px-2 pt-4">
          {user && <div className="truncate text-xs font-bold text-ink">{user.firstName} {user.lastName}</div>}
          <div className="mt-1 truncate text-[10px] capitalize text-sidebar-muted">
            {role?.replaceAll("-", " ") ?? "Yard user"}
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[220px]">
        <header className="sticky top-0 z-30 hidden h-[58px] items-center justify-between border-b border-[#e4e7ec] bg-white px-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:flex">
          <div className="min-w-0 truncate text-xs text-[#667085]">
            {companyName ?? "Veyvio Transport"} · {depotName ?? "No depot selected"} operations
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/scan"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <ScanLine className="size-4" aria-hidden />
              Scan record
            </Link>
            <SyncStatusBadge variant="light" />
          </div>
        </header>

        <DataConnectionBanner />
        <SyncNoticeBanner />

        <main className="mx-auto max-w-5xl px-4 py-4 sm:px-5 sm:py-6 lg:mx-0 lg:max-w-none lg:px-6 xl:px-8">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

type DesktopShellRoute = "/" | "/checks" | "/yard" | "/upcoming" | "/yard/map" | "/more";

function DesktopNavItem({
  to,
  label,
  icon,
  active,
}: {
  to: DesktopShellRoute;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex min-h-10 w-full items-center gap-3 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101828]/20 ${
        active
          ? "bg-[#f2f4f7] pl-3 font-semibold text-ink"
          : "px-3 text-[#667085] hover:bg-[#f9fafb] hover:text-ink"
      }`}
    >
      <span
        className={`[&>svg]:size-4 ${active ? "text-ink" : "text-[#98a2b3] group-hover:text-ink"}`}
        aria-hidden
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
