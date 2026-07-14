import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Camera, ClipboardList, History, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehicleIdentityHeader } from "@/components/yard/VehicleIdentityHeader";
import { BodyZoneDiagram } from "@/components/condition/BodyZoneDiagram";
import { getBodyZones } from "@/domain/condition/body-zones";
import {
  conditionSummaryText,
  formatDamageRef,
  getConditionProfile,
  inspectionsForVehicle,
  latestApprovedSnapshot,
  openDamageForVehicle,
} from "@/domain/condition/condition-helpers";
import { vehicleNeedsBaseline } from "@/domain/condition/condition-helpers";
import { useYard } from "@/store/yard";

export const Route = createFileRoute("/_app/yard/$vehicleId/condition")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.vehicleId} Condition — Veyvio Yard` },
      { name: "description", content: "Vehicle condition record: damage, inspections, evidence and history." },
    ],
  }),
  component: ConditionPage,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Vehicle not found.</p>,
});

function ConditionPage() {
  const { vehicleId } = Route.useParams();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const profiles = useYard(s => s.conditionProfiles);
  const damageRecords = useYard(s => s.damageRecords);
  const observations = useYard(s => s.damageObservations);
  const inspections = useYard(s => s.inspections);
  const snapshots = useYard(s => s.conditionSnapshots);
  const custody = useYard(s => s.custodyTimeline);

  if (!vehicle) throw notFound();

  const profile = getConditionProfile(profiles, vehicleId);
  const openDamage = useMemo(() => openDamageForVehicle(damageRecords, vehicleId), [damageRecords, vehicleId]);
  const zones = getBodyZones(vehicle.type);
  const snapshot = latestApprovedSnapshot(snapshots, vehicleId);
  const history = useMemo(() => inspectionsForVehicle(inspections, vehicleId), [inspections, vehicleId]);
  const pendingObs = observations.filter(
    o => o.vehicleId === vehicleId && ["new_not_reported", "possible_new_review"].includes(o.classification),
  );
  const vehicleCustody = custody.filter(c => c.vehicleId === vehicleId).slice(0, 6);

  const needsBaseline = vehicleNeedsBaseline(profile);

  return (
    <div className="space-y-5 animate-in-up pb-8">
      <Link to="/yard" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Yard Inventory
      </Link>

      <header className="bg-white border border-border rounded-xs p-4 space-y-3">
        <h1 className="font-display text-lg font-extrabold uppercase tracking-tight">Condition</h1>
        <VehicleIdentityHeader vehicle={vehicle} compact />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-xs border ${
            profile.conditionRating === "good" ? "text-ok border-ok/30 bg-ok/10"
            : profile.conditionRating === "fair" ? "text-warn border-warn/40 bg-warn/10"
            : "text-muted border-border"
          }`}>
            {profile.baselineStatus === "approved" ? profile.conditionRating : profile.baselineStatus.replace(/_/g, " ")}
          </span>
        </div>
        <p className="text-sm">{conditionSummaryText(vehicle, profile, openDamage)}</p>
        {needsBaseline && (
          <p className="mt-2 text-xs text-vor bg-vor/5 border border-vor/20 rounded-xs p-2">
            Onboarding baseline required before this vehicle can enter service.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/yard/$vehicleId/condition/inspect" params={{ vehicleId }}>
            <Button className="bg-primary text-white uppercase tracking-widest font-bold text-xs">
              <Camera className="size-4" /> Start inspection
            </Button>
          </Link>
          <Link to="/yard/$vehicleId/check" params={{ vehicleId }}>
            <Button variant="outline" className="uppercase tracking-widest font-bold text-xs">
              <ClipboardList className="size-4" /> Yard check
            </Button>
          </Link>
        </div>
      </header>

      {pendingObs.length > 0 && (
        <section className="bg-warn/10 border border-warn/40 rounded-xs p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-warn">
            {pendingObs.length} observation{pendingObs.length > 1 ? "s" : ""} awaiting review
          </h2>
          <Link to="/inspections/damage-review" className="text-xs text-primary hover:underline mt-1 inline-block">
            Open damage review queue →
          </Link>
        </section>
      )}

      <BodyZoneDiagram zones={zones} damageRecords={openDamage} />

      <section className="bg-white border border-border rounded-xs">
        <h2 className="p-3 border-b border-border text-xs font-extrabold uppercase tracking-widest font-display flex items-center gap-1">
          <ShieldAlert className="size-3.5" /> Known damage · {openDamage.length}
        </h2>
        {openDamage.length === 0 ? (
          <p className="p-4 text-xs text-muted">No open damage records.</p>
        ) : (
          <div className="divide-y divide-border">
            {openDamage.map(d => (
              <Link
                key={d.id}
                to="/yard/$vehicleId/condition/damage/$damageId"
                params={{ vehicleId, damageId: d.id }}
                className="block p-3 hover:bg-secondary/50 text-xs"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-mono font-bold">{formatDamageRef(d.id)}</span>
                  <span className="font-bold uppercase tracking-widest text-[10px]">{d.severity.replace("_", " ")}</span>
                </div>
                <div className="font-medium mt-0.5">{d.title}</div>
                <div className="text-muted mt-0.5">First seen {new Date(d.firstObservedAt).toLocaleDateString("en-GB")} · {d.status.replace(/_/g, " ")}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {snapshot && (
        <section className="bg-white border border-border rounded-xs p-4 text-xs">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Latest approved snapshot</h2>
          <p>{snapshot.summary}</p>
          <p className="text-muted mt-1">{new Date(snapshot.approvedAt).toLocaleString("en-GB")} · {snapshot.approvedBy}</p>
        </section>
      )}

      <section className="bg-white border border-border rounded-xs">
        <h2 className="p-3 border-b border-border text-xs font-extrabold uppercase tracking-widest font-display flex items-center gap-1">
          <History className="size-3.5" /> Inspection history
        </h2>
        {history.length === 0 ? (
          <p className="p-4 text-xs text-muted">No inspections recorded.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.slice(0, 8).map(insp => (
              <li key={insp.id} className="p-3 text-xs">
                <div className="font-bold uppercase tracking-wider">{insp.inspectionType.replace(/-/g, " ")}</div>
                <div className="text-muted">{new Date(insp.completedAt ?? insp.startedAt).toLocaleString("en-GB")} · {insp.startedBy}</div>
                {insp.checkId && <div className="text-[10px] text-muted mt-0.5">Linked yard check</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {vehicleCustody.length > 0 && (
        <section className="bg-white border border-border rounded-xs p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest font-display mb-2">Custody timeline</h2>
          <p className="text-[11px] text-muted mb-2">Who had the vehicle between inspections — narrows review, does not assign blame.</p>
          <ul className="space-y-1.5 text-xs">
            {vehicleCustody.map(c => (
              <li key={c.id} className="flex gap-2">
                <span className="font-mono text-[10px] text-muted shrink-0">{new Date(c.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
