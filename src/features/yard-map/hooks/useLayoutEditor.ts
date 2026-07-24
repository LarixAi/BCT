import { useCallback, useEffect, useMemo, useState } from "react";
import type { LayoutBay, LayoutGate, LayoutZone, YardLayoutDefinition } from "@veyvio/yard";
import {
  applyLayoutDraft,
  clearLayoutDraft,
  createGateFromRect,
  createZoneFromRect,
  draftHasChanges,
  emptyDraft,
  exportLayoutDraft,
  loadLayoutDraft,
  rotateBayOverride,
  saveLayoutDraft,
  type BayOverride,
  type LayoutEditorDraft,
  type LayoutEditorTool,
} from "@/features/yard-map/lib/layout-editor-draft";

export type { BayOverride, LayoutEditorDraft, LayoutEditorTool };

export function useLayoutEditor(depotCode: string | null, baseLayout: YardLayoutDefinition | null) {
  const [editMode, setEditMode] = useState(false);
  const [tool, setTool] = useState<LayoutEditorTool>("move-bay");
  const [draft, setDraft] = useState<LayoutEditorDraft>(emptyDraft);
  const [selectedBayId, setSelectedBayId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);

  useEffect(() => {
    if (!baseLayout || !depotCode) {
      setDraft(emptyDraft());
      return;
    }
    setDraft(loadLayoutDraft(depotCode, baseLayout.id));
  }, [depotCode, baseLayout?.id]);

  const layout = useMemo(() => {
    if (!baseLayout) return null;
    return applyLayoutDraft(baseLayout, draft);
  }, [baseLayout, draft]);

  const hasChanges = draftHasChanges(draft);

  const persist = useCallback(
    (next: LayoutEditorDraft) => {
      if (!baseLayout || !depotCode) return;
      saveLayoutDraft(depotCode, baseLayout.id, next);
      setDraft(next);
    },
    [baseLayout, depotCode],
  );

  const moveBay = useCallback(
    (bayId: string, x: number, y: number) => {
      if (!baseLayout) return;
      const bay = baseLayout.bays.find(b => b.id === bayId);
      if (!bay) return;
      const prev = draft.bayOverrides[bayId];
      persist({
        ...draft,
        bayOverrides: {
          ...draft.bayOverrides,
          [bayId]: {
            x: Math.round(x),
            y: Math.round(y),
            width: prev?.width ?? bay.geometry.width,
            height: prev?.height ?? bay.geometry.height,
            parkingDirection: prev?.parkingDirection ?? bay.parkingDirection,
          },
        },
      });
    },
    [baseLayout, draft, persist],
  );

  const rotateBay = useCallback(
    (bayId: string) => {
      if (!baseLayout) return;
      const bay = baseLayout.bays.find(b => b.id === bayId);
      if (!bay) return;
      const rotated = rotateBayOverride(bay, draft.bayOverrides[bayId]);
      persist({
        ...draft,
        bayOverrides: { ...draft.bayOverrides, [bayId]: rotated },
      });
    },
    [baseLayout, draft, persist],
  );

  const moveCustomZone = useCallback(
    (zoneId: string, dx: number, dy: number) => {
      const zones = draft.addedZones.map(z => {
        if (z.id !== zoneId) return z;
        return {
          ...z,
          polygon: z.polygon.map(([px, py]) => [px + dx, py + dy] as [number, number]),
        };
      });
      persist({ ...draft, addedZones: zones });
    },
    [draft, persist],
  );

  const moveCustomGate = useCallback(
    (gateId: string, x: number, y: number) => {
      const gates = draft.addedGates.map(g => {
        if (g.id !== gateId) return g;
        return { ...g, geometry: { ...g.geometry, x: Math.round(x), y: Math.round(y) } };
      });
      persist({ ...draft, addedGates: gates });
    },
    [draft, persist],
  );

  const addPlacement = useCallback(
    (editorTool: LayoutEditorTool, x: number, y: number, w: number, h: number) => {
      if (editorTool === "add-building" || editorTool === "add-safety") {
        const zone = createZoneFromRect(editorTool, x, y, w, h);
        if (!zone) return;
        persist({ ...draft, addedZones: [...draft.addedZones, zone] });
        setSelectedZoneId(zone.id);
        setSelectedGateId(null);
        setSelectedBayId(null);
        return;
      }
      if (editorTool === "add-gate" || editorTool === "add-entrance" || editorTool === "add-exit") {
        const gate = createGateFromRect(editorTool, x, y, w, h);
        if (!gate) return;
        persist({ ...draft, addedGates: [...draft.addedGates, gate] });
        setSelectedGateId(gate.id);
        setSelectedZoneId(null);
        setSelectedBayId(null);
      }
    },
    [draft, persist],
  );

  const deleteSelected = useCallback(() => {
    if (selectedZoneId) {
      persist({
        ...draft,
        addedZones: draft.addedZones.filter(z => z.id !== selectedZoneId),
      });
      setSelectedZoneId(null);
      return;
    }
    if (selectedGateId) {
      persist({
        ...draft,
        addedGates: draft.addedGates.filter(g => g.id !== selectedGateId),
      });
      setSelectedGateId(null);
    }
  }, [draft, persist, selectedGateId, selectedZoneId]);

  const resetDraft = useCallback(() => {
    if (!baseLayout || !depotCode) return;
    clearLayoutDraft(depotCode, baseLayout.id);
    setDraft(emptyDraft());
    setSelectedBayId(null);
    setSelectedZoneId(null);
    setSelectedGateId(null);
  }, [baseLayout, depotCode]);

  const copyDraft = useCallback(async () => {
    if (!layout || !baseLayout) return false;
    try {
      await navigator.clipboard.writeText(exportLayoutDraft(baseLayout, draft));
      return true;
    } catch {
      return false;
    }
  }, [baseLayout, draft, layout]);

  const clearSelection = useCallback(() => {
    setSelectedBayId(null);
    setSelectedZoneId(null);
    setSelectedGateId(null);
  }, []);

  return {
    layout,
    editMode,
    setEditMode,
    tool,
    setTool,
    draft,
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
    addedZones: draft.addedZones,
    addedGates: draft.addedGates,
  };
}
