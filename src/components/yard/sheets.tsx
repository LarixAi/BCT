import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useYard } from "@/store/yard";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { useCan } from "@/platform/permissions/use-can";
import { RegPlate, StatusChip } from "@/components/yard/primitives";
import type { BayZone, DefectSeverity, MovementReason, VorLifecycle } from "@/types/yard";
import { Check, X, Camera, TriangleAlert, MoveRight, ClipboardCheck, ShieldAlert, LogIn, LineChart, CheckCircle2 } from "lucide-react";
import { getEmptyBaysInZone } from "@/features/yard/yard-map";
import { buildDepartureChecklist, canReleaseTrip } from "@/domain/yard/departure-checklist";
import { drivers } from "@/data/fixtures";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";
import { YardConfirmDialog } from "@/components/yard/YardConfirmDialog";

const ZONE_TO_REASON: Record<BayZone, MovementReason> = {
  Parking: "Move to parking",
  Wash: "Move to wash",
  Fuel: "Move to fuel",
  Inspection: "Move to inspection",
  Workshop: "Move to workshop",
  "Departure Line": "Move to departure line",
  "Off-site": "Move off-site",
};

const ZONES: BayZone[] = ["Parking", "Wash", "Fuel", "Inspection", "Workshop", "Departure Line", "Off-site"];

const DEFECT_CATEGORIES = ["Brakes", "Tyres", "Lights", "Steering", "Bodywork", "Doors", "Interior", "Wheelchair equipment", "Warning lights", "Other"];
const SEVERITIES: DefectSeverity[] = ["Minor", "Major", "Safety-critical"];
const VOR_STATES: VorLifecycle[] = ["Potential", "Awaiting Triage", "Confirmed", "Awaiting Recovery", "Under Repair", "Cleared"];

export function SheetHost() {
  const sheet = useYard(s => s.sheet);
  const close = useYard(s => s.closeSheet);
  const open = sheet !== null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent side="bottom" className="rounded-t-lg max-h-[92vh] overflow-y-auto p-0">
        {sheet?.kind === "move" && <MoveVehicleSheet vehicleId={sheet.vehicleId} />}
        {sheet?.kind === "check" && <CheckRouteRedirect vehicleId={sheet.vehicleId} />}
        {sheet?.kind === "defect" && <RaiseDefectSheet vehicleId={sheet.vehicleId} />}
        {sheet?.kind === "vor" && <VorTriageSheet caseId={sheet.caseId} />}
        {sheet?.kind === "quick" && <QuickPickSheet />}
        {sheet?.kind === "assign-equipment" && <AssignEquipmentSheet vehicleId={sheet.vehicleId} />}
        {sheet?.kind === "restock-consumable" && <RestockConsumableSheet vehicleId={sheet.vehicleId} defId={sheet.defId} />}
        {sheet?.kind === "report-equipment-issue" && <ReportEquipmentIssueSheet vehicleId={sheet.vehicleId} itemId={sheet.itemId} itemKind={sheet.itemKind} />}
        {sheet?.kind === "unassign-equipment" && <UnassignEquipmentSheet vehicleId={sheet.vehicleId} itemId={sheet.itemId} />}
        {sheet?.kind === "scan-equipment" && <ScanSimulatorSheet vehicleId={sheet.vehicleId} />}
        {sheet?.kind === "arrival" && <ArrivalSheet vehicleId={sheet.vehicleId} />}
        {sheet?.kind === "stage-departure" && <StageDepartureSheet vehicleId={sheet.vehicleId} />}
        {sheet?.kind === "departure-release" && <DepartureReleaseSheet tripId={sheet.tripId} />}
      </SheetContent>
    </Sheet>
  );
}


