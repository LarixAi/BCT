import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { drivers } from "@/data/fixtures";
import { SectionHeader, RegPlate } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { Button } from "@/components/ui/button";
import { getVehiclesInZone } from "@/features/yard/yard-map";
import { LineChart, CheckCircle2 } from "lucide-react";
import type { SheetKind } from "@/store/yard";

export const Route = createFileRoute("/_app/departure-line")({
  head: () => ({
    meta: [
      { title: "Departure Line — Veyvio Yard" },
      { name: "description", content: "Which vehicles are actually ready to leave the yard, and what's blocking the rest." },
    ],
  }),
  component: DepartureLine,
});

function DepartureLine() {
  const trips = useYard(s => s.trips);
  const vehicles = useYard(s => s.vehicles);
  const bays = useYard(s => s.bays);
  const openSheet = useYard(s => s.openSheet);
  const driverName = (id?: string) => drivers.find(d => d.id === id)?.name;
  const ready = trips.filter(t => t.ready);
  const blocked = trips.filter(t => !t.ready);
  const onLine = useMemo(() => getVehiclesInZone(vehicles, bays, "Departure Line"), [vehicles, bays]);

  return (
    <div className="space-y-6 animate-in-up">
      <SectionHeader title={`Departure Line · ${trips.length}`} sub={`${ready.length} ready · ${blocked.length} blocked · ${onLine.length} staged`} />

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-ok">Ready</h3>
        <div className="bg-white border border-border rounded-xs overflow-hidden">
          {ready.map(t => (
            <DepartureTripRow
              key={t.id}
              trip={t}
              vehicle={vehicles.find(v => v.id === t.vehicleId)}
              driverName={driverName(t.driverId)}
              onAction={openSheet}
              showRelease
            />
          ))}
          {ready.length === 0 && <p className="p-4 text-xs text-muted">No trips are ready.</p>}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-vor">Blocked</h3>
        <div className="bg-white border border-border rounded-xs overflow-hidden">
          {blocked.map(t => (
            <DepartureTripRow
              key={t.id}
              trip={t}
              vehicle={vehicles.find(v => v.id === t.vehicleId)}
              driverName={driverName(t.driverId)}
              onAction={openSheet}
              showStage
            />
          ))}
          {blocked.length === 0 && <p className="p-4 text-xs text-muted">Nothing blocked. Nice.</p>}
        </div>
      </section>
    </div>
  );
}

function DepartureTripRow({
  trip,
  vehicle,
  driverName,
  onAction,
  showStage = false,
  showRelease = false,
}: {
  trip: ReturnType<typeof useYard.getState>["trips"][number];
  vehicle?: ReturnType<typeof useYard.getState>["vehicles"][number];
  driverName?: string;
  onAction: (sheet: Exclude<SheetKind, null>) => void;
  showStage?: boolean;
  showRelease?: boolean;
}) {
  const needsStaging = vehicle && vehicle.status !== "On Departure Line";
  const ready = trip.ready;
  const released = !!trip.releasedAt;

  return (
    <div className={`grid grid-cols-[92px_1fr_auto] items-center gap-2 p-3 border-b border-border last:border-b-0 ${ready ? "bg-ok/5" : ""}`}>
      <RegPlate reg={vehicle?.reg ?? "—"} tone={vehicle?.status === "VOR" ? "vor" : "default"} />
      <div className="flex flex-col min-w-0 px-1">
        <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{trip.code} — {trip.service}</span>
        <span className="text-xs font-semibold truncate">
          {trip.departAt} · Driver: <span className={driverName ? "" : "text-vor"}>{driverName ?? "UNASSIGNED"}</span>
        </span>
        {!ready && (
          <span className="text-[9px] text-vor/80 leading-tight italic truncate">{trip.blockers.join(" · ")}</span>
        )}
        {released && trip.releasedBy && (
          <span className="text-[9px] text-ok font-bold uppercase tracking-widest mt-0.5">Released by {trip.releasedBy}</span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {released ? (
          <span className="text-[10px] font-bold text-ok uppercase tracking-widest">Released</span>
        ) : ready ? (
          <span className="text-[10px] font-bold text-ok uppercase tracking-widest">Ready</span>
        ) : (
          <span className="text-[10px] font-bold text-vor uppercase tracking-widest">Blocked</span>
        )}
        {showRelease && ready && !released && (
          <PermissionGate permission="vehicle.move">
            <Button
              size="sm"
              onClick={() => onAction({ kind: "departure-release", tripId: trip.id })}
              className="text-[9px] uppercase tracking-widest font-bold h-7 px-2 bg-ok hover:bg-ok/90 text-white"
            >
              <CheckCircle2 className="size-3 mr-1" /> Release
            </Button>
          </PermissionGate>
        )}
        {showStage && needsStaging && vehicle && (
          <PermissionGate permission="vehicle.move">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction({ kind: "stage-departure", vehicleId: vehicle.id })}
              className="text-[9px] uppercase tracking-widest font-bold h-7 px-2"
            >
              <LineChart className="size-3 mr-1" /> Stage
            </Button>
          </PermissionGate>
        )}
      </div>
    </div>
  );
}
