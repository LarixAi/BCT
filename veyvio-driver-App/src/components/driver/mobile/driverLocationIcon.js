import L from "leaflet";
import { DRIVER_MAP_COLORS } from "@/lib/driverMapTheme";

/**
 * Driver location pin.
 *
 * @param {number}  size              Pixel size of the marker hit area.
 * @param {?number} headingDeg        Compass-rotation for the inner arrow.
 *                                    When `null` the arrow points north and
 *                                    the map should be rotated instead.
 * @param {object}  [opts]
 * @param {boolean} [opts.stale=false]  When true, render a soft pulsing ring
 *                                      to signal "no recent GPS fix" — used
 *                                      with the engine's `staleAgeMs > 2 s`
 *                                      threshold (Phase 3).
 */
export function createDriverLocationIcon(size = 40, headingDeg = null, opts = {}) {
  const stale = opts.stale === true;
  const half = size / 2;
  const iconSize = Math.round(size * 0.5);
  const rotate =
    headingDeg != null && Number.isFinite(headingDeg) && headingDeg >= 0
      ? `transform:rotate(${headingDeg}deg);`
      : "";

  // Inline keyframes — Leaflet div icons can't reach Tailwind classes.
  const stalePulse = stale
    ? `<style>@keyframes nav-stale-pulse{0%{transform:scale(0.85);opacity:0.7;}100%{transform:scale(1.6);opacity:0;}}</style>
       <div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${DRIVER_MAP_COLORS.markerBorder};animation:nav-stale-pulse 1.4s ease-out infinite;pointer-events:none;"></div>`
    : "";

  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;position:relative;">
      ${stalePulse}
      <div style="width:${size}px;height:${size}px;background:white;border-radius:50%;border:2px solid ${DRIVER_MAP_COLORS.markerBorder};box-shadow:0 4px 12px rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;position:relative;">
        <svg style="${rotate}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="black"><path d="M12 2L4 20l8-4 8 4L12 2z"/></svg>
      </div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

export function createDriverLocationDot(size = 14) {
  const half = size / 2;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:white;border:2px solid ${DRIVER_MAP_COLORS.markerBorder};border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}
