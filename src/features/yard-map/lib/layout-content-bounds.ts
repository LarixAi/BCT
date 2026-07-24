import type { LayoutGate, LayoutZone, YardLayoutDefinition } from "@veyvio/yard";

export type LayoutBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_PADDING = 32;

function growBounds(
  bounds: LayoutBounds,
  x: number,
  y: number,
  width: number,
  height: number,
): LayoutBounds {
  const x2 = x + width;
  const y2 = y + height;
  if (!Number.isFinite(bounds.width)) {
    return { x, y, width, height };
  }
  const minX = Math.min(bounds.x, x);
  const minY = Math.min(bounds.y, y);
  const maxX = Math.max(bounds.x + bounds.width, x2);
  const maxY = Math.max(bounds.y + bounds.height, y2);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Bounding box of all bays, zones, and gates — used for viewBox and fit-to-screen. */
export function layoutContentBounds(
  layout: YardLayoutDefinition,
  padding = DEFAULT_PADDING,
): LayoutBounds {
  let bounds: LayoutBounds = { x: 0, y: 0, width: 0, height: 0 };
  let hasContent = false;

  for (const bay of layout.bays) {
    const { x, y, width, height } = bay.geometry;
    bounds = hasContent
      ? growBounds(bounds, x, y, width, height)
      : growBounds(bounds, x, y, width, height);
    hasContent = true;
  }

  for (const zone of layout.zones) {
    for (const [px, py] of zone.polygon) {
      bounds = hasContent
        ? growBounds(bounds, px, py, 1, 1)
        : growBounds(bounds, px, py, 1, 1);
      hasContent = true;
    }
  }

  for (const gate of layout.gates) {
    const { x, y, width, height } = gate.geometry;
    bounds = hasContent
      ? growBounds(bounds, x, y, width, height)
      : growBounds(bounds, x, y, width, height);
    hasContent = true;
  }

  if (!hasContent) {
    return { x: 0, y: 0, width: layout.canvasWidth, height: layout.canvasHeight };
  }

  const paddedMinX = Math.max(0, bounds.x - padding);
  const paddedMinY = Math.max(0, bounds.y - padding);
  const paddedMaxX = Math.max(layout.canvasWidth, bounds.x + bounds.width + padding);
  const paddedMaxY = Math.max(layout.canvasHeight, bounds.y + bounds.height + padding);

  return {
    x: paddedMinX,
    y: paddedMinY,
    width: paddedMaxX - paddedMinX,
    height: paddedMaxY - paddedMinY,
  };
}
