import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardCheck, Home, Map, MoreHorizontal, ScanLine, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useSessionStore } from "@/platform/auth/session-store";
import { BottomNav } from "./BottomNav";
import { SyncStatusBadge } from "@/components/yard/status/SyncStatusBadge";
import { SyncNoticeBanner } from "@/components/yard/status/SyncNoticeBanner";
import { useSyncLifecycle } from "@/features/sync/use-sync-lifecycle";
import {
  isChecksNavActive,
  isMoreNavActive,
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
    <div className="min-h-screen bg-page pb-28 text-ink lg:pb-0">
      {/* Mobile header — Midnight chrome + Command Blue rail (Admin accent) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-midnight pt-safe text-white lg:hidden">
        <div className="h-[3px] w-full bg-command-500" aria-hidden />
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" className="shrink-0" aria-label="Veyvio Yard home">
              <BrandWordmark size="header" />
            </Link>
            <div className="hidden h-6 w-px bg-white/10 sm:block" />
            <div className="flex min-w-0 flex-col">
              <span className="text-[9px] font-medium uppercase leading-none tracking-widest text-white/50">Depot</span>
              <span className="truncate font-display text-xs font-bold">
                {depotName ? `${depotName} (${depotCode})` : "No depot selected"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/scan"
              className="grid size-9 place-items-center rounded-xl bg-command-500 text-white transition-colors hover:bg-command-700"
              aria-label="Scan vehicle or item"
            >
              <ScanLine className="size-5" />
            </Link>
            <SyncStatusBadge />
          </div>
        </div>
      </header>

      {/* Desktop sidebar — light Command style (matches Admin) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 text-sidebar-fg lg:flex">
        <Link
          to="/"
          className="flex items-center gap-3 border-b border-sidebar-border px-2 pb-5"
          aria-label="Veyvio Yard home"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-command-500 text-sm font-black text-white">
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
        <header className="sticky top-0 z-30 hidden h-[58px] items-center justify-between border-b border-border border-t-[3px] border-t-command-500 bg-surface px-6 lg:flex">
          <div className="min-w-0 truncate text-xs text-muted">
            {companyName ?? "Veyvio Transport"} · {depotName ?? "No depot selected"} operations
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/scan"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-command-500 px-3 text-xs font-bold text-white shadow-[0_8px_18px_rgb(47_107_255/0.22)] transition-colors hover:bg-command-700"
            >
              <ScanLine className="size-4" aria-hidden />
              Scan record
            </Link>
            <SyncStatusBadge variant="light" />
          </div>
        </header>

        <SyncNoticeBanner />

        <main className="mx-auto max-w-5xl px-3 py-3 sm:px-4 sm:py-6 lg:mx-0 lg:max-w-none lg:px-6 xl:px-8">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

type DesktopShellRoute = "/" | "/checks" | "/yard" | "/yard/map" | "/more";

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
      className={`group flex min-h-10 w-full items-center gap-3 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-command-500 ${
        active
          ? "border-l-[3px] border-l-command-500 bg-sidebar-active pl-[9px] font-semibold text-sidebar-active-fg"
          : "border-l-[3px] border-l-transparent px-3 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
      }`}
    >
      <span
        className={`[&>svg]:size-4 ${active ? "text-command-500" : "text-sidebar-muted group-hover:text-sidebar-fg"}`}
        aria-hidden
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
