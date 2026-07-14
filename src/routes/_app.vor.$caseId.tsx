import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { VehicleIdentityHeader } from "@/components/yard/VehicleIdentityHeader";
import { Button } from "@/components/ui/button";
import { ReturnToServiceGate } from "@/components/condition/ReturnToServiceGate";
import { canReturnToService, getReturnToServiceBlockers } from "@/domain/condition/return-to-service-gate";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_app/vor/$caseId")({
  head: ({ params }) => ({
    meta: [
      { title: `VOR ${params.caseId} — Veyvio Yard` },
      { name: "description", content: "VOR case detail with lifecycle history." },
    ],
  }),
  component: VorDetail,
  notFoundComponent: () => <p className="p-8 text-center text-muted">VOR case not found.</p>,
  errorComponent: ({ error }) => <p className="p-8 text-center text-vor">{error.message}</p>,
});

function VorDetail() {
  const { caseId } = Route.useParams();
  const vor = useYard(s => s.vorCases.find(c => c.id === caseId));
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vor?.vehicleId));
  const defects = useYard(s => s.defects);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const damageRecords = useYard(s => s.damageRecords);
  const openSheet = useYard(s => s.openSheet);

  const rtsBlockers = useMemo(
    () => vor ? getReturnToServiceBlockers(vor.vehicleId, defects, repairOrders, damageRecords) : [],
    [vor, defects, repairOrders, damageRecords],
  );

  if (!vor) throw notFound();

  return (
    <div className="space-y-4 animate-in-up">
      <Link to="/vor" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> VOR Board
      </Link>

      <header className="bg-white border-l-4 border-l-vor border border-border p-4 rounded-xs space-y-3">
        {vehicle ? (
          <VehicleIdentityHeader vehicle={vehicle} compact />
        ) : null}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <span className="font-mono text-xs text-muted">{vor.id}</span>
          <span className="px-2 py-0.5 bg-vor text-white text-[10px] font-bold uppercase rounded-sm tracking-widest">{vor.lifecycle}</span>
        </div>
        <p className="mt-3 text-sm font-medium">{vor.reason}</p>
        <div className="mt-3 text-[10px] uppercase tracking-widest text-muted font-bold">
          Opened {new Date(vor.openedAt).toLocaleString("en-GB")}
        </div>
      </header>

      <Button onClick={() => openSheet({ kind: "vor", caseId: vor.id })} className="w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold text-xs">
        <ShieldAlert className="size-4" /> Advance Lifecycle
      </Button>

      {vor.lifecycle !== "Cleared" && vehicle && (
        <section className="space-y-2">
          <ReturnToServiceGate blockers={rtsBlockers} vehicleId={vehicle.id} />
          {canReturnToService(rtsBlockers) && (
            <Link to="/yard/$vehicleId/check" params={{ vehicleId: vehicle.id }} search={{ type: "return-to-service" }}>
              <Button className="w-full bg-ok hover:bg-ok/90 text-white uppercase tracking-widest font-bold text-xs">
                Start return-to-service check
              </Button>
            </Link>
          )}
        </section>
      )}

      <section className="bg-white border border-border p-4 rounded-xs">
        <h3 className="text-xs font-extrabold uppercase tracking-widest font-display mb-3">Audit History</h3>
        <ol className="space-y-3">
          {vor.history.map((h, i) => (
            <li key={i} className="flex gap-3 text-xs">
              <div className="size-2 rounded-full bg-vor mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="font-bold uppercase tracking-widest text-[10px]">
                  {h.from ? `${h.from} → ` : ""}{h.to}
                </div>
                <div className="text-muted">{h.by} · {new Date(h.at).toLocaleString("en-GB")}</div>
                {h.note && <div className="mt-1">{h.note}</div>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
