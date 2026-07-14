import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { SectionHeader, RegPlate, StatusChip } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { Button } from "@/components/ui/button";
import { getEmptyBaysInZone, recentArrivals } from "@/features/yard/yard-map";
import { ArrowLeft, LogIn } from "lucide-react";

export const Route = createFileRoute("/_app/arrivals")({
  head: () => ({
    meta: [
      { title: "Arrivals — Veyvio Yard" },
      { name: "description", content: "Record vehicle arrivals and assign parking bays." },
    ],
  }),
  component: ArrivalsPage,
});

function ArrivalsPage() {
  const vehicles = useYard(s => s.vehicles);
  const bays = useYard(s => s.bays);
  const movements = useYard(s => s.movements);
  const openSheet = useYard(s => s.openSheet);

  const offSite = useMemo(() => vehicles.filter(v => v.status === "Off-site"), [vehicles]);
  const emptyParking = useMemo(() => getEmptyBaysInZone(bays, vehicles, "Parking"), [bays, vehicles]);
  const recent = useMemo(() => recentArrivals(movements), [movements]);

  return (
    <div className="space-y-5 animate-in-up pb-4">
      <Link to="/" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Home
      </Link>

      <SectionHeader title="Arrivals" sub="returning vehicles" />

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-border rounded-xs p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Off-site</div>
          <div className="text-2xl font-display font-extrabold tabular-nums">{offSite.length}</div>
        </div>
        <div className="bg-white border border-border rounded-xs p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Empty bays</div>
          <div className="text-2xl font-display font-extrabold tabular-nums text-ok">{emptyParking.length}</div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Awaiting arrival</h2>
        {offSite.length === 0 ? (
          <p className="text-sm text-muted border border-dashed border-border rounded-xs p-6 text-center">
            No off-site vehicles. All fleet accounted for on depot.
          </p>
        ) : (
          <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
            {offSite.map(v => (
              <div key={v.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <RegPlate reg={v.reg} />
                  <StatusChip status={v.status} />
                </div>
                <PermissionGate permission="vehicle.move">
                  <Button
                    size="sm"
                    onClick={() => openSheet({ kind: "arrival", vehicleId: v.id })}
                    className="bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold text-[10px] shrink-0"
                  >
                    <LogIn className="size-3 mr-1" /> Record
                  </Button>
                </PermissionGate>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">Other arrivals</h2>
          <PermissionGate permission="vehicle.move">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openSheet({ kind: "arrival" })}
              className="text-[10px] uppercase tracking-widest font-bold"
            >
              Park any vehicle
            </Button>
          </PermissionGate>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Recent</h2>
          <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
            {recent.map(m => {
              const v = vehicles.find(x => x.id === m.vehicleId);
              return (
                <div key={m.id} className="p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <RegPlate reg={v?.reg ?? "—"} />
                    <span className="font-mono text-muted">{m.toBayId}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted">
                    {m.by} · {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
