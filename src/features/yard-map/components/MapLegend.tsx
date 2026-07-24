import type { MapLayerId } from "@/types/yard-layout";

const LAYER_LABELS: Record<MapLayerId, string> = {
  bays: "Parking bays",
  vehicles: "Vehicle registrations",
  statuses: "Vehicle statuses",
  pedestrian: "Pedestrian routes",
  roadway: "Traffic flow",
  restrictions: "Restricted areas",
  buildings: "Buildings",
  gates: "Entrance & exit",
  labels: "Bay labels",
};

interface MapLegendProps {
  layers: Record<MapLayerId, boolean>;
  onToggleLayer: (id: MapLayerId) => void;
  onClose: () => void;
}

export function MapLegend({ layers, onToggleLayer, onClose }: MapLegendProps) {
  return (
    <div
      className="pointer-events-auto absolute bottom-2 left-2 right-2 z-20 rounded border border-border bg-white p-3 shadow-lg sm:left-auto sm:right-2 sm:w-72"
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest">Map legend & layers</h3>
        <button type="button" onClick={onClose} className="text-[10px] font-bold text-primary">
          Close
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {(Object.keys(LAYER_LABELS) as MapLayerId[]).map(id => (
          <li key={id}>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={layers[id]}
                onChange={() => onToggleLayer(id)}
                className="size-4 rounded border-border accent-primary"
              />
              {LAYER_LABELS[id]}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Status colours</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
          <LegendSwatch colour="#178C4B" label="Ready" />
          <LegendSwatch colour="#D97706" label="Attention" />
          <LegendSwatch colour="#B42318" label="VOR" />
          <LegendSwatch colour="#7C3AED" label="Reserved" />
        </ul>
        <p className="mt-2 text-[9px] text-muted">Every marker includes text — never colour alone.</p>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted">Bay types (BCT plan)</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
          <LegendSwatch colour="#E8D4B8" label="Minibus" />
          <LegendSwatch colour="#FDBA74" label="MPV" />
        </ul>
      </div>
    </div>
  );
}

function LegendSwatch({ colour, label }: { colour: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="size-3 rounded border border-border" style={{ backgroundColor: colour }} aria-hidden />
      {label}
    </li>
  );
}
