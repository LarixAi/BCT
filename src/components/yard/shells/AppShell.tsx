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
    <div className="min-h-screen bg-background pb-28 text-foreground lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-accent pt-safe text-white lg:hidden">
        <div className="h-[3px] w-full bg-primary" aria-hidden />
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
              className="grid size-9 place-items-center rounded-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Scan vehicle or item"
            >
              <ScanLine className="size-5" />
            </Link>
            <SyncStatusBadge />
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[184px] flex-col bg-accent px-3 py-5 text-white lg:flex">
        <Link to="/" className="border-b border-white/10 px-2 pb-5" aria-label="Veyvio Yard home">
          <BrandWordmark size="header" />
        </Link>

        <div className="px-2 py-4">
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Depot</div>
          <div className="mt-1 truncate text-xs font-bold">
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

        <div className="mt-auto border-t border-white/10 px-2 pt-4">
          {user && <div className="truncate text-xs font-bold">{user.firstName} {user.lastName}</div>}
          <div className="mt-1 truncate text-[10px] capitalize text-white/45">
            {role?.replaceAll("-", " ") ?? "Yard user"}
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[184px]">
        <header className="sticky top-0 z-30 hidden h-[58px] items-center justify-between border-b border-border border-t-[3px] border-t-primary bg-card px-6 lg:flex">
          <div className="min-w-0 truncate text-xs text-muted-foreground">
            {companyName ?? "Veyvio Transport"} · {depotName ?? "No depot selected"} operations
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/scan"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-bold transition-colors hover:bg-muted"
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
      className={`flex min-h-10 items-center gap-3 rounded-lg border-l-[3px] px-3 text-xs font-bold transition-colors ${
        active
          ? "border-primary bg-primary/15 text-white"
          : "border-transparent text-white/55 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="[&>svg]:size-4" aria-hidden>{icon}</span>
      {label}
    </Link>
  );
}
