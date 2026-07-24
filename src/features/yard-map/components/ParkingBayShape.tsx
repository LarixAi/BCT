import type { LayoutBay } from "@/types/yard-layout";
import type { VehicleStatus } from "@/types/yard";
import type { SpatialBayState } from "@/features/yard-map/resolve-layout";
import { BCT_MPV_BAY_NUMBERS } from "@veyvio/yard";

const MINIBUS_EMPTY = "#E8D4B8";
const MPV_EMPTY = "#FDBA74";

const STATUS_FILL: Record<VehicleStatus, string> = {
  Available: "#D1FAE5",
  "Awaiting Check": "#FEF3C7",
  "On Departure Line": "#DDF7F3",
  "In Workshop": "#E5E7EB",
  VOR: "#FEE2E2",
  "Off-site": "#F3F4F6",
};

const STATUS_STROKE: Record<VehicleStatus, string> = {
  Available: "#178C4B",
  "Awaiting Check": "#D97706",
  "On Departure Line": "#12A89D",
  "In Workshop": "#6B7280",
  VOR: "#B42318",
  "Off-site": "#9CA3AF",
};

const BAY_STATUS_FILL: Record<string, string> = {
  available: "#FEF9F3",
  occupied: "transparent",
  reserved: "#EDE9FE",
  blocked: "#FEE2E2",
  out_of_service: "#F3F4F6",
  temporary_closure: "#FEF3C7",
  maintenance_use: "#E0E7FF",
  unknown: "#F9FAFB",
};

interface ParkingBayShapeProps {
  layoutBay: LayoutBay;
  state: SpatialBayState;
  selected: boolean;
  showLabels: boolean;
  editMode?: boolean;
  editSelected?: boolean;
  onSelect: (bayNumber: number) => void;
  onEditSelect?: (layoutBay: LayoutBay) => void;
  onDragStart?: (e: React.PointerEvent, layoutBay: LayoutBay) => void;
  onDragMove?: (e: React.PointerEvent) => void;
  onDragEnd?: (e: React.PointerEvent) => void;
}

export function ParkingBayShape({
  layoutBay,
  state,
  selected,
  showLabels,
  editMode = false,
  editSelected = false,
  onSelect,
  onEditSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: ParkingBayShapeProps) {
  const { x, y, width, height } = layoutBay.geometry;
  const { vehicle, operationalStatus, isLifo, isReserved } = state;
  const vehicleClass =
    layoutBay.vehicleClass ??
    (BCT_MPV_BAY_NUMBERS.has(layoutBay.bayNumber) ? "mpv" : "minibus");

  const emptyFill =
    vehicleClass === "mpv" ? MPV_EMPTY : MINIBUS_EMPTY;

  const fill = vehicle
    ? STATUS_FILL[vehicle.status as VehicleStatus]
    : BAY_STATUS_FILL[operationalStatus] ?? emptyFill;

  const stroke = vehicle
    ? STATUS_STROKE[vehicle.status as VehicleStatus]
    : operationalStatus === "blocked"
      ? "#B42318"
      : operationalStatus === "reserved" || isReserved
        ? "#7C3AED"
        : vehicleClass === "mpv"
          ? "#EA580C"
          : "#B8956A";

  const strokeWidth = editSelected ? 3 : selected ? 3 : 1.5;
  const label = layoutBay.bayNumber;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={buildAriaLabel(state)}
      className={editMode ? "cursor-move" : "cursor-pointer"}
      onClick={() => {
        if (editMode) {
          onEditSelect?.(layoutBay);
          return;
        }
        onSelect(layoutBay.bayNumber);
      }}
      onPointerDown={e => {
        if (editMode) {
          e.stopPropagation();
          onEditSelect?.(layoutBay);
          onDragStart?.(e, layoutBay);
        }
      }}
      onPointerMove={e => {
        if (editMode) onDragMove?.(e);
      }}
      onPointerUp={e => {
        if (editMode) onDragEnd?.(e);
      }}
      onKeyDown={e => {
        if (editMode) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(layoutBay.bayNumber);
        }
      }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={fill}
        stroke={editMode ? (editSelected ? "#12A89D" : "#64748B") : stroke}
        strokeWidth={editMode ? (editSelected ? 3 : 2) : strokeWidth}
        strokeDasharray={editMode ? "4 2" : undefined}
        className={editMode ? undefined : "transition-opacity hover:opacity-90"}
      />
      {operationalStatus === "blocked" && (
        <HatchPattern x={x} y={y} width={width} height={height} id={`hatch-${layoutBay.id}`} />
      )}
      {showLabels && (
        <text
          x={x + width / 2}
          y={y + 14}
          textAnchor="middle"
          className="pointer-events-none select-none fill-foreground text-[11px] font-bold"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {label}
        </text>
      )}
      {vehicle && showLabels && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 + 4}
            textAnchor="middle"
            className="pointer-events-none select-none text-[9px] font-bold"
            fill={vehicle.status === "VOR" ? "#B42318" : "#101828"}
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {vehicle.reg}
          </text>
          <text
            x={x + width / 2}
            y={y + height - 8}
            textAnchor="middle"
            className="pointer-events-none select-none text-[7px] font-bold uppercase"
            fill={vehicle.status === "VOR" ? "#B42318" : "#475467"}
          >
            {vehicle.status === "Available" ? "READY" : vehicle.status}
          </text>
        </>
      )}
      {!vehicle && operationalStatus === "available" && showLabels && (
        <text
          x={x + width / 2}
          y={y + height - 8}
          textAnchor="middle"
          className="pointer-events-none select-none text-[7px] font-bold uppercase text-muted"
        >
          Empty
        </text>
      )}
      {isLifo && (
        <text x={x + 4} y={y + height - 4} className="pointer-events-none text-[6px] font-bold fill-amber-700">
          LIFO
        </text>
      )}
      {isReserved && !vehicle && (
        <text x={x + width - 4} y={y + 12} textAnchor="end" className="pointer-events-none text-[7px] font-bold fill-violet-700">
          R
        </text>
      )}
    </g>
  );
}

function buildAriaLabel(state: SpatialBayState): string {
  const parts = [`Bay ${state.bayNumber}`, state.operationalStatus];
  if (state.vehicle) parts.push(state.vehicle.reg, state.vehicle.status);
  else parts.push("empty");
  if (state.isLifo) parts.push("LIFO");
  if (state.isReserved) parts.push("reserved");
  return parts.join(", ");
}

function HatchPattern({
  x, y, width, height, id,
}: {
  x: number; y: number; width: number; height: number; id: string;
}) {
  return (
    <>
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#B45309" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x={x} y={y} width={width} height={height} fill={`url(#${id})`} opacity={0.35} pointerEvents="none" />
    </>
  );
}