// ------------- Quick picker -------------
function QuickPickSheet() {
  const vehicles = useYard(s => s.vehicles);
  const open = useYard(s => s.openSheet);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => vehicles.filter(v => v.reg.toLowerCase().includes(q.toLowerCase()) || v.bayId.toLowerCase().includes(q.toLowerCase())).slice(0, 12),
    [vehicles, q],
  );
  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight">Quick Action</SheetTitle>
        <SheetDescription>Search a vehicle by reg or bay, then pick an action.</SheetDescription>
      </SheetHeader>
      <Input placeholder="Search reg or bay…" value={q} onChange={e => setQ(e.target.value)} className="mb-3" />
      <div className="space-y-2 max-h-[45vh] overflow-y-auto">
        {filtered.map(v => (
          <div key={v.id} className="flex items-center justify-between border border-border p-2 rounded-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-bold w-10 shrink-0">{v.bayId}</span>
              <RegPlate reg={v.reg} tone={v.status === "VOR" ? "vor" : "default"} />
              <StatusChip status={v.status} className="hidden sm:inline-flex" />
            </div>
            <div className="flex gap-1 shrink-0">
              <IconBtn onClick={() => open({ kind: "check", vehicleId: v.id })} label="Check"><ClipboardCheck className="size-3.5" /></IconBtn>
              <IconBtn onClick={() => open({ kind: "move", vehicleId: v.id })} label="Move"><MoveRight className="size-3.5" /></IconBtn>
              <IconBtn onClick={() => open({ kind: "defect", vehicleId: v.id })} label="Defect" tone="vor"><TriangleAlert className="size-3.5" /></IconBtn>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted text-center py-6">No vehicles match.</p>}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label, tone = "default" }: { children: React.ReactNode; onClick: () => void; label: string; tone?: "default" | "vor" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`grid size-7 place-items-center rounded-xs border ${tone === "vor" ? "border-vor/30 text-vor hover:bg-vor/10" : "border-border hover:bg-secondary"}`}
    >
      {children}
    </button>
  );
}

// ------------- Move vehicle -------------
function MoveVehicleSheet({ vehicleId }: { vehicleId: string }) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const bays = useYard(s => s.bays);
  const move = useYard(s => s.moveVehicle);
  const close = useYard(s => s.closeSheet);
  const [zone, setZone] = useState<BayZone | null>(null);
  const [bayId, setBayId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!vehicle) return null;
  const zoneBays = zone ? bays.filter(b => b.zone === zone && b.id !== vehicle.bayId) : [];

  const submit = () => {
    if (!bayId || !zone) return;
    move(vehicle.id, bayId, ZONE_TO_REASON[zone], note || undefined);
    toast.success(yardCopy.toast.move.toBay(vehicle.reg, bayId));
    close();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight flex items-center gap-2">
          <MoveRight className="size-4 text-primary" /> Move Vehicle
        </SheetTitle>
        <SheetDescription>
          <RegPlate reg={vehicle.reg} /> currently at <span className="font-mono font-bold">{vehicle.bayId}</span>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Target Zone</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {ZONES.map(z => (
              <button
                key={z}
                onClick={() => { setZone(z); setBayId(null); }}
                className={`p-3 rounded-xs border text-xs font-bold uppercase tracking-widest text-left ${zone === z ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border bg-white hover:border-accent"}`}
              >{z}</button>
            ))}
          </div>
        </div>
        {zone && (
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Target Bay</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {zoneBays.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBayId(b.id)}
                  className={`px-3 py-2 rounded-xs border font-mono text-sm font-bold ${bayId === b.id ? "border-primary bg-primary text-white" : "border-border bg-white hover:border-accent"}`}
                >{b.id}</button>
              ))}
              {zoneBays.length === 0 && <p className="text-xs text-muted">No available bays in this zone.</p>}
            </div>
          </div>
        )}
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Note (optional)</Label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. staged early for driver handover" className="mt-2" />
        </div>
      </div>

      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <PermissionGate permission="vehicle.move" fallback={<Button disabled className="flex-1 uppercase tracking-widest font-bold">No permission</Button>}>
          <Button onClick={submit} disabled={!bayId} className="flex-1 bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold">Confirm Move</Button>
        </PermissionGate>
      </SheetFooter>
    </div>
  );
}

function CheckRouteRedirect({ vehicleId }: { vehicleId: string }) {
  const navigate = useNavigate();
  const close = useYard(s => s.closeSheet);
  useEffect(() => {
    close();
    navigate({ to: "/yard/$vehicleId/check", params: { vehicleId } });
  }, [vehicleId, navigate, close]);
  return null;
}

