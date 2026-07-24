import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useYard } from "@/store/yard";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import {
  buildSpatialBayStates,
  isLiveYardMapDepot,
  layoutCapacitySummary,
  resolveYardLayout,
} from "@/features/yard-map/resolve-layout";
import { useMapViewport } from "@/features/yard-map/hooks/useMapViewport";
import { useLayoutEditor } from "@/features/yard-map/hooks/useLayoutEditor";
import { GateShape, NoParkingZone, PlacementPreview, ZoneShape } from "@/features/yard-map/components/MapZoneShapes";
import { useYardMapRealtime } from "@/features/yard-map/hooks/useYardMapRealtime";
import { ParkingBayShape } from "@/features/yard-map/components/ParkingBayShape";
import { MapControls } from "@/features/yard-map/components/MapControls";
import { MapLegend } from "@/features/yard-map/components/MapLegend";
import { MapListView } from "@/features/yard-map/components/MapListView";
import { LayoutEditorToolbar } from "@/features/yard-map/components/LayoutEditorToolbar";
import { BayDetailDrawer } from "@/features/yard-map/drawers/BayDetailDrawer";
import { VehicleDetailDrawer } from "@/features/yard-map/drawers/VehicleDetailDrawer";
import { clientToSvg } from "@/features/yard-map/lib/svg-coords";
import { layoutContentBounds } from "@/features/yard-map/lib/layout-content-bounds";
import { DEFAULT_MAP_LAYERS, type MapLayerId, type LayoutBay, type YardHubLayoutSnapshot, type YardLayoutDefinition } from "@veyvio/yard";
import { BCT_MAIN_DEPOT_LAYOUT } from "@veyvio/yard";

type ViewMode = "map" | "list";

type LiveYardMapProps = {
  onEditModeChange?: (editing: boolean) => void;
};

function hubSnapshotToLayout(snapshot: YardHubLayoutSnapshot): YardLayoutDefinition {
  return {
    id: snapshot.layoutId,
    depotCode: snapshot.depotCode,
    name: snapshot.name,
    canvasWidth: snapshot.canvasWidth,
    canvasHeight: snapshot.canvasHeight,
    zones: snapshot.zones,
    bays: snapshot.bays,
    gates: snapshot.gates,
  };
}

