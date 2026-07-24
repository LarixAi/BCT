import type { BodyZone, DamageRecord } from "@/types/condition";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";

interface BodyZoneDiagramProps {
  zones: BodyZone[];
  damageRecords?: DamageRecord[];
  selectedZoneId?: string;
  onSelectZone?: (zoneId: string) => void;
  embedded?: boolean;
}

export function BodyZoneDiagram({
  zones,
  damageRecords = [],
  selectedZoneId,
  onSelectZone,
  embedded = false,
}: BodyZoneDiagramProps) {
  const damagedZoneIds = new Set(damageRecords.map(d => d.zoneId));

  const content = (
    <>
      <h2 className="mb-3 text-base font-semibold text-ink">Body zones</h2>
      <div className="relative mx-auto mb-4 flex aspect-[2/1] max-w-xs items-center justify-center rounded-2xl border border-[#e4e7ec] bg-[#f9fafb]">
        <div className="px-4 text-center text-sm text-[#667085]">
          {selectedZoneId
            ? zones.find(z => z.id === selectedZoneId)?.label ?? "Selected zone"
            : "Tap a zone below"}
        </div>
        {damagedZoneIds.size > 0 ? (
          <span className="absolute right-2 top-2 rounded-full border border-[#fecdca] bg-[#fef3f2] px-2 py-0.5 text-[10px] font-semibold text-[#b42318]">
            {damagedZoneIds.size} known
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {zones.map(zone => {
          const hasDamage = damagedZoneIds.has(zone.id);
          const selected = selectedZoneId === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelectZone?.(zone.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected
                  ? "border-ink bg-ink text-white"
                  : hasDamage
                    ? "border-[#fecdca] bg-[#fef3f2] text-[#b42318]"
                    : "border-[#e4e7ec] bg-white text-ink hover:border-[#d0d5dd]"
              }`}
            >
              {zone.label}
            </button>
          );
        })}
      </div>
    </>
  );

  if (embedded) return <div>{content}</div>;

  return <DashboardSurface>{content}</DashboardSurface>;
}