// ------------- Raise defect -------------
function RaiseDefectSheet({ vehicleId }: { vehicleId: string }) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const raise = useYard(s => s.raiseDefect);
  const raiseVor = useYard(s => s.raiseVorFromDefect);
  const close = useYard(s => s.closeSheet);
  const [category, setCategory] = useState<string>("Tyres");
  const [severity, setSeverity] = useState<DefectSeverity>("Major");
  const [notes, setNotes] = useState("");
  const [autoVor, setAutoVor] = useState(true);
  const [confirmVor, setConfirmVor] = useState(false);

  if (!vehicle) return null;

  const executeSubmit = () => {
    const df = raise({ vehicleId: vehicle.id, category, severity, notes: notes || `${category} defect` });
    if (severity === "Safety-critical" && autoVor) {
      const vc = raiseVor(df.id);
      toast.error(yardCopy.toast.vor.openedWithCase(vehicle.reg, vc.id));
    } else {
      toast.warning(yardCopy.toast.defect.raised(vehicle.reg));
    }
    close();
  };

  const submit = () => {
    if (severity === "Safety-critical" && autoVor) {
      setConfirmVor(true);
      return;
    }
    executeSubmit();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight flex items-center gap-2">
          <TriangleAlert className="size-4 text-vor" /> Raise Defect
        </SheetTitle>
        <SheetDescription><RegPlate reg={vehicle.reg} /> · <span className="font-mono">{vehicle.bayId}</span></SheetDescription>
      </SheetHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Category</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {DEFECT_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`p-2 rounded-xs border text-xs font-bold uppercase tracking-wider ${category === c ? "border-accent bg-accent text-white" : "border-border bg-white hover:border-accent"}`}
              >{c}</button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Severity</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {SEVERITIES.map(s => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`p-3 rounded-xs border text-xs font-bold uppercase tracking-wider ${
                  severity === s
                    ? s === "Safety-critical" ? "border-vor bg-vor text-white"
                    : s === "Major" ? "border-warn bg-warn text-black"
                    : "border-accent bg-accent text-white"
                    : "border-border bg-white hover:border-accent"
                }`}
              >{s}</button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Fault description</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the fault clearly for the next shift…" className="mt-2 min-h-[80px]" />
        </div>
        {severity === "Safety-critical" && (
          <label className="flex items-center gap-2 border border-vor/40 bg-vor/5 p-3 rounded-xs cursor-pointer">
            <input type="checkbox" checked={autoVor} onChange={e => setAutoVor(e.target.checked)} className="size-4 accent-vor" />
            <span className="text-xs font-bold uppercase tracking-wider text-vor flex items-center gap-2">
              <ShieldAlert className="size-4" /> Open VOR case immediately
            </span>
          </label>
        )}
      </div>

      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <Button onClick={submit} className="flex-1 bg-vor hover:bg-vor/90 text-white uppercase tracking-widest font-bold">Raise Defect</Button>
      </SheetFooter>

      <YardConfirmDialog
        open={confirmVor}
        onOpenChange={setConfirmVor}
        {...yardCopy.confirm.safetyDefectVor(vehicle.reg)}
        confirmLabel={yardCopy.buttons.markVehicleVor}
        destructive
        onConfirm={() => {
          setConfirmVor(false);
          executeSubmit();
        }}
      />
    </div>
  );
}

