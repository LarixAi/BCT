import { useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useVehicleReadiness, useYard } from "@/store/yard";
import { useCan } from "@/platform/permissions/use-can";
import { RegPlate, StatusChip } from "@/components/yard/primitives";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ScanLine,
  Plus,
  PackagePlus,
  TriangleAlert,
  ChevronRight,
  ShieldAlert,
  Fuel,
  Clock,
  Wrench,
  UserCheck,
} from "lucide-react";
import { READINESS_TONE } from "@/lib/readiness";
import type { AssignedItem, EqStatus, EquipmentCheckRecord, FixedItem } from "@/types/equipment";
import type { EquipmentCheckKind } from "@/domain/equipment/equipment-mutations";

export const Route = createFileRoute("/_app/yard/$vehicleId/equipment")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.vehicleId} Equipment — Veyvio Yard` },
      { name: "description", content: "Vehicle equipment and stock: fixed items, assigned assets, consumables, documents and readiness." },
    ],
  }),
  component: EquipmentPage,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Vehicle not found.</p>,
});

function EquipmentPage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const eq = useYard(s => s.equipment[vehicleId]);
  const ensureVehicleEquipment = useYard(s => s.ensureVehicleEquipment);
  const readiness = useVehicleReadiness(vehicleId);
  const equipmentAudit = useYard(s => s.equipmentAudit);
  const audit = useMemo(
    () => equipmentAudit.filter(e => e.vehicleId === vehicleId).slice(0, 10),
    [equipmentAudit, vehicleId],
  );
  const openSheet = useYard(s => s.openSheet);

  useEffect(() => {
    if (vehicle) ensureVehicleEquipment(vehicleId);
  }, [vehicle, vehicleId, ensureVehicleEquipment]);

  if (!vehicle) {
    return <p className="p-8 text-center text-muted text-sm">Loading vehicle…</p>;
  }
  if (!eq?.fixed || !eq.assigned || !eq.consumables || !eq.documents) {
    return <p className="p-8 text-center text-muted text-sm">Loading equipment checklist…</p>;
  }

  const tone = READINESS_TONE[readiness.state];

  return (
    <div className="space-y-4 animate-in-up pb-4">
      {/* HEADER */}
      <div className="space-y-2">
        <Link to="/yard" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
          <ArrowLeft className="size-3" /> Yard Inventory
        </Link>
        <div className="bg-white border border-border rounded-xs p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xs border bg-secondary border-border font-mono text-base font-bold">{vehicle.bayId}</div>
              <div>
                <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} className="text-base" />
                <div className="mt-1 text-[11px] text-muted font-medium uppercase tracking-wider">{vehicle.type}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusChip status={vehicle.status} />
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1"><Fuel className="size-3" />{vehicle.fuelPct}%</span>
                {vehicle.lastCheckAt && <span className="inline-flex items-center gap-1"><Clock className="size-3" />{formatTime(vehicle.lastCheckAt)}</span>}
              </div>
            </div>
          </div>
          <Link to="/yard/$vehicleId" params={{ vehicleId }} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
            <Wrench className="size-3" /> Vehicle detail, defects & movements
          </Link>
        </div>
      </div>

      {/* READINESS BANNER */}
      <div className={`border ${tone.border} ${tone.bg} rounded-xs p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-widest ${tone.text}`}>Equipment Readiness</div>
            <div className={`text-lg font-extrabold font-display ${tone.text}`}>{tone.label.toUpperCase()}</div>
            <div className="text-xs mt-1 text-foreground/80">
              {readiness.totals.complete} of {readiness.totals.total} requirements complete
              {readiness.blockers.length > 0 && ` · ${readiness.blockers.length} safety-critical`}
              {readiness.restrictions.length > 0 && ` · ${readiness.restrictions.length} restricted`}
              {readiness.warnings.length > 0 && ` · ${readiness.warnings.length} warning${readiness.warnings.length > 1 ? "s" : ""}`}
            </div>
          </div>
          {readiness.state !== "ready" && (
            <ShieldAlert className={`size-6 ${tone.text} shrink-0`} />
          )}
        </div>
        {(readiness.blockers.length + readiness.restrictions.length + readiness.warnings.length) > 0 && (
          <ul className="mt-3 space-y-1 text-[11px]">
            {readiness.blockers.map((b, i) => <li key={`b${i}`} className="text-vor font-medium">▲ {b}</li>)}
            {readiness.restrictions.map((r, i) => <li key={`r${i}`} className="text-purple-700 font-medium">◆ {r}</li>)}
            {readiness.warnings.map((w, i) => <li key={`w${i}`} className="text-warn font-medium">• {w}</li>)}
          </ul>
        )}
      </div>

      <p className="px-1 text-[11px] text-muted">
        Toggle each item to confirm it is on the vehicle or mark it missing. Your check time is recorded.
      </p>

      {/* ACTION BAR */}
      <div className="grid grid-cols-4 gap-2 sticky top-[86px] z-30 bg-background py-1">
        <ActionBtn label="Scan" icon={<ScanLine className="size-4" />} onClick={() => void navigate({ to: "/scan" })} tone="accent" />
        <ActionBtn label="Assign" icon={<Plus className="size-4" />} onClick={() => openSheet({ kind: "assign-equipment", vehicleId })} tone="primary" />
        <ActionBtn label="Restock" icon={<PackagePlus className="size-4" />} onClick={() => openSheet({ kind: "restock-consumable", vehicleId })} tone="ok" />
        <ActionBtn label="Report" icon={<TriangleAlert className="size-4" />} onClick={() => openSheet({ kind: "report-equipment-issue", vehicleId })} tone="vor" />
      </div>

      {/* FIXED */}
      <Section title="Fixed Equipment" sub="stays with the vehicle · controlled changes only">
        {eq.fixed.map(i => <FixedRow key={i.id} vehicleId={vehicleId} item={i} />)}
      </Section>

      {/* ASSIGNED */}
      <Section title="Assigned Equipment" sub="reusable assets currently on this vehicle">
        {eq.assigned.map(i => <AssignedRow key={i.id} vehicleId={vehicleId} item={i} />)}
        {eq.assigned.length === 0 && <EmptyRow text="No assigned equipment." />}
      </Section>

      {/* CONSUMABLES */}
      <Section title="Consumables" sub="managed by stock level">
        {eq.consumables.map(c => {
          const pct = Math.round((c.current / c.target) * 100);
          const state: EqStatus = c.current <= 0 ? "missing" : c.current < c.target ? "low" : "complete";
          return (
            <div key={c.defId} className="p-3 border-b border-border last:border-b-0 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">{c.label}</span>
                  <StatusPill status={state} />
                </div>
                <div className="mt-1 text-[11px] text-muted font-mono">{c.current} / {c.target} {c.unit}</div>
                <div className="mt-1 h-1 bg-secondary rounded-xs overflow-hidden">
                  <div className={`h-full ${state === "missing" ? "bg-vor" : state === "low" ? "bg-warn" : "bg-ok"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => openSheet({ kind: "restock-consumable", vehicleId, defId: c.defId })} className="shrink-0 text-[10px] font-bold uppercase tracking-widest">Restock</Button>
            </div>
          );
        })}
      </Section>

      {/* DOCUMENTS */}
      <Section title="Documents & Controlled Items">
        {eq.documents.map(d => (
          <EquipmentCheckRow
            key={d.id}
            vehicleId={vehicleId}
            kind="document"
            itemId={d.id}
            label={d.label}
            sublabel={d.detail}
            status={d.status}
            lastCheck={d.lastCheck}
          />
        ))}
      </Section>

      {/* AUDIT */}
      <Section title={`Equipment Audit · last ${audit.length}`}>
        {audit.length === 0 ? (
          <EmptyRow text="No equipment activity yet." />
        ) : audit.map(e => (
          <div key={e.id} className="p-3 border-b border-border last:border-b-0 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-widest text-[10px] text-primary">{e.kind}</span>
              <span className="text-[10px] text-muted font-mono">{formatTime(e.at)} · {e.by}</span>
            </div>
            <p className="mt-1 text-muted">{e.detail}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-2 px-1">
        <h2 className="text-xs font-extrabold uppercase tracking-widest font-display">{title}</h2>
        {sub && <span className="text-[10px] text-muted italic">{sub}</span>}
      </div>
      <div className="bg-white border border-border rounded-xs overflow-hidden">{children}</div>
    </section>
  );
}

function EquipmentCheckRow({
  vehicleId,
  kind,
  itemId,
  label,
  sublabel,
  status,
  lastCheck,
  bad,
  children,
}: {
  vehicleId: string;
  kind: EquipmentCheckKind;
  itemId: string;
  label: string;
  sublabel?: string;
  status: EqStatus;
  lastCheck?: EquipmentCheckRecord;
  bad?: boolean;
  children?: React.ReactNode;
}) {
  const recordCheck = useYard(s => s.recordEquipmentPresence);
  const present = lastCheck?.present ?? isPresentStatus(status);

  return (
    <div className={`p-3 border-b border-border last:border-b-0 ${bad ? "bg-vor/5" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-wider">{label}</div>
            <StatusPill status={status} />
          </div>
          {sublabel && <div className="text-[10px] text-muted font-mono mt-0.5">{sublabel}</div>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {lastCheck && (
            <div
              className="inline-flex items-center gap-1 rounded-xs border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted"
              title={`Checked by ${lastCheck.checkedBy}`}
            >
              <UserCheck className={`size-3 ${lastCheck.present ? "text-ok" : "text-vor"}`} />
              <Clock className="size-3" />
              <span className="font-mono">{formatTime(lastCheck.checkedAt)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold uppercase tracking-widest ${present ? "text-ok" : "text-vor"}`}>
              {present ? "On board" : "Missing"}
            </span>
            <PresenceToggle
              checked={present}
              onCheckedChange={checked => recordCheck(vehicleId, kind, itemId, checked)}
              label={label}
            />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function FixedRow({ vehicleId, item }: { vehicleId: string; item: FixedItem }) {
  const openSheet = useYard(s => s.openSheet);
  const clear = useYard(s => s.clearEquipmentIssue);
  const bad = item.status === "missing" || item.status === "damaged" || item.status === "expired" || item.status === "incomplete";
  return (
    <EquipmentCheckRow
      vehicleId={vehicleId}
      kind="fixed"
      itemId={item.id}
      label={item.label}
      sublabel={item.id}
      status={item.status}
      lastCheck={item.lastCheck}
      bad={bad}
    >
      <div className="mt-2 text-[11px] text-muted flex flex-wrap gap-x-3 gap-y-0.5">
        {item.count && <span>{item.count.present}/{item.count.required} present</span>}
        {item.expiryDate && <span>Expires {formatDate(item.expiryDate)}</span>}
        {item.inspectionDueDate && <span>Inspection {formatDate(item.inspectionDueDate)}</span>}
        {item.note && <span className="text-vor">⚠ {item.note}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <MiniBtn onClick={() => openSheet({ kind: "report-equipment-issue", vehicleId, itemId: item.id, itemKind: "fixed" })}>Report issue</MiniBtn>
        {bad && <MiniBtn tone="ok" onClick={() => clear(vehicleId, "fixed", item.id, "Replaced / resolved")}>Mark replaced</MiniBtn>}
      </div>
    </EquipmentCheckRow>
  );
}

function AssignedRow({ vehicleId, item }: { vehicleId: string; item: AssignedItem }) {
  const openSheet = useYard(s => s.openSheet);
  const canTransfer = useCan("equipment.transfer");
  const isKit = !!item.components;
  const bad = item.status === "missing" || item.status === "damaged" || item.status === "incomplete";
  return (
    <EquipmentCheckRow
      vehicleId={vehicleId}
      kind="assigned"
      itemId={item.id}
      label={item.label}
      sublabel={item.qrCode ? `${item.qrCode} · ${item.id}` : item.id}
      status={item.status}
      lastCheck={item.lastCheck}
      bad={bad}
    >
      {isKit && item.components && (
        <ul className="mt-2 grid grid-cols-2 gap-1">
          {item.components.map(c => (
            <li key={c.id} className={`text-[10px] px-2 py-1 rounded-xs border ${c.present ? "border-border bg-white text-muted" : "border-vor/40 bg-vor/10 text-vor font-bold"}`}>
              {c.present ? "✓" : "✕"} {c.label}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {canTransfer && (
          <MiniBtn onClick={() => openSheet({ kind: "transfer-equipment", vehicleId, itemId: item.id })}>Transfer</MiniBtn>
        )}
        <MiniBtn onClick={() => openSheet({ kind: "equipment-label", vehicleId, itemId: item.id })}>Print label</MiniBtn>
        <MiniBtn onClick={() => openSheet({ kind: "unassign-equipment", vehicleId, itemId: item.id })}>Return to store</MiniBtn>
        <MiniBtn onClick={() => openSheet({ kind: "report-equipment-issue", vehicleId, itemId: item.id, itemKind: "assigned" })}>Report issue</MiniBtn>
      </div>
    </EquipmentCheckRow>
  );
}

function PresenceToggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label} on vehicle`}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`pointer-events-none block size-4 rounded-full bg-background shadow-lg transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function isPresentStatus(status: EqStatus): boolean {
  return status === "present" || status === "complete" || status === "expiring" || status === "inspection-due" || status === "low";
}

function StatusPill({ status }: { status: EqStatus }) {
  const map: Record<EqStatus, string> = {
    present: "bg-ok/10 text-ok border-ok/30",
    complete: "bg-ok/10 text-ok border-ok/30",
    missing: "bg-vor text-white border-vor",
    damaged: "bg-vor/15 text-vor border-vor/30",
    expired: "bg-vor/15 text-vor border-vor/30",
    expiring: "bg-warn/20 text-warn border-warn/40",
    "inspection-due": "bg-warn/20 text-warn border-warn/40",
    incomplete: "bg-vor/15 text-vor border-vor/30",
    low: "bg-warn/20 text-warn border-warn/40",
  };
  return <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-sm border tracking-widest ${map[status]}`}>{status.replace("-", " ")}</span>;
}

function ActionBtn({ label, icon, onClick, tone }: { label: string; icon: React.ReactNode; onClick: () => void; tone: "primary" | "accent" | "ok" | "vor" }) {
  const cls = tone === "primary" ? "bg-primary hover:bg-primary/90 text-white"
    : tone === "accent" ? "bg-accent hover:bg-accent/90 text-white"
    : tone === "ok" ? "bg-ok hover:bg-ok/90 text-white"
    : "bg-vor hover:bg-vor/90 text-white";
  return (
    <button onClick={onClick} className={`${cls} py-2.5 rounded-xs text-[10px] font-extrabold uppercase tracking-widest flex flex-col items-center gap-1`}>
      {icon}{label}
    </button>
  );
}

function MiniBtn({ children, onClick, tone = "default" }: { children: React.ReactNode; onClick: () => void; tone?: "default" | "ok" }) {
  const cls = tone === "ok" ? "border-ok/40 text-ok hover:bg-ok/10" : "border-border text-muted hover:border-accent hover:text-accent";
  return (
    <button onClick={onClick} className={`px-2 py-1 rounded-xs border text-[10px] font-bold uppercase tracking-widest ${cls}`}>
      {children} <ChevronRight className="inline size-2.5 -mt-0.5" />
    </button>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="p-4 text-xs text-muted">{text}</p>;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
