import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { VehicleIdentityHeader } from "@/components/yard/VehicleIdentityHeader";
import { PermissionGate } from "@/components/yard/PermissionGate";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck, MoveRight, Search, TriangleAlert, MapPin, ShieldAlert, Fuel, Clock } from "lucide-react";
import { drivers } from "@/data/fixtures";
import { useCan } from "@/platform/permissions/use-can";

export const Route = createFileRoute("/_app/yard/$vehicleId/")({
  head: ({ params }) => ({
    meta: [
      { title: `Vehicle ${params.vehicleId} — Veyvio Yard` },
      { name: "description", content: "Vehicle detail: status, defects, movement history and yard actions." },
    ],
  }),
  component: VehicleDetail,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Vehicle not found.</p>,
  errorComponent: ({ error }) => <p className="p-8 text-center text-vor">{error.message}</p>,
});

function VehicleDetail() {
  const { vehicleId } = Route.useParams();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const allDefects = useYard(s => s.defects);
  const allMovements = useYard(s => s.movements);
  const allVorCases = useYard(s => s.vorCases);
  const defects = useMemo(() => allDefects.filter(d => d.vehicleId === vehicleId && !d.resolved), [allDefects, vehicleId]);
  const movements = useMemo(() => allMovements.filter(m => m.vehicleId === vehicleId), [allMovements, vehicleId]);
  const vorCases = useMemo(() => allVorCases.filter(c => c.vehicleId === vehicleId), [allVorCases, vehicleId]);
  const trip = useYard(s => s.trips.find(t => t.vehicleId === vehicleId));
  const openSheet = useYard(s => s.openSheet);
  const canSpotAudit = useCan("check.spot_audit");

  if (!vehicle) throw notFound();

  const driverName = drivers.find(d => d.id === trip?.driverId)?.name;
  const isVor = vehicle.status === "VOR";

  return (
    <div className="space-y-5 animate-in-up">
      <Link to="/yard" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Vehicles
      </Link>

      <header className={`bg-white border rounded-xs p-4 ${isVor ? "border-l-4 border-l-vor border-border" : "border-border"}`}>
        <VehicleIdentityHeader vehicle={vehicle} trip={trip} />
        {vehicle.notes && <p className="mt-3 text-sm font-medium text-vor">⚠ {vehicle.notes}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1"><Fuel className="size-3" />{vehicle.fuelPct}% fuel</span>
          {vehicle.lastCheckAt && (
            <span className="inline-flex items-center gap-1"><Clock className="size-3" />Last check {formatTime(vehicle.lastCheckAt)}</span>
          )}
        </div>

        <div className={`mt-4 grid gap-2 ${canSpotAudit ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
          <PermissionGate permission="check.complete">
            <Link to="/yard/$vehicleId/check" params={{ vehicleId: vehicle.id }} className="contents">
              <Button className="w-full bg-accent hover:bg-accent/90 text-white uppercase tracking-widest font-bold text-xs">
                <ClipboardCheck className="size-4" /> Check
              </Button>
            </Link>
          </PermissionGate>
          {canSpotAudit && (
            <Link to="/yard/$vehicleId/check" params={{ vehicleId: vehicle.id }} search={{ type: "yard-spot" }} className="contents">
              <Button className="w-full bg-warn hover:bg-warn/90 text-black uppercase tracking-widest font-bold text-xs">
                <Search className="size-4" /> Audit
              </Button>
            </Link>
          )}
          <PermissionGate permission="vehicle.move">
            <Button onClick={() => openSheet({ kind: "move", vehicleId: vehicle.id })} className="bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold text-xs">
              <MoveRight className="size-4" /> Move
            </Button>
          </PermissionGate>
          <Button onClick={() => openSheet({ kind: "defect", vehicleId: vehicle.id })} className="bg-vor hover:bg-vor/90 text-white uppercase tracking-widest font-bold text-xs">
            <TriangleAlert className="size-4" /> Defect
          </Button>
        </div>
      </header>

      {trip && (
        <section className="bg-white border border-border rounded-xs p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest font-display mb-2">Assigned Trip</h3>
          <div className="flex items-center justify-between text-xs">
            <div>
              <div className="font-bold">{trip.code} — {trip.service}</div>
              <div className="text-muted">Depart {trip.departAt} · Driver {driverName ?? <span className="text-vor">UNASSIGNED</span>}</div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${trip.ready ? "text-ok" : "text-vor"}`}>{trip.ready ? "Ready" : trip.blockers.join(" · ")}</span>
          </div>
        </section>
      )}

      {vorCases.length > 0 && (
        <section className="bg-white border border-vor/30 rounded-xs p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-widest font-display text-vor mb-2 flex items-center gap-1"><ShieldAlert className="size-3.5" /> VOR Cases</h3>
          <div className="space-y-2">
            {vorCases.map(c => (
              <Link key={c.id} to="/vor/$caseId" params={{ caseId: c.id }} className="flex items-center justify-between text-xs border border-border p-2 rounded-xs hover:bg-secondary/50">
                <span className="font-mono">{c.id}</span>
                <span className="font-bold uppercase tracking-widest text-vor">{c.lifecycle}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white border border-border rounded-xs p-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest font-display mb-2">Open Defects · {defects.length}</h3>
        {defects.length === 0 ? (
          <p className="text-xs text-muted">No defects recorded.</p>
        ) : (
          <div className="space-y-2">
            {defects.map(d => (
              <Link key={d.id} to="/defects/$defectId" params={{ defectId: d.id }} className="block border border-border p-2 rounded-xs hover:bg-secondary/50">
                <div className="flex justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider">{d.category}</span>
                  <SevBadge sev={d.severity} />
                </div>
                <p className="text-xs text-muted mt-1">{d.notes}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border border-border rounded-xs p-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest font-display mb-2">Movement History</h3>
        {movements.length === 0 ? (
          <p className="text-xs text-muted">No movements recorded.</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {movements.slice(0, 8).map(m => (
              <li key={m.id} className="flex items-center gap-2">
                <MapPin className="size-3 text-muted shrink-0" />
                <span className="font-mono text-[11px]">{m.fromBayId} → {m.toBayId}</span>
                <span className="text-muted">·</span>
                <span className="text-muted">{m.reason}</span>
                <span className="text-muted ml-auto">{formatTime(m.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SevBadge({ sev }: { sev: string }) {
  const cls = sev === "Safety-critical" ? "bg-vor text-white" : sev === "Major" ? "bg-warn text-black" : "bg-secondary text-foreground";
  return <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-sm tracking-widest ${cls}`}>{sev}</span>;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
