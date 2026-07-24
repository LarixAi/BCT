import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubPageHeader, hubPageShellClass } from "@/features/hub/HubPageHeader";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { usePermissionStore } from "@/platform/permissions/permission-store";
import { beginCompanySwitch, beginDepotSwitch } from "@/platform/tenancy/switch-tenant";
import {
  TriangleAlert,
  ShieldAlert,
  ListChecks,
  LineChart,
  Settings2,
  ClipboardList,
  LogOut,
  User,
  RefreshCw,
  LogIn,
  ListTodo,
  CalendarClock,
  ClipboardCheck,
  Info,
  MessageSquare,
  CalendarDays,
  CarFront,
  Building2,
  MapPin,
  ChevronRight,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/_app/more/")({
  head: () => ({
    meta: [{ title: yardPageTitle("More") }],
  }),
  component: MorePage,
});

const FLEET_LINKS = [
  { to: "/yard", label: "Vehicles", icon: Truck, desc: "Every vehicle on the depot" },
  {
    to: "/vehicle-bodywork",
    label: "Vehicle Bodywork",
    icon: CarFront,
    desc: "View, report and manage bodywork damage across your fleet",
  },
] as const;

const WORKFLOW_LINKS = [
  { to: "/upcoming", label: "Upcoming", icon: CalendarClock, desc: "Inspections, MOT, maintenance and preventative work due soon" },
  { to: "/tasks", label: "Tasks", icon: ListTodo, desc: "Yard work assigned to you" },
  { to: "/more/messages", label: "Driver messages", icon: MessageSquare, desc: "Talk with drivers on Command" },
  {
    to: "/more/vehicle-checks",
    label: "Vehicle checks",
    icon: ClipboardCheck,
    desc: "Full driver walkarounds with photos and answers",
  },
  { to: "/inspections", label: "Body inspections", icon: ListChecks, desc: "Full condition inspections, damage review and analytics" },
] as const;

const OPS_LINKS = [
  { to: "/plan", label: "Day plan", icon: CalendarDays, desc: "Tomorrow's staging order and duties" },
  { to: "/arrivals", label: "Arrivals", icon: LogIn, desc: "Record returning vehicles" },
  { to: "/defects", label: "Defects", icon: TriangleAlert, desc: "Open vehicle defects" },
  { to: "/vor", label: "VOR Board", icon: ShieldAlert, desc: "Off-road triage" },
  { to: "/movements", label: "Movement log", icon: ListChecks, desc: "Recent yard movements" },
  { to: "/departure-line", label: "Departure line", icon: LineChart, desc: "Next 90 min departures" },
  { to: "/shift", label: "Shift & handover", icon: ClipboardList, desc: "Depot context and handover" },
] as const;

