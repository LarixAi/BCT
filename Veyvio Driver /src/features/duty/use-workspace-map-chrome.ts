import { useEffect, useMemo, useState, type RefObject } from "react";
import { useDriverStore } from "@/store/driver";
import { shouldShowVehicleCheckRequiredStrip } from "@/domain/home/vehicle-check-status-strip";
import { SHEET_HEIGHT_PX } from "@/domain/trips/duties-workspace-view";
import {
  clampMapFabBottomPx,
  maxExpandedSheetHeightPx,
  workspaceTopChromeOffsetCss,
} from "@/domain/driver/workspace-map-chrome";

/**
 * Workspace-local measurements for map hubs: chrome top offset, expanded sheet cap, FAB clamp.
 */
export function useWorkspaceMapChrome(
  containerRef: RefObject<HTMLElement | null>,
  opts?: { fabCount?: number },
) {
  const homeSummary = useDriverStore((s) => s.homeSummary);
  const stripActive = shouldShowVehicleCheckRequiredStrip(homeSummary);
  const [workspaceHeight, setWorkspaceHeight] = useState(0);
  const [safeAreaTopPx, setSafeAreaTopPx] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      if (typeof window !== "undefined") setWorkspaceHeight(window.innerHeight);
      return;
    }

    const measure = () => {
      setWorkspaceHeight(el.getBoundingClientRect().height);
      // Probe safe-area via a temporary element (env() is not readable on :root alone)
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)";
      document.body.appendChild(probe);
      const pad = Number.parseFloat(getComputedStyle(probe).paddingTop) || 0;
      document.body.removeChild(probe);
      setSafeAreaTopPx(pad);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef]);

  const maxExpandedHeight = useMemo(
    () =>
      maxExpandedSheetHeightPx(workspaceHeight || (typeof window !== "undefined" ? window.innerHeight : 800), {
        stripActive,
        safeAreaTopPx,
        mediumFloorPx: SHEET_HEIGHT_PX.medium,
      }),
    [workspaceHeight, stripActive, safeAreaTopPx],
  );

  const topChromeStyle = useMemo(
    () => ({ top: workspaceTopChromeOffsetCss(stripActive) }),
    [stripActive],
  );

  function fabBottom(liveSheetHeightPx: number): number {
    return clampMapFabBottomPx(
      liveSheetHeightPx,
      workspaceHeight || (typeof window !== "undefined" ? window.innerHeight : 800),
      {
        stripActive,
        safeAreaTopPx,
        fabCount: opts?.fabCount ?? 2,
      },
    );
  }

  return {
    stripActive,
    workspaceHeight,
    maxExpandedHeight,
    topChromeStyle,
    fabBottom,
  };
}
