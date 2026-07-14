import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Wrench } from "lucide-react";
import { RegPlate } from "@/components/yard/primitives";
import { Button } from "@/components/ui/button";
import { getBodyZone } from "@/domain/condition/body-zones";
import { canCompleteRepair, canStartRepair, canVerifyRepair } from "@/domain/condition/repair-workflow";
import { formatDamageRef } from "@/domain/condition/condition-helpers";
import { OBSERVATION_LABELS } from "@/types/condition";
import { useYard } from "@/store/yard";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_app/yard/$vehicleId/condition/damage/$damageId")({
  component: DamageDetailPage,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Damage record not found.</p>,
});

function DamageDetailPage() {
  const { vehicleId, damageId } = Route.useParams();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const record = useYard(s => s.damageRecords.find(d => d.id === damageId));
  const observations = useYard(s => s.damageObservations);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const requestRepair = useYard(s => s.requestRepair);
  const startRepair = useYard(s => s.startRepairWorkOrder);
  const completeRepair = useYard(s => s.completeRepairWorkOrder);
  const relatedRepairs = useMemo(
    () => repairOrders.filter(r => r.damageId === damageId || r.defectId === record?.defectId),
    [repairOrders, damageId, record?.defectId],
  );
  const relatedObs = useMemo(
    () => observations.filter(o => o.damageId === damageId || (o.vehicleId === vehicleId && o.zoneId === record?.zoneId)),
    [observations, damageId, vehicleId, record],
  );

  if (!vehicle || !record) throw notFound();
  const zone = getBodyZone(vehicle.type, record.zoneId);

  return (
    <div className="space-y-4 animate-in-up pb-8">
      <Link to="/yard/$vehicleId/condition" params={{ vehicleId }} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Condition
      </Link>
      <header className="bg-white border border-border rounded-xs p-4">
        <div className="font-mono font-bold text-sm">{formatDamageRef(record.id)}</div>
        <RegPlate reg={vehicle.reg} className="mt-1" />
        <h1 className="mt-2 font-display text-lg font-extrabold uppercase tracking-tight">{record.title}</h1>
        <p className="text-xs text-muted mt-1">{zone?.label ?? record.zoneId}</p>
        <dl className="grid grid-cols-2 gap-2 mt-4 text-xs">
          <div><dt className="text-[10px] font-bold uppercase text-muted">Severity</dt><dd className="font-medium">{record.severity}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase text-muted">Status</dt><dd className="font-medium">{record.status.replace(/_/g, " ")}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase text-muted">First seen</dt><dd>{new Date(record.firstObservedAt).toLocaleString("en-GB")}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase text-muted">Last confirmed</dt><dd>{new Date(record.lastConfirmedAt).toLocaleString("en-GB")}</dd></div>
        </dl>
        {record.description && <p className="mt-3 text-sm">{record.description}</p>}
      </header>

      <section className="bg-white border border-border rounded-xs">
        <h2 className="p-3 border-b border-border text-xs font-extrabold uppercase tracking-widest font-display">
          Observation history · {relatedObs.length}
        </h2>
        <ul className="divide-y divide-border">
          {relatedObs.map(o => (
            <li key={o.id} className="p-3 text-xs space-y-1">
              <div className="font-bold">{OBSERVATION_LABELS[o.classification]}</div>
              <div className="text-muted">{new Date(o.observedAt).toLocaleString("en-GB")} · {o.reportedBy} · {o.reportSource.replace(/_/g, " ")}</div>
              {o.description && <p>{o.description}</p>}
            </li>
          ))}
        </ul>
      </section>

      {relatedRepairs.length > 0 && (
        <section className="bg-white border border-border rounded-xs">
          <h2 className="p-3 border-b border-border text-xs font-extrabold uppercase tracking-widest font-display flex items-center gap-1">
            <Wrench className="size-3.5" /> Repair work orders · {relatedRepairs.length}
          </h2>
          <ul className="divide-y divide-border">
            {relatedRepairs.map(r => (
              <li key={r.id} className="p-3 text-xs space-y-2">
                <div className="font-bold">{r.description}</div>
                <div className="text-muted">{r.status.replace(/_/g, " ")} · {r.assignedTo ?? "Unassigned"}</div>
                <div className="text-[10px] text-muted">
                  Requested {new Date(r.requestedAt).toLocaleString("en-GB")} by {r.requestedBy}
                </div>
                {canStartRepair(r) && (
                  <Button type="button" size="sm" variant="outline" className="text-[10px] uppercase tracking-widest" onClick={() => { startRepair(r.id); toast.success(yardCopy.toast.defect.repairStarted); }}>
                    Start repair
                  </Button>
                )}
                {canCompleteRepair(r) && (
                  <Button type="button" size="sm" className="text-[10px] uppercase tracking-widest" onClick={() => { completeRepair(r.id); toast.success(yardCopy.toast.defect.awaitingVerification); }}>
                    Workshop complete
                  </Button>
                )}
                {canVerifyRepair(r) && (
                  <Link to="/yard/$vehicleId/condition/inspect" params={{ vehicleId }} search={{ type: "post-repair", repairOrderId: r.id }}>
                    <Button type="button" size="sm" className="w-full text-[10px] uppercase tracking-widest bg-primary">
                      Start verification inspection
                    </Button>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {record.status === "repair_required" && relatedRepairs.length === 0 && (
        <Button
          type="button"
          className="w-full text-xs uppercase tracking-widest font-bold"
          onClick={() => {
            requestRepair({
              vehicleId,
              damageId,
              description: `Repair: ${record.title}`,
              assignedTo: "Workshop S02",
            });
            toast.success(yardCopy.toast.defect.repairOrderRaised);
          }}
        >
          <Wrench className="size-3.5 mr-2" /> Request repair
        </Button>
      )}

      <Link
        to="/yard/$vehicleId/condition/compare"
        params={{ vehicleId }}
        search={{ damageId }}
        className="block text-center text-xs font-bold uppercase tracking-widest text-primary hover:underline"
      >
        Compare evidence →
      </Link>
    </div>
  );
}
