import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionHeader } from "@/components/yard/primitives";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { usePermissionStore } from "@/platform/permissions/permission-store";
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
  ClipboardCheck,
  Info,
  MessageSquare,
  Camera,
  CalendarDays,
} from "lucide-react";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/more/")({
  head: () => ({
    meta: [{ title: yardPageTitle("More") }],
  }),
  component: MorePage,
});

const WORKFLOW_LINKS = [
  { to: "/tasks", label: "Tasks", icon: ListTodo, desc: "Yard work assigned to you" },
  { to: "/more/messages", label: "Driver messages", icon: MessageSquare, desc: "Talk with drivers on Command" },
  {
    to: "/more/vehicle-checks",
    label: "Vehicle checks",
    icon: ClipboardCheck,
    desc: "Full driver walkarounds with photos and answers",
  },
  {
    to: "/more/bodywork",
    label: "Driver bodywork",
    icon: Camera,
    desc: "Damage photos from Driver vehicle checks",
  },
  { to: "/inspections", label: "Inspections", icon: ListChecks, desc: "Damage review, baselines and analytics" },
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
  const user = useSessionStore(s => s.user);
  const signOut = useSessionStore(s => s.signOut);
  const clearContext = useTenancyStore(s => s.clearContext);
  const resetPermissions = usePermissionStore(s => s.reset);
  const companyName = useTenancyStore(s => s.companyName);
  const depotName = useTenancyStore(s => s.depotName);
  const role = useTenancyStore(s => s.role);

  function handleSignOut() {
    clearContext();
    resetPermissions();
    signOut();
    window.location.href = "/splash";
  }

  return (
    <div className="space-y-3 animate-in-up pb-4 sm:space-y-5">
      <section className="-mx-3 -mt-3 border-b border-border bg-surface px-3 py-3 sm:-mx-4 sm:-mt-6 sm:px-4 sm:py-4 lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <BrandWordmark size="header" onDark={false} className="text-left shrink-0" />
          <div className="min-w-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Depot</div>
            <div className="text-xs font-bold truncate">{depotName ?? "No depot"}</div>
          </div>
        </div>
      </section>

      <div className="hidden lg:block">
        <SectionHeader title="More" />
      </div>

      <Link
        to="/more/account"
        className="flex items-center gap-3 rounded border border-border bg-white p-3 hover:bg-secondary/40 sm:p-4"
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

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Workflow</h2>
        <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
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
      </section>

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Operations</h2>
        <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
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
      </section>

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">App</h2>
        <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
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
      </section>
    </div>
  );
}
