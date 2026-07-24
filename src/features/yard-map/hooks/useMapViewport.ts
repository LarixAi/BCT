import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutBounds } from "@/features/yard-map/lib/layout-content-bounds";

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;

export interface MapViewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function useMapViewport(bounds: LayoutBounds, panEnabled = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<MapViewport>({ scale: 1, offsetX: 0, offsetY: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el || bounds.width <= 0 || bounds.height <= 0) return;
    // Skip until the map container has a real layout (avoids invisible map in edit mode).
    if (el.clientWidth < 64 || el.clientHeight < 64) return;
    const padding = 20;
    const w = el.clientWidth - padding * 2;
    const h = el.clientHeight - padding * 2;
    const scale = Math.min(w / bounds.width, h / bounds.height);
    const offsetX = el.clientWidth / 2 - (bounds.x + bounds.width / 2) * scale;
    const offsetY = el.clientHeight / 2 - (bounds.y + bounds.height / 2) * scale;
    setViewport({ scale, offsetX, offsetY });
  }, [bounds.x, bounds.y, bounds.width, bounds.height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      fitToScreen();
    });
    observer.observe(el);
    fitToScreen();
    return () => observer.disconnect();
  }, [fitToScreen]);

  const zoomBy = useCallback((delta: number) => {
    setViewport(v => {
      const el = containerRef.current;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale + delta));
      if (!el || next === v.scale) return v;

      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      const ratio = next / v.scale;
      return {
        scale: next,
        offsetX: cx - (cx - v.offsetX) * ratio,
        offsetY: cy - (cy - v.offsetY) * ratio,
      };
    });
  }, []);

  const resetView = useCallback(() => {
    setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!panEnabled || e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: viewport.offsetX, oy: viewport.offsetY };
  }, [panEnabled, viewport.offsetX, viewport.offsetY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panEnabled) return;
    const drag = dragRef.current;
    if (!drag) return;
    setViewport(v => ({
      ...v,
      offsetX: drag.ox + (e.clientX - drag.x),
      offsetY: drag.oy + (e.clientY - drag.y),
    }));
  }, [panEnabled]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomBy(delta);
  }, [zoomBy]);

  return {
    containerRef,
    viewport,
    fitToScreen,
    zoomIn: () => zoomBy(0.2),
    zoomOut: () => zoomBy(-0.2),
    resetView,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
  };
}
