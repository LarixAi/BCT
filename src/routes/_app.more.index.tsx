import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionHeader } from "@/components/yard/primitives";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { usePermissionStore } from "@/platform/permissions/permission-store";
import {
  TriangleAlert, ShieldAlert, ListChecks, LineChart,
  Settings2, ClipboardList, LogOut, User, RefreshCw, LogIn,
  ListTodo, ClipboardCheck,
} from "lucide-react";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/more/")({
  head: () => ({
    meta: [{ title: "More — Veyvio Yard" }],
  }),
  component: MorePage,
});

const WORKFLOW_LINKS = [
  { to: "/tasks", label: "Tasks", icon: ListTodo, desc: "Yard work assigned to you" },
  { to: "/inspections", label: "Inspections", icon: ClipboardCheck, desc: "Damage review, baselines and analytics" },
] as const;

const OPS_LINKS = [
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
  const role = useTenancyStore(s => s.role);

  function handleSignOut() {
    clearContext();
    resetPermissions();
    signOut();
    window.location.href = "/splash";
  }

  return (
    <div className="space-y-5 animate-in-up pb-4">
      <SectionHeader title="More" />

      <section className="bg-white border border-border rounded-xs p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xs bg-secondary border border-border">
            <User className="size-5 text-muted" />
          </div>
          <div className="min-w-0">
            <div className="font-bold truncate">{user ? `${user.firstName} ${user.lastName}` : "—"}</div>
            <div className="text-xs text-muted truncate">{user?.email}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary mt-0.5">
              {role?.replace(/_/g, " ") ?? "—"} · {companyName ?? "—"}
            </div>
          </div>
        </div>
      </section>

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
          <button type="button" className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 text-left">
            <Settings2 className="size-4 text-muted shrink-0" />
            <span className="text-sm font-bold flex-1">Settings & security</span>
            <ChevronRight className="size-4 text-muted" />
          </button>
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
