import { Link } from "@tanstack/react-router";
import { ScanLine } from "lucide-react";
import type { ReactNode } from "react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useSessionStore } from "@/platform/auth/session-store";
import { BottomNav } from "./BottomNav";
import { SyncStatusBadge } from "@/components/yard/status/SyncStatusBadge";
import { SyncNoticeBanner } from "@/components/yard/status/SyncNoticeBanner";
import { useSyncLifecycle } from "@/features/sync/use-sync-lifecycle";

export function AppShell({ children }: { children: ReactNode }) {
  const user = useSessionStore(s => s.user);
  const companyName = useTenancyStore(s => s.companyName);
  const depotName = useTenancyStore(s => s.depotName);
  const depotCode = useTenancyStore(s => s.depotCode);
  useSyncLifecycle();

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <header className="sticky top-0 z-40 bg-accent text-white border-b border-white/10 pt-safe">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/" className="shrink-0" aria-label="Veyvio Yard home">
              <BrandWordmark size="header" className="text-left" />
            </Link>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] uppercase tracking-widest text-white/50 font-medium leading-none">Depot</span>
              <span className="text-xs font-bold font-display truncate">
                {depotName ? `${depotName.toUpperCase()} (${depotCode})` : "No depot selected"}
              </span>
            </div>
            {companyName && (
              <>
                <div className="h-6 w-px bg-white/10 hidden md:block" />
                <div className="hidden md:flex flex-col min-w-0">
                  <span className="text-[9px] uppercase tracking-widest text-white/50 font-medium leading-none">Company</span>
                  <span className="text-xs font-bold font-display truncate">{companyName}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/scan"
              className="grid size-9 place-items-center rounded-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Scan vehicle or item"
            >
              <ScanLine className="size-5" />
            </Link>
            <SyncStatusBadge />
            {user && (
              <span className="text-xs font-medium text-white/70 hidden sm:inline">
                {user.firstName} {user.lastName}
              </span>
            )}
          </div>
        </div>
      </header>

      <SyncNoticeBanner />

      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-6">{children}</main>

      <BottomNav />
    </div>
  );
}
