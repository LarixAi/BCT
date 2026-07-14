import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";
import { useYard } from "@/store/yard";
import { canResolveDefect } from "@/domain/yard/defect-workflow";
import { canCompleteRepair, canStartRepair, canVerifyRepair } from "@/domain/condition/repair-workflow";
import { RegPlate } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CircleCheck, ShieldAlert, Wrench } from "lucide-react";

export const Route = createFileRoute("/_app/defects/$defectId")({
  head: ({ params }) => ({
    meta: [
      { title: `Defect ${params.defectId} — Veyvio Yard` },
      { name: "description", content: "Defect detail with escalation to VOR." },
    ],
  }),
  component: DefectDetail,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Defect not found.</p>,
  errorComponent: ({ error }) => <p className="p-8 text-center text-vor">{error.message}</p>,
});

function DefectDetail() {
  const { defectId } = Route.useParams();
  const defect = useYard(s => s.defects.find(d => d.id === defectId));
  const vehicle = useYard(s => s.vehicles.find(v => v.id === defect?.vehicleId));
  const vorCase = useYard(s => s.vorCases.find(c => c.id === defect?.vorCaseId));
  const raiseVor = useYard(s => s.raiseVorFromDefect);
  const resolveDefect = useYard(s => s.resolveDefect);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const startRepair = useYard(s => s.startRepairWorkOrder);
  const completeRepair = useYard(s => s.completeRepairWorkOrder);
  const requestRepair = useYard(s => s.requestRepair);
  const openSheet = useYard(s => s.openSheet);
  const [note, setNote] = useState("");

  const linkedRepairs = useMemo(
    () => repairOrders.filter(r => r.defectId === defectId),
    [repairOrders, defectId],
  );

  if (!defect) throw notFound();

  const resolveCheck = canResolveDefect(defect, vorCase);

  const handleResolve = () => {
    const resolved = resolveDefect(defect.id, note);
    if (!resolved) {
      toast.error(resolveCheck.reason ?? yardCopy.toast.defect.couldNotResolve("Could not resolve defect"));
      return;
    }
    toast.success(yardCopy.toast.defect.resolved);
    setNote("");
  };

  return (
    <div className="space-y-4 animate-in-up">
      <Link to="/defects" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> All Defects
      </Link>

      <div className="bg-white border border-border p-4 rounded-xs">
        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
          <div className="flex items-center gap-2">
            {vehicle && <RegPlate reg={vehicle.reg} tone={vehicle.status === "VOR" ? "vor" : "default"} />}
            <span className="text-xs font-bold uppercase tracking-wider">{defect.category}</span>
          </div>
          <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-sm tracking-widest ${defect.severity === "Safety-critical" ? "bg-vor text-white" : defect.severity === "Major" ? "bg-warn text-black" : "bg-secondary"}`}>{defect.severity}</span>
        </div>
        <p className="text-sm">{defect.notes}</p>
        {defect.photoUrls && defect.photoUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {defect.photoUrls.map((src, i) => (
              <img key={i} src={src} alt={`Defect photo ${i + 1}`} className="size-20 rounded-xs border border-border object-cover" />
            ))}
          </div>
        )}
        <div className="mt-3 text-[10px] uppercase tracking-widest text-muted font-bold">
          Raised by {defect.raisedBy} · {new Date(defect.raisedAt).toLocaleString("en-GB")}
        </div>
        {defect.auditFinding && (
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-warn">
            Found during manager spot audit — not reported on driver walkaround
          </p>
        )}
        {defect.sourceCheckId && (
          <Link to="/checks/$checkId" params={{ checkId: defect.sourceCheckId }} className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
            View audit check record →
          </Link>
        )}
      </div>

      {defect.resolved && (
        <div className="bg-ok/10 border border-ok/30 p-4 rounded-xs">
          <div className="text-[10px] uppercase tracking-widest text-ok font-bold flex items-center gap-1">
            <CircleCheck className="size-3.5" /> Resolved
          </div>
          <p className="mt-2 text-sm">
            {defect.resolutionNote ?? "No resolution note recorded."}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-muted font-bold">
            {defect.resolvedBy} · {defect.resolvedAt ? new Date(defect.resolvedAt).toLocaleString("en-GB") : "—"}
          </p>
        </div>
      )}

      {!defect.resolved && defect.vorCaseId && (
        <Link to="/vor/$caseId" params={{ caseId: defect.vorCaseId }} className="block bg-vor/5 border border-vor/30 p-4 rounded-xs">
          <span className="text-[10px] uppercase tracking-widest text-vor font-bold flex items-center gap-1">
            <ShieldAlert className="size-3.5" /> VOR case open · {defect.vorCaseId} →
          </span>
          {vorCase && (
            <span className="mt-1 block text-xs text-muted">Lifecycle: {vorCase.lifecycle}</span>
          )}
        </Link>
      )}

      {!defect.resolved && (
        <section className="bg-white border border-border rounded-xs p-4 space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-widest font-display flex items-center gap-1">
            <Wrench className="size-3.5" /> Repair work orders
          </h3>
          {linkedRepairs.length === 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs uppercase tracking-widest font-bold"
              onClick={() => {
                if (!vehicle) return;
                requestRepair({
                  vehicleId: vehicle.id,
                  defectId: defect.id,
                  description: `Repair: ${defect.category} — ${defect.notes.slice(0, 60)}`,
                  assignedTo: "Workshop S02",
                });
                toast.success(yardCopy.toast.defect.repairOrderRaised);
              }}
            >
              Request repair
            </Button>
          ) : (
            linkedRepairs.map(r => (
              <div key={r.id} className="text-xs border border-border rounded-xs p-2 space-y-2">
                <div className="font-bold">{r.description}</div>
                <div className="text-muted">{r.status.replace(/_/g, " ")}</div>
                {canStartRepair(r) && (
                  <Button type="button" size="sm" variant="outline" onClick={() => { startRepair(r.id); toast.success(yardCopy.toast.defect.repairStarted); }}>
                    Start repair
                  </Button>
                )}
                {canCompleteRepair(r) && (
                  <Button type="button" size="sm" onClick={() => { completeRepair(r.id); toast.success(yardCopy.toast.defect.awaitingVerification); }}>
                    Workshop complete
                  </Button>
                )}
                {canVerifyRepair(r) && vehicle && (
                  <Link to="/yard/$vehicleId/condition/inspect" params={{ vehicleId: vehicle.id }} search={{ type: "post-repair", repairOrderId: r.id }}>
                    <Button type="button" size="sm" className="w-full text-[10px] uppercase tracking-widest">Verify repair</Button>
                  </Link>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {!defect.resolved && !defect.vorCaseId && (
        <Button
          onClick={() => { const vc = raiseVor(defect.id); openSheet({ kind: "vor", caseId: vc.id }); }}
          className="w-full bg-vor hover:bg-vor/90 text-white uppercase tracking-widest font-bold text-xs"
        >
          <ShieldAlert className="size-4" /> Raise VOR Case
        </Button>
      )}

      {!defect.resolved && (
        <PermissionGate permission="defect.resolve">
          <section className="bg-white border border-border p-4 rounded-xs space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest font-display">Resolve defect</h2>
            {!resolveCheck.ok ? (
              <p className="text-xs text-muted">{resolveCheck.reason}</p>
            ) : (
              <>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="What was done to fix this? (optional)"
                  rows={3}
                />
                <Button
                  onClick={handleResolve}
                  className="w-full bg-ok hover:bg-ok/90 text-white uppercase tracking-widest font-bold text-xs"
                >
                  <CircleCheck className="size-4" /> Mark resolved
                </Button>
              </>
            )}
          </section>
        </PermissionGate>
      )}
    </div>
  );
}