// ------------- VOR triage -------------
function VorTriageSheet({ caseId }: { caseId: string }) {
  const vor = useYard(s => s.vorCases.find(c => c.id === caseId));
  const vehicles = useYard(s => s.vehicles);
  const advance = useYard(s => s.advanceVor);
  const close = useYard(s => s.closeSheet);
  const [target, setTarget] = useState<VorLifecycle | null>(null);
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canMarkVor = useCan("vehicle.mark_vor");
  const canReleaseVor = useCan("vehicle.release_vor");
  const canAdvance = target === "Cleared" ? canReleaseVor : canMarkVor;

  if (!vor) return null;
  const veh = vehicles.find(v => v.id === vor.vehicleId);

  const executeSubmit = () => {
    if (!target) return;
    advance(vor.id, target, note || undefined);
    toast.success(yardCopy.toast.vor.statusChanged(vor.id, target));
    close();
  };

  const submit = () => {
    if (!target) return;
    if (target === "Confirmed" || target === "Cleared") {
      setConfirmOpen(true);
      return;
    }
    executeSubmit();
  };

  const confirmCopy =
    target === "Cleared" && veh
      ? yardCopy.confirm.releaseVor(veh.reg)
      : veh
        ? yardCopy.confirm.markVor(veh.reg)
        : yardCopy.confirm.markVor(vor.id);

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight flex items-center gap-2">
          <ShieldAlert className="size-4 text-vor" /> VOR Triage
        </SheetTitle>
        <SheetDescription>
          {veh && <RegPlate reg={veh.reg} tone="vor" />} · Currently <span className="font-bold uppercase">{vor.lifecycle}</span>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4">
        <div className="border border-border rounded-xs bg-white p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted font-bold">Reason</div>
          <div className="text-sm font-medium mt-1">{vor.reason}</div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Advance to</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {VOR_STATES.filter(s => s !== vor.lifecycle).map(s => (
              <button
                key={s}
                onClick={() => setTarget(s)}
                className={`p-3 rounded-xs border text-xs font-bold uppercase tracking-wider ${target === s ? "border-primary bg-primary text-white" : "border-border bg-white hover:border-accent"}`}
              >{s}</button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Note</Label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Triage notes for the audit log…" className="mt-2" />
        </div>
      </div>

      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <Button onClick={submit} disabled={!target || !canAdvance} className="flex-1 bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold">
          {canAdvance ? "Confirm" : "No permission"}
        </Button>
      </SheetFooter>

      <YardConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={target === "Cleared" ? yardCopy.buttons.returnToService : yardCopy.buttons.markVehicleVor}
        cancelLabel={target === "Cleared" ? yardCopy.buttons.keepVor : "Cancel"}
        destructive={target !== "Cleared"}
        onConfirm={() => {
          setConfirmOpen(false);
          executeSubmit();
        }}
      />
    </div>
  );
}

// ============ Equipment sheets ============

const UNASSIGN_REASONS = [
  "Returned to stores",
  "Moving to another vehicle",
  "Sent to workshop",
  "Damaged",
  "Missing component",
  "Cleaning required",
  "Inspection required",
];
const UNASSIGN_DESTINATIONS = [
  "Equipment store",
  "Workshop",
  "Quarantine area",
  "Another vehicle",
  "External supplier",
  "Missing / lost",
];
const ISSUE_TYPES: { key: "missing" | "damaged" | "expired" | "inspection"; label: string }[] = [
  { key: "missing", label: "Missing" },
  { key: "damaged", label: "Damaged" },
  { key: "expired", label: "Expired" },
  { key: "inspection", label: "Send for inspection" },
];

function AssignEquipmentSheet({ vehicleId }: { vehicleId: string }) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const assign = useYard(s => s.assignEquipment);
  const close = useYard(s => s.closeSheet);
  const [defId, setDefId] = useState("hi-vis");
  const [asset, setAsset] = useState("");
  const [label, setLabel] = useState("Hi-vis vest");

  if (!vehicle) return null;
  const options = [
    { defId: "hi-vis", label: "Hi-vis vest", prefix: "HV" },
    { defId: "torch", label: "Driver torch", prefix: "TR" },
    { defId: "warning-triangle", label: "Warning triangle", prefix: "WT" },
    { defId: "accident-pack", label: "Accident pack", prefix: "AP" },
    { defId: "wheelchair-set", label: "Wheelchair Restraint Set", prefix: "WCS" },
    { defId: "booster-seat", label: "Booster seat", prefix: "BS" },
    { defId: "breakdown-pack", label: "Breakdown pack", prefix: "BD" },
  ];
  const opt = options.find(o => o.defId === defId)!;
  const suggested = `${opt.prefix}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const submit = () => {
    const id = asset.trim() || suggested;
    const item = defId === "wheelchair-set" ? {
      id, defId, label,
      status: "complete" as const,
      components: [
        { id: `${id}-C1`, label: "Clamp 1", present: true },
        { id: `${id}-C2`, label: "Clamp 2", present: true },
        { id: `${id}-C3`, label: "Clamp 3", present: true },
        { id: `${id}-C4`, label: "Clamp 4", present: true },
        { id: `${id}-B`, label: "Occupant Belt", present: true },
        { id: `${id}-R`, label: "Restraint", present: true },
      ],
    } : { id, defId, label, status: "present" as const };
    assign(vehicle.id, item);
    toast.success(yardCopy.toast.equipment.assigned(label, vehicle.reg));
    close();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight">Assign Equipment</SheetTitle>
        <SheetDescription><RegPlate reg={vehicle.reg} /> · <span className="font-mono">{vehicle.bayId}</span></SheetDescription>
      </SheetHeader>
      <div className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Equipment type</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {options.map(o => (
              <button key={o.defId} onClick={() => { setDefId(o.defId); setLabel(o.label); }}
                className={`p-2 rounded-xs border text-xs font-bold uppercase tracking-wider text-left ${defId === o.defId ? "border-accent bg-accent text-white" : "border-border bg-white hover:border-accent"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Asset ID (scan or enter)</Label>
          <Input value={asset} onChange={e => setAsset(e.target.value)} placeholder={suggested} className="mt-2 font-mono" />
          <p className="text-[10px] text-muted mt-1">Leave blank to auto-generate {suggested}.</p>
        </div>
      </div>
      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <PermissionGate permission="equipment.assign" fallback={<Button disabled className="flex-1 uppercase tracking-widest font-bold">No permission</Button>}>
          <Button onClick={submit} className="flex-1 bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold">Confirm Assign</Button>
        </PermissionGate>
      </SheetFooter>
    </div>
  );
}

function UnassignEquipmentSheet({ vehicleId, itemId }: { vehicleId: string; itemId: string }) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const item = useYard(s => s.equipment[vehicleId]?.assigned.find(a => a.id === itemId));
  const unassign = useYard(s => s.unassignEquipment);
  const close = useYard(s => s.closeSheet);
  const [reason, setReason] = useState<string | null>(null);
  const [dest, setDest] = useState<string | null>(null);

  if (!vehicle || !item) return null;

  const submit = () => {
    if (!reason || !dest) return;
    unassign(vehicle.id, itemId, reason, dest);
    toast.success(yardCopy.toast.equipment.unassigned(item.label, dest));
    close();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight">Unassign Equipment</SheetTitle>
        <SheetDescription>{item.label} <span className="font-mono">({item.id})</span> from <RegPlate reg={vehicle.reg} /></SheetDescription>
      </SheetHeader>
      <div className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Reason</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {UNASSIGN_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`p-2 rounded-xs border text-xs font-bold uppercase tracking-wider text-left ${reason === r ? "border-accent bg-accent text-white" : "border-border bg-white hover:border-accent"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Destination</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {UNASSIGN_DESTINATIONS.map(d => (
              <button key={d} onClick={() => setDest(d)}
                className={`p-2 rounded-xs border text-xs font-bold uppercase tracking-wider text-left ${dest === d ? "border-primary bg-primary text-white" : "border-border bg-white hover:border-primary"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <PermissionGate permission="equipment.transfer" fallback={<Button disabled className="flex-1 uppercase tracking-widest font-bold">No permission</Button>}>
          <Button onClick={submit} disabled={!reason || !dest} className="flex-1 bg-vor hover:bg-vor/90 text-white uppercase tracking-widest font-bold">Confirm</Button>
        </PermissionGate>
      </SheetFooter>
    </div>
  );
}

function RestockConsumableSheet({ vehicleId, defId }: { vehicleId: string; defId?: string }) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const consumables = useYard(s => s.equipment[vehicleId]?.consumables ?? []);
  const restock = useYard(s => s.restockConsumable);
  const close = useYard(s => s.closeSheet);
  const target = defId ? consumables.filter(c => c.defId === defId) : consumables;
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(target.map(c => [c.defId, Math.max(0, c.target - c.current)])));

  if (!vehicle) return null;

  const submit = () => {
    let count = 0;
    for (const c of target) {
      const add = qty[c.defId] ?? 0;
      if (add > 0) { restock(vehicle.id, c.defId, add); count++; }
    }
    toast.success(yardCopy.toast.equipment.restocked(count, vehicle.reg));
    close();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight">Restock Consumables</SheetTitle>
        <SheetDescription><RegPlate reg={vehicle.reg} /> · draws from depot stock</SheetDescription>
      </SheetHeader>
      <div className="space-y-3">
        {target.map(c => (
          <div key={c.defId} className="border border-border rounded-xs p-3 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">{c.label}</div>
                <div className="text-[11px] text-muted">Current {c.current} / target {c.target} {c.unit}</div>
              </div>
              <Input
                type="number" min={0} max={c.target - c.current}
                value={qty[c.defId] ?? 0}
                onChange={e => setQty(x => ({ ...x, [c.defId]: Math.max(0, Math.min(c.target - c.current, Number(e.target.value))) }))}
                className="w-20 text-right font-mono"
              />
            </div>
          </div>
        ))}
      </div>
      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <PermissionGate permission="equipment.assign" fallback={<Button disabled className="flex-1 uppercase tracking-widest font-bold">No permission</Button>}>
          <Button onClick={submit} className="flex-1 bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold">Confirm Restock</Button>
        </PermissionGate>
      </SheetFooter>
    </div>
  );
}