export function LiveYardMap({ onEditModeChange }: LiveYardMapProps = {}) {
  const depotCode = useTenancyStore(s => s.depotCode);
  const bays = useYard(s => s.bays);
  const vehicles = useYard(s => s.vehicles);
  const trips = useYard(s => s.trips);
  const yardLayout = useYard(s => s.yardLayout);
  const yardMapEnabled = useYard(s => s.yardMapEnabled);

  const baseLayout = useMemo(() => {
    if (yardLayout) return hubSnapshotToLayout(yardLayout);
    if (yardMapEnabled || isLiveYardMapDepot(depotCode)) {
      return resolveYardLayout(depotCode ?? "BCT-MAIN") ?? BCT_MAIN_DEPOT_LAYOUT;
    }
    return resolveYardLayout(depotCode);
  }, [yardLayout, yardMapEnabled, depotCode]);

  const {
    layout,
    editMode,
    setEditMode,
    tool,
    setTool,
    hasChanges,
    selectedBayId,
    setSelectedBayId,
    selectedZoneId,
    setSelectedZoneId,
    selectedGateId,
    setSelectedGateId,
    moveBay,
    rotateBay,
    moveCustomZone,
    moveCustomGate,
    addPlacement,
    deleteSelected,
    resetDraft,
    copyDraft,
    clearSelection,
    addedZones,
    addedGates,
  } = useLayoutEditor(depotCode, baseLayout);

  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [query, setQuery] = useState("");
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [layers, setLayers] = useState(DEFAULT_MAP_LAYERS);
  const [layersOpen, setLayersOpen] = useState(false);
  const dragBayRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const dragCustomRef = useRef<{ kind: "zone" | "gate"; id: string; lastX: number; lastY: number } | null>(null);
  const placementRef = useRef<{ x: number; y: number } | null>(null);
  const [placementPreview, setPlacementPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useYardMapRealtime(viewMode === "map" && Boolean(layout));

  const states = useMemo(
    () => (layout ? buildSpatialBayStates(layout, bays, vehicles) : []),
    [layout, bays, vehicles],
  );
  const capacity = useMemo(() => layoutCapacitySummary(states), [states]);
  const selectedState = states.find(s => s.bayNumber === selectedBay) ?? null;
  const nextTripForVehicle = selectedState?.vehicle
    ? trips.find(t => t.vehicleId === selectedState.vehicle?.id) ?? null
    : null;

  const contentBounds = useMemo(
    () => (layout ? layoutContentBounds(layout) : { x: 0, y: 0, width: 1000, height: 760 }),
    [layout],
  );
  const viewExtents = useMemo(() => {
    if (!layout) return { width: 1040, height: 760 };
    return {
      width: Math.max(layout.canvasWidth, contentBounds.x + contentBounds.width),
      height: Math.max(layout.canvasHeight, contentBounds.y + contentBounds.height),
    };
  }, [layout, contentBounds]);

  const {
    containerRef,
    viewport,
    fitToScreen,
    zoomIn,
    zoomOut,
    resetView,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
  } = useMapViewport(contentBounds, !editMode || tool === "move-bay");

  function svgPoint(e: React.PointerEvent) {
    const container = containerRef.current;
    if (!container) return null;
    return clientToSvg(e.clientX, e.clientY, container, viewport);
  }

  function handleMapPointerDown(e: React.PointerEvent) {
    if (!editMode || tool === "move-bay") {
      onPointerDown(e);
      return;
    }
    const pt = svgPoint(e);
    if (!pt) return;
    e.stopPropagation();
    placementRef.current = pt;
    setPlacementPreview({ x: pt.x, y: pt.y, w: 0, h: 0 });
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function handleMapPointerMove(e: React.PointerEvent) {
    if (placementRef.current) {
      const pt = svgPoint(e);
      if (!pt) return;
      setPlacementPreview({
        x: placementRef.current.x,
        y: placementRef.current.y,
        w: pt.x - placementRef.current.x,
        h: pt.y - placementRef.current.y,
      });
      return;
    }
    if (dragCustomRef.current) {
      const pt = svgPoint(e);
      if (!pt) return;
      const drag = dragCustomRef.current;
      const dx = pt.x - drag.lastX;
      const dy = pt.y - drag.lastY;
      if (drag.kind === "zone") moveCustomZone(drag.id, dx, dy);
      else moveCustomGate(drag.id, pt.x - dragOffsetRef.current!.dx, pt.y - dragOffsetRef.current!.dy);
      dragCustomRef.current = { ...drag, lastX: pt.x, lastY: pt.y };
      return;
    }
    if (dragBayRef.current) {
      handleBayDragMove(e);
      return;
    }
    onPointerMove(e);
  }

  function handleMapPointerUp(e: React.PointerEvent) {
    if (placementRef.current && placementPreview) {
      addPlacement(tool, placementPreview.x, placementPreview.y, placementPreview.w, placementPreview.h);
      placementRef.current = null;
      setPlacementPreview(null);
      return;
    }
    handleBayDragEnd();
    dragCustomRef.current = null;
    onPointerUp(e);
  }

  function handleBayDragStart(e: React.PointerEvent, layoutBay: LayoutBay) {
    const container = containerRef.current;
    if (!container) return;
    const pt = clientToSvg(e.clientX, e.clientY, container, viewport);
    dragBayRef.current = layoutBay.id;
    dragOffsetRef.current = {
      dx: pt.x - layoutBay.geometry.x,
      dy: pt.y - layoutBay.geometry.y,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function handleBayDragMove(e: React.PointerEvent) {
    if (!dragBayRef.current || !dragOffsetRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const pt = clientToSvg(e.clientX, e.clientY, container, viewport);
    moveBay(
      dragBayRef.current,
      pt.x - dragOffsetRef.current.dx,
      pt.y - dragOffsetRef.current.dy,
    );
  }

  function handleBayDragEnd() {
    dragBayRef.current = null;
    dragOffsetRef.current = null;
  }

  useEffect(() => {
    if (editMode) {
      setSelectedBay(null);
    } else {
      clearSelection();
      setPlacementPreview(null);
      placementRef.current = null;
    }
    onEditModeChange?.(editMode);
  }, [editMode, clearSelection, onEditModeChange]);

  useEffect(() => {
    if (viewMode !== "map") return;
    const t = window.setTimeout(fitToScreen, 50);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => fitToScreen());
    });
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [viewMode, fitToScreen, layout?.id, editMode, contentBounds.width, contentBounds.height]);

  if (!layout) {
    return (
      <p className="rounded border border-dashed border-border p-6 text-center text-sm text-muted">
        Live Yard Map is not configured for this depot.
      </p>
    );
  }

  const ready = vehicles.filter(v => v.status === "Available").length;
  const attention = vehicles.filter(v => v.status === "Awaiting Check" || v.status === "In Workshop").length;
  const vor = vehicles.filter(v => v.status === "VOR").length;

  const mapCanvas = (
    <div
      className={
        editMode
          ? "relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-[#F5F7FA]"
          : "relative h-[min(calc(100dvh-11rem),820px)] overflow-hidden rounded border border-border bg-[#F5F7FA] sm:h-[min(calc(100dvh-10rem),860px)]"
      }
    >
      <div
        ref={containerRef}
        className="absolute inset-0 touch-none"
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerUp}
        onPointerLeave={handleMapPointerUp}
        onWheel={onWheel}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewExtents.width} ${viewExtents.height}`}
          className="select-none"
          style={{
            transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
            transformOrigin: "0 0",
          }}
          role="img"
          aria-label="Interactive depot yard map"
        >
          {layers.buildings && layout.zones
            .filter(z => ["OFFICE", "CONTAINER", "WORKSHOP"].includes(z.kind))
            .map(zone => {
              const isCustom = addedZones.some(z => z.id === zone.id);
              return (
                <ZoneShape
                  key={zone.id}
                  zone={zone}
                  selected={selectedZoneId === zone.id}
                  editMode={editMode && isCustom}
                  onSelect={() => {
                    setSelectedZoneId(zone.id);
                    setSelectedGateId(null);
                    setSelectedBayId(null);
                  }}
                  onDragStart={e => {
                    const pt = svgPoint(e);
                    if (!pt) return;
                    dragCustomRef.current = { kind: "zone", id: zone.id, lastX: pt.x, lastY: pt.y };
                  }}
                  onDragMove={handleMapPointerMove}
                  onDragEnd={() => { dragCustomRef.current = null; }}
                />
              );
            })}
          {layers.pedestrian && layout.zones
            .filter(z => z.kind === "PEDESTRIAN")
            .map(zone => <ZoneShape key={zone.id} zone={zone} fill="#BBF7D0" opacity={0.5} />)}
          {layers.roadway && layout.zones
            .filter(z => z.kind === "ROADWAY")
            .map(zone => <ZoneShape key={zone.id} zone={zone} fill="#FEF9C3" opacity={0.6} />)}
          {layers.restrictions && layout.zones
            .filter(z => z.kind === "NO_PARKING")
            .map(zone => {
              const isCustom = addedZones.some(z => z.id === zone.id);
              return (
                <NoParkingZone
                  key={zone.id}
                  zone={zone}
                  selected={selectedZoneId === zone.id}
                  editMode={editMode && isCustom}
                  onSelect={() => {
                    setSelectedZoneId(zone.id);
                    setSelectedGateId(null);
                    setSelectedBayId(null);
                  }}
                  onDragStart={e => {
                    const pt = svgPoint(e);
                    if (!pt) return;
                    dragCustomRef.current = { kind: "zone", id: zone.id, lastX: pt.x, lastY: pt.y };
                  }}
                  onDragMove={handleMapPointerMove}
                  onDragEnd={() => { dragCustomRef.current = null; }}
                />
              );
            })}
          {layers.gates && layout.gates.map(gate => {
            const isCustom = addedGates.some(g => g.id === gate.id);
            return (
              <GateShape
                key={gate.id}
                gate={gate}
                showLabel={layers.labels}
                selected={selectedGateId === gate.id}
                editMode={editMode && isCustom}
                onSelect={() => {
                  setSelectedGateId(gate.id);
                  setSelectedZoneId(null);
                  setSelectedBayId(null);
                }}
                onDragStart={e => {
                  const pt = svgPoint(e);
                  if (!pt) return;
                  dragOffsetRef.current = { dx: pt.x - gate.geometry.x, dy: pt.y - gate.geometry.y };
                  dragCustomRef.current = { kind: "gate", id: gate.id, lastX: pt.x, lastY: pt.y };
                }}
                onDragMove={handleMapPointerMove}
                onDragEnd={() => {
                  dragCustomRef.current = null;
                  dragOffsetRef.current = null;
                }}
              />
            );
          })}
          {placementPreview ? (
            <PlacementPreview
              {...placementPreview}
              kind={
                tool === "add-safety" ? "safety" : tool === "add-building" ? "building" : "gate"
              }
            />
          ) : null}
          {layers.bays && layout.bays.map(layoutBay => {
            const state = states.find(s => s.layoutBayId === layoutBay.id);
            if (!state) return null;
            if (query.trim() && !editMode) {
              const q = query.toLowerCase();
              const match = `${state.bayNumber} ${state.vehicle?.reg ?? ""}`.toLowerCase().includes(q);
              if (!match) return null;
            }
            return (
              <ParkingBayShape
                key={layoutBay.id}
                layoutBay={layoutBay}
                state={state}
                selected={selectedBay === layoutBay.bayNumber}
                showLabels={layers.labels}
                editMode={editMode && tool === "move-bay"}
                editSelected={selectedBayId === layoutBay.id}
                onSelect={setSelectedBay}
                onEditSelect={bay => {
                  setSelectedBayId(bay.id);
                  setSelectedZoneId(null);
                  setSelectedGateId(null);
                }}
                onDragStart={handleBayDragStart}
                onDragMove={handleBayDragMove}
                onDragEnd={handleBayDragEnd}
              />
            );
          })}
        </svg>
      </div>
      <MapControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onFit={fitToScreen}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen(o => !o)}
      />
      {layersOpen && (
        <MapLegend
          layers={layers}
          onToggleLayer={id => setLayers(l => ({ ...l, [id]: !l[id] }))}
          onClose={() => setLayersOpen(false)}
        />
      )}
    </div>
  );

  const editModeOverlay = editMode ? (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col gap-2 bg-page p-2 pb-safe top-[3.25rem] lg:left-[220px] lg:top-[58px] lg:pb-3 lg:pr-3">
      <LayoutEditorToolbar
        editMode={editMode}
        tool={tool}
        hasChanges={hasChanges}
        selectedBayId={selectedBayId}
        selectedCustomId={selectedZoneId ?? selectedGateId}
        onToggleEdit={() => setEditMode(false)}
        onToolChange={setTool}
        onRotateBay={() => selectedBayId && rotateBay(selectedBayId)}
        onDeleteSelected={deleteSelected}
        onReset={resetDraft}
        onCopy={copyDraft}
        compact
      />
      {mapCanvas}
    </div>
  ) : null;

  return (
    <div className={editMode ? "space-y-0" : "space-y-3"}>
      {!editMode ? (
        <>
          <div className="flex gap-1 rounded border border-border bg-white p-1">
            <ViewTab active={viewMode === "map"} onClick={() => setViewMode("map")}>Map</ViewTab>
            <ViewTab active={viewMode === "list"} onClick={() => setViewMode("list")}>List</ViewTab>
          </div>

          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search registration or bay"
              className="h-10 w-full rounded border border-input bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="flex flex-wrap gap-3 text-xs font-bold tabular-nums">
            <span className="text-ok">Ready {ready}</span>
            <span className="text-warn">Attention {attention}</span>
            <span className="text-vor">VOR {vor}</span>
            <span className="text-muted">
              {capacity.occupied}/{capacity.total} occupied
            </span>
          </div>
        </>
      ) : null}

      {viewMode === "list" ? (
        <MapListView states={states} query={query} />
      ) : editMode ? (
        typeof document !== "undefined" ? createPortal(editModeOverlay, document.body) : editModeOverlay
      ) : (
        <>
          <LayoutEditorToolbar
            editMode={editMode}
            tool={tool}
            hasChanges={hasChanges}
            selectedBayId={selectedBayId}
            selectedCustomId={selectedZoneId ?? selectedGateId}
            onToggleEdit={() => setEditMode(true)}
            onToolChange={setTool}
            onRotateBay={() => selectedBayId && rotateBay(selectedBayId)}
            onDeleteSelected={deleteSelected}
            onReset={resetDraft}
            onCopy={copyDraft}
          />
          {mapCanvas}
        </>
      )}

      {selectedState && !editMode && (
        selectedState.vehicle ? (
          <VehicleDetailDrawer
            state={selectedState}
            nextTrip={nextTripForVehicle}
            onClose={() => setSelectedBay(null)}
          />
        ) : (
          <BayDetailDrawer state={selectedState} onClose={() => setSelectedBay(null)} />
        )
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded px-3 py-2 text-xs font-bold transition-colors ${
        active ? "bg-primary text-white" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
