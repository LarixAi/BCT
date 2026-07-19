/**
 * Phase 7 — pure MapLibre GL JS rendering for the Jobs turn-by-turn map.
 *
 * Why a separate component (instead of patching the Leaflet view): the
 * camera, bearing, pitch, and polyline rendering all benefit from
 * MapLibre's native GL pipeline. Doing it in-place would require ripping
 * out half of `DriverJobsMapView` and would block rollback. This file
 * runs **only** when `VITE_NAV_USE_MAPLIBRE=true`; the existing Leaflet
 * implementation stays the default until a real drive validates the swap.
 *
 * Responsibilities:
 *   - Mount a `maplibregl.Map` with the driver style (Phase 0 tiles).
 *   - Render the route polyline (ahead-of-driver, simplified + trimmed)
 *     as a native `line` layer.
 *   - Render stops as a `circle` + `symbol` pair.
 *   - Render the driver marker as a `maplibregl.Marker` so we can rotate
 *     it (or the map) cleanly without CSS-pane hacks.
 *   - Camera: `map.easeTo({ center, bearing, pitch, zoom, duration })` on
 *     each engine update; native shortest-arc bearing handling.
 *   - Free-pan: detect via the `dragstart` event's `originalEvent` so we
 *     don't mistake our own programmatic `easeTo` for a user drag.
 *
 * The component is deliberately verbose-but-flat — this is the kind of
 * imperative wiring where splitting into many tiny hooks adds reading
 * cost without buying much.
 */
import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getDriverMapStyle } from "@/lib/buildDriverMapStyle";
import { NAV_CAMERA_MODES } from "@/lib/navigation/navigationCamera";
import { createDriverLocationIcon } from "@/components/driver/mobile/driverLocationIcon";
import {
  EMPTY_FEATURE_COLLECTION,
  buildRouteAheadGeoJson,
  buildStopsGeoJson,
} from "@/lib/navigation/maplibreRouteData";

const ROUTE_SOURCE_ID = "nav-route";
const ROUTE_LAYER_ID = "nav-route-line";
const ROUTE_LAYER_CASING_ID = "nav-route-line-casing";
const STOPS_SOURCE_ID = "nav-stops";
const STOPS_CIRCLE_LAYER_ID = "nav-stops-circle";
const STOPS_LABEL_LAYER_ID = "nav-stops-label";

/** Camera tuning constants (mirrors Leaflet behaviour, native maths). */
const ZOOM_AT_REST = 17;
const ZOOM_AT_HIGH_SPEED = 15.25;
const HIGH_SPEED_MPS = 25;
const PITCH_AT_REST = 0;
const PITCH_AT_SPEED = 45;
const PITCH_RAMP_SPEED_MPS = 6;
const FOLLOW_ANIMATE_MS = 350;
const STATIONARY_LOCK_SPEED_MPS = 1.4;

function speedToZoom(speedMps) {
  const speed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  if (speed >= HIGH_SPEED_MPS) return ZOOM_AT_HIGH_SPEED;
  const t = speed / HIGH_SPEED_MPS;
  return ZOOM_AT_REST + (ZOOM_AT_HIGH_SPEED - ZOOM_AT_REST) * (t * t);
}

function speedToPitch(speedMps) {
  const speed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  if (speed <= 0) return PITCH_AT_REST;
  if (speed >= PITCH_RAMP_SPEED_MPS) return PITCH_AT_SPEED;
  return PITCH_AT_REST + (PITCH_AT_SPEED - PITCH_AT_REST) * (speed / PITCH_RAMP_SPEED_MPS);
}

function isMoving(speedMps) {
  const v = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  return v >= STATIONARY_LOCK_SPEED_MPS;
}

