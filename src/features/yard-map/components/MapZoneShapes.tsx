import type { LayoutGate, LayoutZone } from "@veyvio/yard";

export function ZoneShape({
  zone,
  fill,
  opacity = 0.85,
  selected = false,
  editMode = false,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  zone: LayoutZone;
  fill?: string;
  opacity?: number;
  selected?: boolean;
  editMode?: boolean;
  onSelect?: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
  onDragMove?: (e: React.PointerEvent) => void;
  onDragEnd?: (e: React.PointerEvent) => void;
}) {
  const points = zone.polygon.map(([x, y]) => `${x},${y}`).join(" ");
  const interactive = editMode && onSelect;

  return (
    <polygon
      points={points}
      fill={fill ?? zone.colourKey}
      opacity={opacity}
      stroke={selected ? "#12A89D" : "#94A3B8"}
      strokeWidth={selected ? 2.5 : 1}
      className={interactive ? "cursor-move" : undefined}
      onClick={interactive ? e => { e.stopPropagation(); onSelect?.(); } : undefined}
      onPointerDown={interactive ? e => { e.stopPropagation(); onDragStart?.(e); } : undefined}
      onPointerMove={interactive ? onDragMove : undefined}
      onPointerUp={interactive ? onDragEnd : undefined}
    />
  );
}

export function NoParkingZone({
  zone,
  selected = false,
  editMode = false,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  zone: LayoutZone;
  selected?: boolean;
  editMode?: boolean;
  onSelect?: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
  onDragMove?: (e: React.PointerEvent) => void;
  onDragEnd?: (e: React.PointerEvent) => void;
}) {
  const [x, y] = zone.polygon[0] ?? [0, 0];
  const w = (zone.polygon[1]?.[0] ?? 0) - x;
  const h = (zone.polygon[2]?.[1] ?? 0) - y;
  const id = `no-park-${zone.id}`;
  const interactive = editMode && onSelect;

  return (
    <g
      className={interactive ? "cursor-move" : undefined}
      onClick={interactive ? e => { e.stopPropagation(); onSelect?.(); } : undefined}
      onPointerDown={interactive ? e => { e.stopPropagation(); onDragStart?.(e); } : undefined}
      onPointerMove={interactive ? onDragMove : undefined}
      onPointerUp={interactive ? onDragEnd : undefined}
    >
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#CA8A04" strokeWidth="3" />
        </pattern>
      </defs>
      <polygon
        points={zone.polygon.map(([px, py]) => `${px},${py}`).join(" ")}
        fill={`url(#${id})`}
        opacity={0.55}
        stroke={selected ? "#12A89D" : "#CA8A04"}
        strokeWidth={selected ? 2.5 : 1}
      />
      {zone.name.includes("Safety") && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 3}
          textAnchor="middle"
          className="pointer-events-none fill-amber-900 text-[7px] font-bold uppercase"
        >
          Safety
        </text>
      )}
    </g>
  );
}

export function GateShape({
  gate,
  showLabel,
  selected = false,
  editMode = false,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  gate: LayoutGate;
  showLabel: boolean;
  selected?: boolean;
  editMode?: boolean;
  onSelect?: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
  onDragMove?: (e: React.PointerEvent) => void;
  onDragEnd?: (e: React.PointerEvent) => void;
}) {
  const interactive = editMode && onSelect;
  const fill =
    gate.kind === "GATE" ? "#7C3AED" : gate.kind === "EXIT" ? "#B42318" : "#2F6BFF";

  return (
    <g
      className={interactive ? "cursor-move" : undefined}
      onClick={interactive ? e => { e.stopPropagation(); onSelect?.(); } : undefined}
      onPointerDown={interactive ? e => { e.stopPropagation(); onDragStart?.(e); } : undefined}
      onPointerMove={interactive ? onDragMove : undefined}
      onPointerUp={interactive ? onDragEnd : undefined}
    >
      <rect
        x={gate.geometry.x}
        y={gate.geometry.y}
        width={gate.geometry.width}
        height={gate.geometry.height}
        rx={4}
        fill={fill}
        stroke={selected ? "#12A89D" : "none"}
        strokeWidth={selected ? 2 : 0}
      />
      {showLabel && (
        <text
          x={gate.geometry.x + gate.geometry.width / 2}
          y={gate.geometry.y + gate.geometry.height / 2 + 4}
          textAnchor="middle"
          className="pointer-events-none fill-white text-[8px] font-bold"
        >
          {gate.name}
        </text>
      )}
    </g>
  );
}

export function PlacementPreview({
  x,
  y,
  w,
  h,
  kind,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "building" | "gate" | "safety";
}) {
  const left = w < 0 ? x + w : x;
  const top = h < 0 ? y + h : y;
  const width = Math.abs(w);
  const height = Math.abs(h);
  const fill =
    kind === "safety" ? "rgba(250,204,21,0.35)" : kind === "building" ? "rgba(37,99,235,0.35)" : "rgba(124,58,237,0.35)";
  const stroke = kind === "safety" ? "#CA8A04" : kind === "building" ? "#2563EB" : "#7C3AED";

  return (
    <rect
      x={left}
      y={top}
      width={width}
      height={height}
      fill={fill}
      stroke={stroke}
      strokeWidth={2}
      strokeDasharray="6 4"
      pointerEvents="none"
    />
  );
}
