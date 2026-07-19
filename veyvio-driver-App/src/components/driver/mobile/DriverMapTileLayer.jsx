import { useEffect } from "react";
import { TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "@maplibre/maplibre-gl-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { getDriverMapStyle, DRIVER_MAP_ATTRIBUTION } from "@/lib/buildDriverMapStyle";

/**
 * Carto light raster — paints immediately and stays visible.
 * OpenFreeMap vector via MapLibre is optional (VITE_DRIVER_MAP_GL=true) because
 * the GL canvas often stays blank on first open inside flex / animated shells.
 */
const CARTO_LIGHT_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const USE_MAPLIBRE_GL = import.meta.env.VITE_DRIVER_MAP_GL === "true";

function RasterBase({ showAttribution }) {
  return (
    <TileLayer
      url={CARTO_LIGHT_URL}
      subdomains="abcd"
      attribution={
        showAttribution
          ? '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          : ""
      }
      maxZoom={20}
      // Keep under overlay panes (route / markers)
      zIndex={0}
    />
  );
}

function MapLibreEnhancement({ showAttribution }) {
  const map = useMap();

  useEffect(() => {
    let glLayer = null;
    let cancelled = false;

    const paint = () => {
      try {
        map.invalidateSize({ animate: false });
        glLayer?.getMaplibreMap?.()?.resize?.();
      } catch {
        /* ignore */
      }
    };

    getDriverMapStyle()
      .then((style) => {
        if (cancelled) return;
        glLayer = L.maplibreGL({
          style,
          attribution: showAttribution ? DRIVER_MAP_ATTRIBUTION : "",
        }).addTo(map);

        const glMap = glLayer.getMaplibreMap();
        const finish = () => {
          paint();
          window.setTimeout(paint, 200);
          window.setTimeout(paint, 600);
        };
        if (glMap.loaded()) finish();
        else glMap.once("load", finish);

        glMap.on("error", (event) => {
          console.warn("[DriverMap] MapLibre error — keeping raster base:", event?.error ?? event);
          if (glLayer) {
            try {
              map.removeLayer(glLayer);
            } catch {
              /* ignore */
            }
            glLayer = null;
          }
        });
      })
      .catch((err) => {
        console.warn("[DriverMap] Style unavailable — raster base only:", err);
      });

    return () => {
      cancelled = true;
      if (glLayer) {
        try {
          map.removeLayer(glLayer);
        } catch {
          /* ignore */
        }
      }
    };
  }, [map, showAttribution]);

  return null;
}

export default function DriverMapTileLayer({ showAttribution = false }) {
  return (
    <>
      <RasterBase showAttribution={showAttribution} />
      {USE_MAPLIBRE_GL ? <MapLibreEnhancement showAttribution={showAttribution} /> : null}
    </>
  );
}
