import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  SHEET_HEIGHT_PX,
  type DutiesSheetSize,
} from "@/domain/trips/duties-workspace-view";

const SIZES: DutiesSheetSize[] = ["collapsed", "medium", "expanded"];
const DRAG_THRESHOLD_PX = 8;
const VELOCITY_FLIP = 0.45; // px/ms — flick flips one step

function baseExpandedHeightPx(): number {
  if (typeof window === "undefined") return SHEET_HEIGHT_PX.expanded;
  return Math.min(SHEET_HEIGHT_PX.expanded, window.innerHeight * 0.78);
}

export function heightForSize(size: DutiesSheetSize, maxExpandedHeight?: number): number {
  if (size === "expanded") {
    const base = baseExpandedHeightPx();
    if (maxExpandedHeight == null || maxExpandedHeight <= 0) return base;
    return Math.min(base, Math.max(SHEET_HEIGHT_PX.medium, maxExpandedHeight));
  }
  return SHEET_HEIGHT_PX[size];
}

function nearestSize(height: number, maxExpandedHeight?: number): DutiesSheetSize {
  let best: DutiesSheetSize = "medium";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const size of SIZES) {
    const dist = Math.abs(heightForSize(size, maxExpandedHeight) - height);
    if (dist < bestDist) {
      bestDist = dist;
      best = size;
    }
  }
  return best;
}

function stepFrom(size: DutiesSheetSize, direction: 1 | -1): DutiesSheetSize {
  const idx = SIZES.indexOf(size);
  return SIZES[Math.max(0, Math.min(SIZES.length - 1, idx + direction))] ?? size;
}

/**
 * Finger / pointer drag for the Duties / Checks / Messages bottom sheet.
 * Drag up expands, drag down collapses; release snaps to nearest (or flick).
 * `maxExpandedHeight` keeps the sheet below the floating top chrome.
 */
export function useDutiesSheetDrag(
  sheetSize: DutiesSheetSize,
  setSheetSize: (size: DutiesSheetSize | ((prev: DutiesSheetSize) => DutiesSheetSize)) => void,
  options?: { maxExpandedHeight?: number },
) {
  const maxExpandedHeight = options?.maxExpandedHeight;
  const maxExpandedRef = useRef(maxExpandedHeight);
  maxExpandedRef.current = maxExpandedHeight;

  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const startSize = useRef<DutiesSheetSize>(sheetSize);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const activePointer = useRef<number | null>(null);
  const moved = useRef(false);
  const dragOffsetRef = useRef(0);

  const settle = useCallback(
    (currentHeight: number) => {
      const base = startSize.current;
      const cap = maxExpandedRef.current;
      let next = nearestSize(currentHeight, cap);

      if (Math.abs(velocity.current) > VELOCITY_FLIP) {
        next = velocity.current > 0 ? stepFrom(base, -1) : stepFrom(base, 1);
      }

      setSheetSize(next);
      dragOffsetRef.current = 0;
      setDragOffset(0);
      setDragging(false);
      velocity.current = 0;
      activePointer.current = null;
      moved.current = false;
    },
    [setSheetSize],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      activePointer.current = event.pointerId;
      startY.current = event.clientY;
      lastY.current = event.clientY;
      lastT.current = performance.now();
      startSize.current = sheetSize;
      startHeight.current = heightForSize(sheetSize, maxExpandedRef.current);
      velocity.current = 0;
      moved.current = false;
      dragOffsetRef.current = 0;
      setDragging(true);
      setDragOffset(0);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [sheetSize],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    const dy = event.clientY - startY.current;
    if (!moved.current && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    moved.current = true;

    const now = performance.now();
    const dt = Math.max(1, now - lastT.current);
    velocity.current = (event.clientY - lastY.current) / dt;
    lastY.current = event.clientY;
    lastT.current = now;

    const cap = maxExpandedRef.current;
    const nextHeight = startHeight.current - dy;
    const minH = heightForSize("collapsed");
    const maxH = heightForSize("expanded", cap);
    const clamped = Math.max(minH, Math.min(maxH, nextHeight));
    const offset = clamped - startHeight.current;
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointer.current !== event.pointerId) return;
      if (!moved.current) {
        setSheetSize((s) =>
          s === "collapsed" ? "medium" : s === "medium" ? "expanded" : "collapsed",
        );
        dragOffsetRef.current = 0;
        setDragOffset(0);
        setDragging(false);
        activePointer.current = null;
        return;
      }
      settle(startHeight.current + dragOffsetRef.current);
    },
    [settle, setSheetSize],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointer.current !== event.pointerId) return;
      settle(startHeight.current + dragOffsetRef.current);
    },
    [settle],
  );

  const liveHeight = heightForSize(sheetSize, maxExpandedHeight) + dragOffset;

  const bindDrag = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    style: { touchAction: "none" as const },
  };

  return {
    dragging,
    liveHeight,
    bindDrag,
  };
}
