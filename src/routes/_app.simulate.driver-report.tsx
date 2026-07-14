import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionHeader } from "@/components/yard/primitives";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { drivers } from "@/data/fixtures";
import { getBodyZones } from "@/domain/condition/body-zones";
import type { DamageSeverity, DamageType } from "@/types/condition";
import { useYard } from "@/store/yard";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_app/simulate/driver-report")({
  head: () => ({
    meta: [{ title: "Simulate Driver Report — Veyvio Yard" }],
  }),
  component: SimulateDriverReport,
});

const DAMAGE_TYPES: DamageType[] = ["scratch", "scuff", "dent", "glass_damage", "broken_light", "impact_damage", "other"];
const SEVERITIES: DamageSeverity[] = ["cosmetic", "operational", "safety_critical"];

function SimulateDriverReport() {
  const vehicles = useYard(s => s.vehicles);
  const trips = useYard(s => s.trips);
  const reportDamage = useYard(s => s.reportDamageObservation);

  const onDuty = useMemo(
    () => vehicles.filter(v => trips.some(t => t.vehicleId === v.id && !t.ready)),
    [vehicles, trips],
  );
  const pool = onDuty.length > 0 ? onDuty : vehicles.filter(v => v.status !== "VOR").slice(0, 6);

  const [vehicleId, setVehicleId] = useState(pool[0]?.id ?? "");
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [zoneId, setZoneId] = useState("");
  const [damageType, setDamageType] = useState<DamageType>("scuff");
  const [severity, setSeverity] = useState<DamageSeverity>("cosmetic");
  const [description, setDescription] = useState("");
  const [safeToOperate, setSafeToOperate] = useState(true);

  const vehicle = vehicles.find(v => v.id === vehicleId);
  const driver = drivers.find(d => d.id === driverId);
  const trip = trips.find(t => t.vehicleId === vehicleId);
  const zones = vehicle ? getBodyZones(vehicle.type) : [];

  const submit = () => {
    if (!vehicle || !zoneId || !description.trim()) {
      toast.error(yardCopy.toast.driverReport.fieldsRequired);
      return;
    }
    reportDamage({
      vehicleId,
      inspectionId: "insp_driver_sim",
      zoneId,
      reportSource: "driver_report",
      reportedBy: driver?.name ?? "Driver",
      classification: "new_not_reported",
      damageType,
      description: description.trim(),
      severity,
      safeToOperate,
      tripId: trip?.id,
    });
    toast.success(yardCopy.toast.driverReport.filed);
    setDescription("");
  };

  return (
    <div className="space-y-5 animate-in-up pb-8 max-w-lg">
      <Link to="/inspections" className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        ← Inspections
      </Link>
      <SectionHeader
        title="Simulate driver report"
        sub="Prototype — mimics a driver app damage report arriving at Yard"
      />

      <div className="bg-warn/10 border border-warn/40 rounded-xs p-3 text-xs text-warn">
        This does not call a real driver API. Reports land in the damage review queue for manager triage.
      </div>

      <fieldset className="space-y-3 bg-white border border-border rounded-xs p-4 text-xs">
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Vehicle</span>
          <select
            className="w-full border border-border rounded-xs p-2 bg-white"
            value={vehicleId}
            onChange={e => {
              setVehicleId(e.target.value);
              setZoneId("");
            }}
          >
            {pool.map(v => (
              <option key={v.id} value={v.id}>{v.reg} · {v.type}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Driver</span>
          <select className="w-full border border-border rounded-xs p-2 bg-white" value={driverId} onChange={e => setDriverId(e.target.value)}>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Body zone</span>
          <select className="w-full border border-border rounded-xs p-2 bg-white" value={zoneId} onChange={e => setZoneId(e.target.value)}>
            <option value="">Select zone…</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.label}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Damage type</span>
            <select className="w-full border border-border rounded-xs p-2 bg-white" value={damageType} onChange={e => setDamageType(e.target.value as DamageType)}>
              {DAMAGE_TYPES.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Severity</span>
            <select className="w-full border border-border rounded-xs p-2 bg-white" value={severity} onChange={e => setSeverity(e.target.value as DamageSeverity)}>
              {SEVERITIES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={safeToOperate} onChange={e => setSafeToOperate(e.target.checked)} />
          <span>Driver considers vehicle safe to continue</span>
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Description</span>
          <Textarea
            placeholder="What happened and where on the vehicle…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <Button type="button" className="w-full text-xs uppercase tracking-widest font-bold" onClick={submit}>
          {yardCopy.buttons.recordDamageReport}
        </Button>
      </fieldset>

      <Link to="/inspections/damage-review" className="block text-center text-xs font-bold uppercase tracking-widest text-primary hover:underline">
        Open damage review queue →
      </Link>
    </div>
  );
}
