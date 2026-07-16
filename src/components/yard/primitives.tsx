import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronRight, Fuel, Wrench, Package } from "lucide-react";
import type { BayZone, Trip, Vehicle, VehicleStatus } from "@/types/yard";
import { useVehicleReadiness } from "@/store/yard";
import { READINESS_TONE } from "@/lib/readiness";
import { STATUS_DISPLAY } from "@/domain/yard/status-display";


export function RegPlate({ reg, tone = "default", className = "" }: { reg: string; tone?: "default" | "vor"; className?: string }) {
  const toneCls = tone === "vor" ? "bg-vor/10 text-vor border-vor/20" : "bg-secondary text-foreground border-border";
  return (
    <span className={`font-mono font-bold tracking-tighter px-1.5 py-0.5 rounded-xs border text-sm ${toneCls} ${className}`}>{reg}</span>
  );
}

const STATUS_COLORS: Record<VehicleStatus, string> = Object.fromEntries(
  Object.entries(STATUS_DISPLAY).map(([status, meta]) => [status, meta.tone]),
) as Record<VehicleStatus, string>;

export function StatusChip({ status, className = "" }: { status: VehicleStatus; className?: string }) {
  const meta = STATUS_DISPLAY[status];
  const Icon = meta.icon;
  return (
    <span
      title={meta.title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-sm border tracking-widest ${STATUS_COLORS[status]} ${className}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

export function KpiCard({
  label, value, tone = "default", to,
}: { label: string; value: ReactNode; tone?: "default" | "vor" | "primary" | "warn"; to?: string }) {
  const toneCls =
    tone === "vor" ? "bg-vor/5 border-vor/20 text-vor"
    : tone === "primary" ? "bg-primary/5 border-primary/20 text-primary"
    : tone === "warn" ? "bg-warn/5 border-warn/30 text-warn"
    : "bg-white border-border text-foreground";
  const inner = (
    <div className={`rounded border p-3.5 transition-colors ${toneCls} ${to ? "hover:bg-secondary/40 active:bg-secondary" : ""}`}>
      <div className={`text-[10px] font-bold uppercase tracking-widest ${tone === "default" ? "text-muted" : ""}`}>{label}</div>
      <div className="text-2xl font-extrabold font-display tabular-nums leading-tight mt-0.5">{value}</div>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-90 transition-opacity">{inner}</Link> : inner;
}

export function SectionHeader({
  title, sub, action,
}: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-2">
      <h2 className="text-sm font-extrabold tracking-tight uppercase font-display min-w-0 truncate">
        {title}
        {sub && <span className="text-muted ml-2 font-normal italic lowercase text-xs normal-case">{sub}</span>}
      </h2>
      {action}
    </div>
  );
}

export function DepartureRow({ trip, vehicle, driverName }: { trip: Trip; vehicle?: Vehicle; driverName?: string }) {
  const ready = trip.ready;
  const content = (
    <>
      <RegPlate reg={vehicle?.reg ?? "—"} tone={vehicle?.status === "VOR" ? "vor" : "default"} />
      <div className="flex flex-col min-w-0 px-1">
        <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{trip.code} — {trip.service}</span>
        <span className="text-xs font-semibold truncate">
          {trip.departAt} · Driver: <span className={driverName ? "" : "text-vor"}>{driverName ?? "UNASSIGNED"}</span>
        </span>
      </div>
      <div className="text-right flex flex-col items-end shrink-0">
        {ready ? (
          <span className="text-[10px] font-bold text-ok uppercase tracking-widest">Ready</span>
        ) : (
          <>
            <span className="text-[10px] font-bold text-vor uppercase tracking-widest">Blocked</span>
            <span className="text-[9px] text-vor/80 leading-tight italic truncate max-w-[140px]">{trip.blockers.join(" · ")}</span>
          </>
        )}
      </div>
    </>
  );

  if (vehicle) {
    return (
      <Link
        to="/yard/$vehicleId/equipment"
        params={{ vehicleId: vehicle.id }}
        className={`grid grid-cols-[82px_1fr_auto] items-center gap-2 border-b border-border p-2.5 transition-colors hover:bg-secondary/50 sm:grid-cols-[92px_1fr_auto] sm:p-3 ${ready ? "bg-ok/5" : ""}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`grid grid-cols-[82px_1fr_auto] items-center gap-2 border-b border-border p-2.5 sm:grid-cols-[92px_1fr_auto] sm:p-3 ${ready ? "bg-ok/5" : ""}`}>
      {content}
    </div>
  );
}

export function VehicleCard({ v, nextAction }: { v: Vehicle; nextAction?: string }) {
  const isVor = v.status === "VOR";
  const readiness = useVehicleReadiness(v.id);
  const tone = READINESS_TONE[readiness.state];
  return (
    <Link
      to="/yard/$vehicleId"
      params={{ vehicleId: v.id }}
      className={`block rounded border border-border bg-white p-3 transition-colors hover:border-primary ${isVor ? "border-l-4 border-l-vor" : ""}`}
    >
      <div className="flex gap-3 items-start">
        <div className={`grid size-10 shrink-0 place-items-center rounded border font-mono text-xs font-bold ${isVor ? "bg-vor/5 border-vor/20 text-vor" : "bg-secondary border-border"}`}>
          {v.bayId}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <RegPlate reg={v.reg} tone={isVor ? "vor" : "default"} />
            <StatusChip status={v.status} />
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-muted">
            <span className="uppercase tracking-wider">{v.type}</span>
            <span className="inline-flex items-center gap-1"><Fuel className="size-3" />{v.fuelPct}%</span>
            {v.lastCheckPassed === false && <span className="inline-flex items-center gap-1 text-vor"><Wrench className="size-3" />Check failed</span>}
          </div>
          <div className={`mt-2 hidden items-center gap-2 rounded border px-2 py-1 sm:flex ${tone.border} ${tone.bg} ${tone.text}`}>
            <Package className="size-3 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest shrink-0">{tone.label}</span>
            <span className="text-[10px] font-medium truncate">{readiness.summary}</span>
          </div>
          {nextAction && (
            <div className="mt-2 border-t border-border pt-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Next: {nextAction}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function VehicleInventoryRow({ v, zone }: { v: Vehicle; zone: BayZone }) {
  const readiness = useVehicleReadiness(v.id);
  const tone = READINESS_TONE[readiness.state];
  const isVor = v.status === "VOR";

  return (
    <Link
      to="/yard/$vehicleId"
      params={{ vehicleId: v.id }}
      className={`grid grid-cols-[72px_130px_minmax(120px,1fr)_170px_76px_minmax(130px,1fr)_24px] items-center gap-3 border-t border-border px-4 py-3 text-xs transition-colors hover:bg-secondary/40 ${
        isVor ? "border-l-4 border-l-vor" : ""
      }`}
    >
      <span className="font-mono font-bold">{v.bayId}</span>
      <RegPlate reg={v.reg} tone={isVor ? "vor" : "default"} className="w-fit" />
      <span className="text-muted">
        {v.type}
        <span className="ml-1 text-[10px]">· {zone}</span>
      </span>
      <StatusChip status={v.status} className="w-fit" />
      <span className="inline-flex items-center gap-1 font-bold tabular-nums">
        <Fuel className="size-3 text-muted" aria-hidden />
        {v.fuelPct}%
      </span>
      <span className={`min-w-0 truncate font-bold ${tone.text}`}>
        {tone.label}
        <span className="ml-1 font-medium text-muted">· {readiness.summary}</span>
      </span>
      <ChevronRight className="size-4 text-muted" aria-hidden />
    </Link>
  );
}


export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded border border-dashed border-border bg-white p-8 text-center">
      {icon && <div className="mx-auto mb-3 text-muted opacity-60">{icon}</div>}
      <p className="text-sm font-bold font-display uppercase tracking-wide text-foreground">{title}</p>
      {hint && <p className="mt-2 text-sm text-muted max-w-sm mx-auto leading-relaxed">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
