import type { BodyZone, DamageRecord } from "@/types/condition";

interface BodyZoneDiagramProps {
  zones: BodyZone[];
  damageRecords?: DamageRecord[];
  selectedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
}

export function BodyZoneDiagram({
  zones,
  damageRecords = [],
  selectedZoneId,
  onSelectZone,
}: BodyZoneDiagramProps) {
  const damagedZoneIds = new Set(damageRecords.map(d => d.zoneId));

  return (
    <div className="bg-white border border-border rounded-xs p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Body zones</div>
      <div className="relative mx-auto max-w-xs aspect-[2/1] bg-secondary/40 border border-border rounded-xs mb-3 flex items-center justify-center">
        <div className="text-[10px] text-muted text-center px-4">
          {selectedZoneId
            ? zones.find(z => z.id === selectedZoneId)?.label ?? "Selected zone"
            : "Tap a zone below"}
        </div>
        {damagedZoneIds.size > 0 && (
          <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest bg-vor/10 text-vor px-1.5 py-0.5 rounded-xs border border-vor/20">
            {damagedZoneIds.size} known
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {zones.map(zone => {
          const hasDamage = damagedZoneIds.has(zone.id);
          const selected = selectedZoneId === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelectZone?.(zone.id)}
              className={`px-2 py-1 rounded-xs border text-[10px] font-medium text-left transition-colors ${
                selected
                  ? "border-primary bg-primary text-white"
                  : hasDamage
                    ? "border-vor/40 bg-vor/10 text-vor"
                    : "border-border bg-white hover:border-accent"
              }`}
            >
              {zone.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