function ReportEquipmentIssueSheet({ vehicleId, itemId, itemKind }: { vehicleId: string; itemId?: string; itemKind?: "fixed" | "assigned" }) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const eq = useYard(s => s.equipment[vehicleId]);
  const report = useYard(s => s.reportEquipmentIssue);
  const raiseDefect = useYard(s => s.raiseDefect);
  const raiseVor = useYard(s => s.raiseVorFromDefect);
  const close = useYard(s => s.closeSheet);
  const [kind, setKind] = useState<"fixed" | "assigned">(itemKind ?? "fixed");
  const [selected, setSelected] = useState<string | null>(itemId ?? null);
  const [issue, setIssue] = useState<"missing" | "damaged" | "expired" | "inspection">("missing");
  const [note, setNote] = useState("");
  const [alsoVor, setAlsoVor] = useState(false);

  if (!vehicle || !eq) return null;
  const items = kind === "fixed" ? eq.fixed : eq.assigned;

  const submit = () => {
    if (!selected) return;
    const item = items.find(i => i.id === selected)!;
    report(vehicle.id, kind, selected, issue, note || undefined);
    if (alsoVor) {
      const df = raiseDefect({ vehicleId: vehicle.id, category: item.label, severity: "Safety-critical", notes: `${issue}: ${note || item.label}` });
      raiseVor(df.id);
      toast.error(yardCopy.toast.vor.opened(vehicle.reg));
    } else {
      toast.warning(yardCopy.toast.equipment.issue(item.label, issue));
    }
    close();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight">Report Equipment Issue</SheetTitle>
        <SheetDescription><RegPlate reg={vehicle.reg} /></SheetDescription>
      </SheetHeader>
      <div className="space-y-4">
        {!itemId && (
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Category</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => { setKind("fixed"); setSelected(null); }} className={`p-2 rounded-xs border text-xs font-bold uppercase tracking-wider ${kind === "fixed" ? "border-primary bg-primary text-white" : "border-border bg-white"}`}>Fixed</button>
              <button onClick={() => { setKind("assigned"); setSelected(null); }} className={`p-2 rounded-xs border text-xs font-bold uppercase tracking-wider ${kind === "assigned" ? "border-primary bg-primary text-white" : "border-border bg-white"}`}>Assigned</button>
            </div>
          </div>
        )}
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Item</Label>
          <div className="space-y-1 mt-2 max-h-48 overflow-y-auto">
            {items.map(i => (
              <button key={i.id} onClick={() => setSelected(i.id)}
                className={`w-full text-left p-2 rounded-xs border text-xs font-bold ${selected === i.id ? "border-accent bg-accent/10" : "border-border bg-white hover:border-accent"}`}>
                <span className="uppercase tracking-wider">{i.label}</span> <span className="font-mono text-muted text-[10px]">{i.id}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Issue</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {ISSUE_TYPES.map(t => (
              <button key={t.key} onClick={() => setIssue(t.key)}
                className={`p-2 rounded-xs border text-xs font-bold uppercase tracking-wider ${issue === t.key ? "border-vor bg-vor text-white" : "border-border bg-white hover:border-vor"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Notes</Label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} className="mt-2" placeholder="e.g. pressure gauge failed" />
        </div>
        <label className="flex items-center gap-2 border border-vor/40 bg-vor/5 p-3 rounded-xs cursor-pointer">
          <input type="checkbox" checked={alsoVor} onChange={e => setAlsoVor(e.target.checked)} className="size-4 accent-vor" />
          <span className="text-xs font-bold uppercase tracking-wider text-vor">Also raise safety-critical defect & VOR</span>
        </label>
      </div>
      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <Button onClick={submit} disabled={!selected} className="flex-1 bg-vor hover:bg-vor/90 text-white uppercase tracking-widest font-bold">Report</Button>
      </SheetFooter>
    </div>
  );
}

function ScanSimulatorSheet({ vehicleId }: { vehicleId: string }) {
  const eq = useYard(s => s.equipment[vehicleId]);
  const openSheet = useYard(s => s.openSheet);
  if (!eq) return null;
  const items = [...eq.fixed.map(i => ({ ...i, _k: "fixed" as const })), ...eq.assigned.map(i => ({ ...i, _k: "assigned" as const }))];
  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight flex items-center gap-2"><Camera className="size-4 text-primary" /> Scan Asset (Simulator)</SheetTitle>
        <SheetDescription>Tap any asset to open its report sheet — real camera scanning coming soon.</SheetDescription>
      </SheetHeader>
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {items.map(i => (
          <button
            key={i.id}
            onClick={() => openSheet({ kind: "report-equipment-issue", vehicleId, itemId: i.id, itemKind: i._k })}
            className="w-full text-left p-2 rounded-xs border border-border bg-white hover:border-accent flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">{i.label}</div>
              <div className="font-mono text-[10px] text-muted">{i.id} · {i._k}</div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{i.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ArrivalSheet({ vehicleId: initialVehicleId }: { vehicleId?: string }) {
  const vehicles = useYard(s => s.vehicles);
  const bays = useYard(s => s.bays);
  const move = useYard(s => s.moveVehicle);
  const close = useYard(s => s.closeSheet);
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? "");
  const [bayId, setBayId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const vehicle = vehicles.find(v => v.id === vehicleId);
  const emptyParking = useMemo(() => getEmptyBaysInZone(bays, vehicles, "Parking"), [bays, vehicles]);
  const candidates = useMemo(() => {
    const offSite = vehicles.filter(v => v.status === "Off-site");
    if (offSite.length > 0) return offSite;
    return vehicles;
  }, [vehicles]);

  const submit = () => {
    if (!vehicle || !bayId) return;
    const reason = vehicle.status === "Off-site" ? "Return from off-site" as const : "Move to parking" as const;
    move(vehicle.id, bayId, reason, note || undefined);
    toast.success(yardCopy.toast.move.parked(vehicle.reg, bayId));
    close();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight flex items-center gap-2">
          <LogIn className="size-4 text-primary" /> Record Arrival
        </SheetTitle>
        <SheetDescription>Assign a parking bay for a returning or relocating vehicle.</SheetDescription>
      </SheetHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Vehicle</Label>
          <div className="grid grid-cols-1 gap-2 mt-2 max-h-[140px] overflow-y-auto">
            {candidates.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => { setVehicleId(v.id); setBayId(null); }}
                className={`flex items-center justify-between gap-2 p-2 rounded-xs border text-left ${vehicleId === v.id ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border bg-white hover:border-accent"}`}
              >
                <RegPlate reg={v.reg} tone={v.status === "VOR" ? "vor" : "default"} />
                <StatusChip status={v.status} />
              </button>
            ))}
          </div>
        </div>

        {vehicle && (
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Parking bay</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {emptyParking.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBayId(b.id)}
                  className={`px-3 py-2 rounded-xs border font-mono text-sm font-bold ${bayId === b.id ? "border-primary bg-primary text-white" : "border-border bg-white hover:border-accent"}`}
                >{b.id}</button>
              ))}
              {emptyParking.length === 0 && <p className="text-xs text-vor">No empty parking bays.</p>}
            </div>
          </div>
        )}

        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Note (optional)</Label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. returned from charter" className="mt-2" />
        </div>
      </div>

      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <PermissionGate permission="vehicle.move" fallback={<Button disabled className="flex-1 uppercase tracking-widest font-bold">No permission</Button>}>
          <Button onClick={submit} disabled={!vehicle || !bayId} className="flex-1 bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold">Confirm Arrival</Button>
        </PermissionGate>
      </SheetFooter>
    </div>
  );
}

