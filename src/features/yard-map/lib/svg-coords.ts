import type { MapViewport } from "@/features/yard-map/hooks/useMapViewport";

/** Convert a screen pointer position to SVG canvas coordinates. */
export function clientToSvg(
  clientX: number,
  clientY: number,
  container: HTMLElement,
  viewport: MapViewport,
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  return {
    x: (localX - viewport.offsetX) / viewport.scale,
    y: (localY - viewport.offsetY) / viewport.scale,
  };
}