function MorePage() {
  const navigate = useNavigate();
  const user = useSessionStore(s => s.user);
  const signOut = useSessionStore(s => s.signOut);
  const clearContext = useTenancyStore(s => s.clearContext);
  const resetPermissions = usePermissionStore(s => s.reset);
  const companyName = useTenancyStore(s => s.companyName);
  const depotName = useTenancyStore(s => s.depotName);
  const role = useTenancyStore(s => s.role);
  const [switching, setSwitching] = useState<"company" | "depot" | null>(null);

  async function handleSwitchCompany() {
    setSwitching("company");
    try {
      await beginCompanySwitch();
      navigate({ to: "/company-select", search: { switch: true } });
    } finally {
      setSwitching(null);
    }
  }

  function handleSwitchDepot() {
    setSwitching("depot");
    beginDepotSwitch();
    navigate({ to: "/depot-select", search: { switch: true } });
    setSwitching(null);
  }

  function handleSignOut() {
    clearContext();
    resetPermissions();
    signOut();
    window.location.href = "/splash";
  }

  return (
    <div className={hubPageShellClass}>
      <section className="-mx-3 border-b border-[#e4e7ec] bg-white px-3 py-3 sm:-mx-4 sm:px-4 sm:py-4 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <BrandWordmark size="header" onDark={false} className="text-left shrink-0" />
          <div className="min-w-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Depot</div>
            <div className="text-xs font-bold truncate">{depotName ?? "No depot"}</div>
          </div>
        </div>
      </section>

      <HubPageHeader title="More" description="Workflow, operations and account settings." showSync={false} />

      <DashboardSurface className="!p-0 overflow-hidden">
        <Link
          to="/more/account"
          className="flex items-center gap-3 p-3 hover:bg-secondary/40 sm:p-4"
        >
          <div className="grid size-10 place-items-center rounded bg-accent text-white sm:size-11">
            <User className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold truncate">{user ? `${user.firstName} ${user.lastName}` : "—"}</div>
            <div className="text-xs text-muted truncate">{user?.email}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary mt-0.5">
              {role?.replace(/_/g, " ") ?? "—"} · {companyName ?? "—"}
            </div>
          </div>
          <ChevronRight className="size-4 text-muted shrink-0" />
        </Link>
        <div className="grid grid-cols-2 gap-2 border-t border-border bg-secondary/20 p-3">
          <button
            type="button"
            onClick={() => void handleSwitchCompany()}
            disabled={switching === "company"}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xs border border-primary/30 bg-white px-3 text-xs font-bold text-accent hover:bg-yard-teal-soft disabled:opacity-60"
          >
            <Building2 className="size-4 shrink-0" />
            Switch company
          </button>
          <button
            type="button"
            onClick={handleSwitchDepot}
            disabled={switching === "depot"}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xs border border-border bg-white px-3 text-xs font-bold text-ink hover:bg-secondary/50 disabled:opacity-60"
          >
            <MapPin className="size-4 shrink-0 text-primary" />
            Switch depot
          </button>
        </div>
      </DashboardSurface>

      <DashboardSurface className="!p-0 overflow-hidden">
        <h2 className="border-b border-[#eaecf0] px-4 py-3 text-sm font-semibold text-ink">Fleet</h2>
        <div className="divide-y divide-[#eaecf0]">
          {FLEET_LINKS.map(item => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
              <item.icon className="size-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{item.label}</div>
                <div className="text-[10px] text-muted">{item.desc}</div>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </Link>
          ))}
        </div>
      </DashboardSurface>

      <DashboardSurface className="!p-0 overflow-hidden">
        <h2 className="border-b border-[#eaecf0] px-4 py-3 text-sm font-semibold text-ink">Checks</h2>
        <div className="divide-y divide-[#eaecf0]">
          {WORKFLOW_LINKS.map(item => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
              <item.icon className="size-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{item.label}</div>
                <div className="text-[10px] text-muted">{item.desc}</div>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </Link>
          ))}
        </div>
      </DashboardSurface>

      <DashboardSurface className="!p-0 overflow-hidden">
        <h2 className="border-b border-[#eaecf0] px-4 py-3 text-sm font-semibold text-ink">Operations</h2>
        <div className="divide-y divide-[#eaecf0]">
          {OPS_LINKS.map(item => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
              <item.icon className="size-4 text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{item.label}</div>
                <div className="text-[10px] text-muted">{item.desc}</div>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </Link>
          ))}
        </div>
      </DashboardSurface>

      <DashboardSurface className="!p-0 overflow-hidden">
        <h2 className="border-b border-[#eaecf0] px-4 py-3 text-sm font-semibold text-ink">App</h2>
        <div className="divide-y divide-[#eaecf0]">
          <button
            type="button"
            onClick={() => void handleSwitchCompany()}
            disabled={switching === "company"}
            className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 text-left disabled:opacity-60"
          >
            <Building2 className="size-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Switch company</div>
              <div className="text-[10px] text-muted">Choose Brent Community Transport or another operator</div>
            </div>
            <ChevronRight className="size-4 text-muted shrink-0" />
          </button>
          <button
            type="button"
            onClick={handleSwitchDepot}
            disabled={switching === "depot"}
            className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 text-left disabled:opacity-60"
          >
            <MapPin className="size-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Switch depot</div>
              <div className="text-[10px] text-muted">Change which yard you are operating</div>
            </div>
            <ChevronRight className="size-4 text-muted shrink-0" />
          </button>
          <Link to="/more/sync" className="flex items-center gap-3 p-3 hover:bg-secondary/50">
            <RefreshCw className="size-4 text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Sync queue</div>
              <div className="text-[10px] text-muted">Pending uploads and retry</div>
            </div>
            <ChevronRight className="size-4 text-muted shrink-0" />
          </Link>
          <Link to="/more/settings" className="flex items-center gap-3 p-3 hover:bg-secondary/50">
            <Settings2 className="size-4 text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Settings & security</div>
              <div className="text-[10px] text-muted">Account, sync and unlock</div>
            </div>
            <ChevronRight className="size-4 text-muted shrink-0" />
          </Link>
          <Link to="/more/about" className="flex items-center gap-3 p-3 hover:bg-secondary/50">
            <Info className="size-4 text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">About Veyvio Yard</div>
              <div className="text-[10px] text-muted">Campaign line and product promise</div>
            </div>
            <ChevronRight className="size-4 text-muted shrink-0" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-3 hover:bg-vor/5 text-left text-vor"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="text-sm font-bold flex-1">Sign out</span>
          </button>
        </div>
      </DashboardSurface>
    </div>
  );
}
