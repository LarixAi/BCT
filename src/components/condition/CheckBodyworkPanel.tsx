import { Link } from "@tanstack/react-router";
import { Camera, ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDamageRef, openDamageForVehicle } from "@/domain/condition/condition-helpers";
import { useYard } from "@/store/yard";

interface CheckBodyworkPanelProps {
  vehicleId: string;
  sectionTitle: string;
}

export function CheckBodyworkPanel({ vehicleId, sectionTitle }: CheckBodyworkPanelProps) {
  const damageRecords = useYard(s => s.damageRecords);
  const observations = useYard(s => s.damageObservations);
  const openDamage = openDamageForVehicle(damageRecords, vehicleId);
  const pendingDriver = observations.filter(
    o => o.vehicleId === vehicleId
      && o.reportSource === "driver_report"
      && ["new_not_reported", "possible_new_review"].includes(o.classification),
  );

  return (
    <div className="mt-3 pt-3 border-t border-primary/20 bg-primary/5 rounded-xs p-3 space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
        <ShieldAlert className="size-3" /> Condition evidence · {sectionTitle}
      </div>
      <p className="text-[11px] text-muted">
        Linked to the vehicle Condition record — avoid duplicating photos already on file.
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-xs border border-border bg-white">
          {openDamage.length} known damage
        </span>
        {pendingDriver.length > 0 && (
          <span className="px-2 py-0.5 rounded-xs border border-warn/40 bg-warn/10 text-warn">
            {pendingDriver.length} unreviewed driver report{pendingDriver.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {openDamage.length > 0 && (
        <ul className="text-[11px] space-y-1">
          {openDamage.slice(0, 3).map(d => (
            <li key={d.id}>
              <Link
                to="/yard/$vehicleId/condition/damage/$damageId"
                params={{ vehicleId, damageId: d.id }}
                className="hover:underline"
              >
                <span className="font-mono">{formatDamageRef(d.id)}</span> — {d.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Link to="/yard/$vehicleId/condition" params={{ vehicleId }}>
          <Button type="button" variant="outline" size="sm" className="text-[10px] uppercase tracking-widest h-8">
            <ExternalLink className="size-3 mr-1" /> Condition tab
          </Button>
        </Link>
        <Link to="/yard/$vehicleId/condition/inspect" params={{ vehicleId }} search={{ type: "yard-check" }}>
          <Button type="button" variant="outline" size="sm" className="text-[10px] uppercase tracking-widest h-8">
            <Camera className="size-3 mr-1" /> Full walkaround
          </Button>
        </Link>
        {pendingDriver.length > 0 && (
          <Link to="/inspections/damage-review">
            <Button type="button" size="sm" className="text-[10px] uppercase tracking-widest h-8 bg-warn hover:bg-warn/90 text-black">
              Review driver reports
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
