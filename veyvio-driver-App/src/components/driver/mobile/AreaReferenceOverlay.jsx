/**
 * Semi-transparent reference screenshot overlay for calibrating area polygons.
 * Enable with ?areaDebug=1 on /driver/area-preferences
 */
import { ImageOverlay } from "react-leaflet";
import {
  AREA_REFERENCE_ZOOMED_BOUNDS,
  AREA_REFERENCE_WIDE_BOUNDS,
} from "@/lib/driverAreaPreferences";

export default function AreaReferenceOverlay({ variant = "zoomed" }) {
  const isWide = variant === "wide";
  return (
    <ImageOverlay
      url={isWide ? "/driver-area-reference-wide-map.png" : "/driver-area-reference-zoomed-map.png"}
      bounds={isWide ? AREA_REFERENCE_WIDE_BOUNDS : AREA_REFERENCE_ZOOMED_BOUNDS}
      opacity={0.42}
      zIndex={350}
    />
  );
}
