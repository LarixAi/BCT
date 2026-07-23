import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useYard } from "@/store/yard";
import { drivers } from "@/data/fixtures";
import { SectionHeader, RegPlate } from "@/components/yard/primitives";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { Button } from "@/components/ui/button";
import { getVehiclesInZone } from "@/features/yard/yard-map";
import { canConfirmYardDeparture } from "@/domain/yard/departure-exit";
import { yardCopy } from "@/copy/yard-messages";
import { LineChart, CheckCircle2, LogOut } from "lucide-react";
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
  const departVehicleForService = useYard(s => s.departVehicleForService);
  const driverName = (id?: string) => drivers.find(d => d.id === id)?.name;

  const departed = trips.filter(t => !!t.departedAt);
  const ready = trips.filter(t => t.ready && !t.departedAt);
  const blocked = trips.filter(t => !t.ready && !t.departedAt);
  const onLine = useMemo(() => getVehiclesInZone(vehicles, bays, "Departure Line"), [vehicles, bays]);

  function confirmLeft(tripId: string, tripCode: string) {
    const ok = departVehicleForService(tripId, "yard_confirmed");
    if (ok) {
      toast.success(yardCopy.toast.departure.leftDepot(tripCode));
    }
  }

  return (
    <div className="space-y-6 animate-in-up">
      <SectionHeader
        title={`Departure Line · ${trips.length}`}
        sub={`${ready.length} ready · ${blocked.length} blocked · ${departed.length} departed · ${onLine.length} staged`}
        action={
          <Link to="/plan" className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Day plan →
          </Link>
        }
      />

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-ok">Ready</h3>
        <div className="bg-white border border-border rounded overflow-hidden">
          {ready.map(t => (
            <DepartureTripRow
              key={t.id}
              trip={t}
              vehicle={vehicles.find(v => v.id === t.vehicleId)}
              driverName={driverName(t.driverId)}
              onAction={openSheet}
              onConfirmLeft={() => confirmLeft(t.id, t.code)}
              showRelease
              showConfirmLeft
            />
          ))}
          {ready.length === 0 && <p className="p-4 text-xs text-muted">No trips are ready.</p>}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-vor">Blocked</h3>
        <div className="bg-white border border-border rounded overflow-hidden">
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
          {blocked.length === 0 && <p className="p-4 text-xs text-muted">Nothing blocked.</p>}
        </div>
      </section>

      {departed.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Departed</h3>
          <div className="bg-white border border-border rounded overflow-hidden">
            {departed.map(t => (
              <DepartureTripRow
                key={t.id}
                trip={t}
                vehicle={vehicles.find(v => v.id === t.vehicleId)}
                driverName={driverName(t.driverId)}
                onAction={openSheet}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DepartureTripRow({
  trip,
  vehicle,
  driverName,
  onAction,
  onConfirmLeft,
  showStage = false,
  showRelease = false,
  showConfirmLeft = false,
}: {
  trip: ReturnType<typeof useYard.getState>["trips"][number];
  vehicle?: ReturnType<typeof useYard.getState>["vehicles"][number];
  driverName?: string;
  onAction: (sheet: Exclude<SheetKind, null>) => void;
  onConfirmLeft?: () => void;
  showStage?: boolean;
  showRelease?: boolean;
  showConfirmLeft?: boolean;
}) {
  const needsStaging = vehicle && vehicle.status !== "On Departure Line" && vehicle.status !== "Off-site";
  const ready = trip.ready;
  const released = !!trip.releasedAt;
  const departed = !!trip.departedAt;
  const canConfirmLeft = showConfirmLeft && canConfirmYardDeparture(trip, vehicle);

  return (
    <div className={`grid grid-cols-[92px_1fr_auto] items-center gap-2 p-3 border-b border-border last:border-b-0 ${ready && !departed ? "bg-ok/5" : ""}`}>
      <RegPlate reg={vehicle?.reg ?? "—"} tone={vehicle?.status === "VOR" ? "vor" : "default"} />
      <div className="flex flex-col min-w-0 px-1">
        <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{trip.code} — {trip.service}</span>
        <span className="text-xs font-semibold truncate">
          {trip.departAt} · Driver: <span className={driverName ? "" : "text-vor"}>{driverName ?? "UNASSIGNED"}</span>
        </span>
        {!ready && !departed && (
          <span className="text-[9px] text-vor/80 leading-tight italic truncate">{trip.blockers.join(" · ")}</span>
        )}
        {released && !departed && trip.releasedBy && (
          <span className="text-[9px] text-ok font-bold uppercase tracking-widest mt-0.5">Released by {trip.releasedBy}</span>
        )}
        {departed && (
          <span className="text-[9px] text-muted font-bold uppercase tracking-widest mt-0.5">
            Left depot · bay freed
            {trip.departureSource === "driver_journey_start" ? " · Driver journey" : " · Yard confirmed"}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {departed ? (
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Departed</span>
        ) : released ? (
          <span className="text-[10px] font-bold text-ok uppercase tracking-widest">Released</span>
        ) : ready ? (
          <span className="text-[10px] font-bold text-ok uppercase tracking-widest">Ready</span>
        ) : (
          <span className="text-[10px] font-bold text-vor uppercase tracking-widest">Blocked</span>
        )}
        {showRelease && ready && !released && !departed && (
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
        {canConfirmLeft && (
          <PermissionGate permission="vehicle.move">
            <Button
              size="sm"
              variant="outline"
              onClick={onConfirmLeft}
              className="text-[9px] uppercase tracking-widest font-bold h-7 px-2 border-primary text-primary"
            >
              <LogOut className="size-3 mr-1" /> Confirm left
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
