import { Layers, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  layersOpen,
  onToggleLayers,
}: MapControlsProps) {
  return (
    <div
      className="pointer-events-auto absolute right-2 top-2 z-20 flex flex-col gap-1"
      onPointerDown={e => e.stopPropagation()}
    >
      <ControlButton label="Zoom in" onClick={onZoomIn}>
        <Plus className="size-4" />
      </ControlButton>
      <ControlButton label="Zoom out" onClick={onZoomOut}>
        <Minus className="size-4" />
      </ControlButton>
      <ControlButton label="Fit map to screen" onClick={onFit}>
        <Maximize2 className="size-4" />
      </ControlButton>
      <ControlButton label="Reset view" onClick={onReset}>
        <RotateCcw className="size-4" />
      </ControlButton>
      <ControlButton label="Map layers" onClick={onToggleLayers} active={layersOpen}>
        <Layers className="size-4" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded border bg-white shadow-sm transition-colors ${
        active ? "border-primary text-primary" : "border-border text-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}