export default function MapLibreNavigationMap({
  lat,
  lng,
  heading = null,
  speed = null,
  routeAheadGeoJson,
  stopsGeoJson,
  cameraMode = NAV_CAMERA_MODES.FOLLOW_HEADING,
  followEnabled = true,
  staleAgeMs = null,
  recenterTrigger = 0,
  fitRouteTrigger = 0,
  destination = null,
  onUserPan,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const styleReadyRef = useRef(false);
  const driverMarkerRef = useRef(null);
  const lastFitTriggerRef = useRef(0);
  const lastRecenterTriggerRef = useRef(recenterTrigger);

  // --- 1. Mount the map once -------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return undefined;
    let map;
    let cancelled = false;

    void getDriverMapStyle().then((style) => {
      if (cancelled || !containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [lng ?? 0, lat ?? 51.5],
        zoom: ZOOM_AT_REST,
        bearing: 0,
        pitch: 0,
        attributionControl: false,
        // Mobile-friendly: keep zoom + drag, drop scroll wheel + double-click
        // zoom which interfere with one-handed driving use.
        scrollZoom: false,
        doubleClickZoom: false,
        // Map rotation comes from the engine, not the user — disable native
        // rotate gestures to avoid the camera fighting the heading.
        dragRotate: false,
        pitchWithRotate: false,
        touchZoomRotate: true,
        // Don't let the user accidentally tilt; pitch is camera-controlled.
        touchPitch: false,
      });
      // touchZoomRotate is enabled above — we disable just the rotate axis.
      map.touchZoomRotate.disableRotation();

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;
        styleReadyRef.current = true;

        // Route source/layers — added once, data swapped in via setData.
        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: EMPTY_FEATURE_COLLECTION,
          tolerance: 0.5,
        });
        map.addLayer({
          id: ROUTE_LAYER_CASING_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          paint: {
            "line-color": "#FFFFFF",
            "line-width": ["interpolate", ["linear"], ["zoom"], 12, 8, 18, 14],
            "line-opacity": 0.9,
            "line-blur": 0.5,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          paint: {
            "line-color": "#2563EB",
            "line-width": ["interpolate", ["linear"], ["zoom"], 12, 4, 18, 9],
            "line-opacity": 0.95,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });

        // Stops source + layers (circle background + label on top).
        map.addSource(STOPS_SOURCE_ID, {
          type: "geojson",
          data: EMPTY_FEATURE_COLLECTION,
        });
        map.addLayer({
          id: STOPS_CIRCLE_LAYER_ID,
          type: "circle",
          source: STOPS_SOURCE_ID,
          paint: {
            "circle-color": ["get", "colour"],
            "circle-radius": 14,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#FFFFFF",
          },
        });
        map.addLayer({
          id: STOPS_LABEL_LAYER_ID,
          type: "symbol",
          source: STOPS_SOURCE_ID,
          layout: {
            "text-field": ["get", "label"],
            "text-font": ["Noto Sans Bold"],
            "text-size": 12,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: { "text-color": "#FFFFFF" },
        });

        // Push initial source data if we already have it.
        if (routeAheadGeoJson) {
          map.getSource(ROUTE_SOURCE_ID)?.setData(routeAheadGeoJson);
        }
        if (stopsGeoJson) {
          map.getSource(STOPS_SOURCE_ID)?.setData(stopsGeoJson);
        }
      });

      // Phase-7 free-pan detection — `originalEvent` is only set when the
      // gesture comes from the user (touch/mouse), not from our own easeTo.
      map.on("dragstart", (e) => {
        if (e?.originalEvent) onUserPan?.();
      });
      map.on("rotatestart", (e) => {
        if (e?.originalEvent) onUserPan?.();
      });
      map.on("zoomstart", (e) => {
        if (e?.originalEvent) onUserPan?.();
      });
    });

    const paint = () => {
      try {
        mapRef.current?.resize?.();
      } catch {
        /* ignore */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") paint();
    };

    let observer = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      observer = new ResizeObserver(() => paint());
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", paint);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      styleReadyRef.current = false;
      observer?.disconnect();
      window.removeEventListener("resize", paint);
      document.removeEventListener("visibilitychange", onVisibility);
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      if (map) map.remove();
      mapRef.current = null;
    };
    // Mount-only: subsequent prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 2. Driver marker (created lazily after style load) -------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return undefined;

    const ensure = () => {
      if (!styleReadyRef.current) {
        // Try again on next style load.
        map.once("load", ensure);
        return;
      }
      const stale = (staleAgeMs ?? 0) > 2000;
      // We render the SAME divIcon HTML the Leaflet build uses, just hosted
      // in a maplibre Marker. Keeps look + stale-ring animation identical.
      const icon = createDriverLocationIcon(40, null, { stale });
      const el = document.createElement("div");
      // `createDriverLocationIcon` returns a Leaflet DivIcon — we need the
      // raw HTML out of it.
      el.innerHTML = icon?.options?.html ?? "";
      el.style.width = "40px";
      el.style.height = "40px";
      el.style.pointerEvents = "none";
      // Inner pulse ring uses keyframes from the icon HTML; it works inside
      // any DOM container.

      if (driverMarkerRef.current) driverMarkerRef.current.remove();
      driverMarkerRef.current = new maplibregl.Marker({
        element: el,
        rotationAlignment: "map",
      })
        .setLngLat([lng, lat])
        .addTo(map);
    };

    ensure();
    return undefined;
    // We intentionally **only** re-run when staleAgeMs crosses the
    // threshold — moving the marker is handled by the camera effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(staleAgeMs ?? 0) > 2000]);

  // --- 3. Move the driver marker on every fix --------------------------------
  useEffect(() => {
    const marker = driverMarkerRef.current;
    if (!marker || lat == null || lng == null) return;
    marker.setLngLat([lng, lat]);
  }, [lat, lng]);

  // --- 4. Marker rotation ----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    const marker = driverMarkerRef.current;
    if (!map || !marker) return;
    if (!Number.isFinite(heading)) return;

    // Match Phase-3 rule: the **map** rotates to heading while moving;
    // when stationary or in NORTH_UP, the **marker** rotates instead.
    const moving = isMoving(speed);
    if (cameraMode === NAV_CAMERA_MODES.FOLLOW_HEADING && moving) {
      marker.setRotation(0);
    } else {
      marker.setRotation(heading);
    }
  }, [heading, speed, cameraMode]);

  // --- 5. Push route GeoJSON whenever the engine produces a new ahead-of-driver
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    map.getSource(ROUTE_SOURCE_ID)?.setData(routeAheadGeoJson ?? EMPTY_FEATURE_COLLECTION);
  }, [routeAheadGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    map.getSource(STOPS_SOURCE_ID)?.setData(stopsGeoJson ?? EMPTY_FEATURE_COLLECTION);
  }, [stopsGeoJson]);

  // --- 6. Camera controller (the heart of Phase 7) ---------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    if (!followEnabled) return;
    if (cameraMode === NAV_CAMERA_MODES.ROUTE_OVERVIEW) return;
    if (lat == null || lng == null) return;

    const moving = isMoving(speed);
    const validHeading = Number.isFinite(heading) ? heading : null;

    let bearing;
    let pitch;
    if (cameraMode === NAV_CAMERA_MODES.FOLLOW_HEADING && validHeading != null && moving) {
      bearing = validHeading;
      pitch = speedToPitch(speed);
    } else {
      bearing = 0;
      pitch = 0;
    }

    map.easeTo({
      center: [lng, lat],
      zoom: speedToZoom(speed),
      bearing,
      pitch,
      duration: FOLLOW_ANIMATE_MS,
    });
  }, [lat, lng, heading, speed, cameraMode, followEnabled]);

  // --- 7. Recenter trigger — explicit driver action -------------------------
  useEffect(() => {
    if (recenterTrigger === lastRecenterTriggerRef.current) return;
    lastRecenterTriggerRef.current = recenterTrigger;
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    map.easeTo({
      center: [lng, lat],
      zoom: speedToZoom(speed),
      bearing:
        cameraMode === NAV_CAMERA_MODES.FOLLOW_HEADING && Number.isFinite(heading)
          ? heading
          : 0,
      pitch:
        cameraMode === NAV_CAMERA_MODES.FOLLOW_HEADING && isMoving(speed)
          ? speedToPitch(speed)
          : 0,
      duration: 600,
    });
  }, [recenterTrigger, lat, lng, heading, speed, cameraMode]);

  // --- 8. Fit-route overview -------------------------------------------------
  useEffect(() => {
    if (!fitRouteTrigger || fitRouteTrigger === lastFitTriggerRef.current) return;
    lastFitTriggerRef.current = fitRouteTrigger;
    const map = mapRef.current;
    if (!map) return;

    const features = routeAheadGeoJson?.features ?? [];
    const coords = features.flatMap((f) => f.geometry?.coordinates ?? []);
    if (lat != null && lng != null) coords.unshift([lng, lat]);
    if (destination?.latitude != null && destination?.longitude != null) {
      coords.push([destination.longitude, destination.latitude]);
    }
    if (coords.length < 2) return;

    let west = coords[0][0];
    let east = coords[0][0];
    let south = coords[0][1];
    let north = coords[0][1];
    for (const [x, y] of coords) {
      if (x < west) west = x;
      if (x > east) east = x;
      if (y < south) south = y;
      if (y > north) north = y;
    }
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: { top: 80, bottom: 200, left: 80, right: 80 }, bearing: 0, pitch: 0, duration: 700 },
    );
  }, [fitRouteTrigger, routeAheadGeoJson, lat, lng, destination]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}

// Re-exported for tests + the docs.
export { speedToZoom, speedToPitch, isMoving };