function StageDepartureSheet({ vehicleId }: { vehicleId: string }) {
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const bays = useYard(s => s.bays);
  const vehicles = useYard(s => s.vehicles);
  const move = useYard(s => s.moveVehicle);
  const close = useYard(s => s.closeSheet);
  const [bayId, setBayId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const emptyLine = useMemo(() => getEmptyBaysInZone(bays, vehicles, "Departure Line"), [bays, vehicles]);

  if (!vehicle) return null;

  const submit = () => {
    if (!bayId) return;
    move(vehicle.id, bayId, "Move to departure line", note || undefined);
    toast.success(yardCopy.toast.move.staged(vehicle.reg, bayId));
    close();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight flex items-center gap-2">
          <LineChart className="size-4 text-primary" /> Stage to Departure Line
        </SheetTitle>
        <SheetDescription>
          <RegPlate reg={vehicle.reg} /> currently at <span className="font-mono font-bold">{vehicle.bayId}</span>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Departure bay</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {emptyLine.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBayId(b.id)}
                className={`px-3 py-2 rounded-xs border font-mono text-sm font-bold ${bayId === b.id ? "border-primary bg-primary text-white" : "border-border bg-white hover:border-accent"}`}
              >{b.id}</button>
            ))}
            {emptyLine.length === 0 && <p className="text-xs text-vor">Departure line is full.</p>}
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Note (optional)</Label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. staged for 06:15 R420" className="mt-2" />
        </div>
      </div>

      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <PermissionGate permission="vehicle.move" fallback={<Button disabled className="flex-1 uppercase tracking-widest font-bold">No permission</Button>}>
          <Button onClick={submit} disabled={!bayId} className="flex-1 bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold">Stage Vehicle</Button>
        </PermissionGate>
      </SheetFooter>
    </div>
  );
}

