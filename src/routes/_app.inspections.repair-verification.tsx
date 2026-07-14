import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useYard } from "@/store/yard";
import { RegPlate, SectionHeader } from "@/components/yard/primitives";
import { ordersAwaitingVerification } from "@/domain/condition/repair-workflow";
import { formatDamageRef } from "@/domain/condition/condition-helpers";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

export const Route = createFileRoute("/_app/inspections/repair-verification")({
  head: () => ({
    meta: [{ title: "Repair Verification — Veyvio Yard" }],
  }),
  component: RepairVerificationQueue,
});

function RepairVerificationQueue() {
  const vehicles = useYard(s => s.vehicles);
  const repairOrders = useYard(s => s.repairWorkOrders);
  const damageRecords = useYard(s => s.damageRecords);

  const queue = useMemo(() => ordersAwaitingVerification(repairOrders), [repairOrders]);

  return (
    <div className="space-y-5 animate-in-up pb-8">
      <Link to="/inspections" className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        ← Inspections
      </Link>
      <SectionHeader title={`Post-repair verification · ${queue.length}`} />

      {queue.length === 0 ? (
        <p className="text-xs text-muted bg-white border border-border rounded-xs p-6 text-center">
          No repairs awaiting Yard verification.
        </p>
      ) : (
        <div className="space-y-3">
          {queue.map(order => {
            const vehicle = vehicles.find(v => v.id === order.vehicleId);
            const damage = order.damageId ? damageRecords.find(d => d.id === order.damageId) : undefined;
            return (
              <div key={order.id} className="bg-white border border-border rounded-xs p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  {vehicle && <RegPlate reg={vehicle.reg} />}
                  <span className="text-[10px] font-mono text-muted">{order.id}</span>
                </div>
                <div className="text-sm font-bold">{order.description}</div>
                <div className="text-xs text-muted">
                  Workshop complete {order.completedAt ? new Date(order.completedAt).toLocaleString("en-GB") : "—"}
                  {order.assignedTo && ` · ${order.assignedTo}`}
                </div>
                {damage && (
                  <div className="text-xs">
                    Linked damage: <span className="font-mono font-bold">{formatDamageRef(damage.id)}</span> — {damage.title}
                  </div>
                )}
                <Link
                  to="/yard/$vehicleId/condition/inspect"
                  params={{ vehicleId: order.vehicleId }}
                  search={{ type: "post-repair", repairOrderId: order.id }}
                >
                  <Button className="w-full text-xs uppercase tracking-widest font-bold">
                    <Wrench className="size-3.5 mr-2" /> Start verification inspection
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