function DepartureReleaseSheet({ tripId }: { tripId: string }) {
  const trip = useYard(s => s.trips.find(t => t.id === tripId));
  const vehicles = useYard(s => s.vehicles);
  const equipment = useYard(s => s.equipment);
  const release = useYard(s => s.releaseForDeparture);
  const close = useYard(s => s.closeSheet);
  const [note, setNote] = useState("");

  const vehicle = trip?.vehicleId ? vehicles.find(v => v.id === trip.vehicleId) : undefined;
  const driver = trip?.driverId ? drivers.find(d => d.id === trip.driverId) : undefined;
  const items = useMemo(
    () => (trip ? buildDepartureChecklist(trip, vehicle, driver, vehicle ? equipment[vehicle.id] : undefined) : []),
    [trip, vehicle, driver, equipment],
  );
  const canRelease = trip ? canReleaseTrip(trip, items) : false;

  if (!trip) return null;

  const submit = () => {
    if (!canRelease) return;
    release(tripId, items.map(i => ({ id: i.id, label: i.label, passed: i.passed })), note || undefined);
    toast.success(yardCopy.toast.departure.released(trip.code));
    close();
  };

  return (
    <div className="p-5">
      <SheetHeader className="p-0 mb-4">
        <SheetTitle className="font-display uppercase tracking-tight flex items-center gap-2">
          <CheckCircle2 className="size-4 text-ok" /> Departure Release
        </SheetTitle>
        <SheetDescription>
          {trip.code} · {trip.service} · {trip.departAt}
          {vehicle && <> · <RegPlate reg={vehicle.reg} /></>}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-xs border ${item.passed ? "border-ok/30 bg-ok/5" : "border-vor/30 bg-vor/5"}`}
          >
            <div className={`grid size-6 place-items-center rounded-full shrink-0 ${item.passed ? "bg-ok text-white" : "bg-vor text-white"}`}>
              {item.passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider">{item.label}</div>
              {item.detail && <div className="text-[10px] text-muted mt-0.5">{item.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Label className="text-[10px] uppercase tracking-widest text-muted font-bold">Release note (optional)</Label>
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. driver briefed, keys issued" className="mt-2" />
      </div>

      <SheetFooter className="p-0 mt-6 flex-row gap-2">
        <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        <PermissionGate permission="vehicle.move" fallback={<Button disabled className="flex-1 uppercase tracking-widest font-bold">No permission</Button>}>
          <Button
            onClick={submit}
            disabled={!canRelease}
            className="flex-1 bg-ok hover:bg-ok/90 text-white uppercase tracking-widest font-bold"
          >
            Release for departure
          </Button>
        </PermissionGate>
      </SheetFooter>
    </div>
  );
}

