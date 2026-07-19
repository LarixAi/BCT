import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer } from "react-leaflet";
import { ChevronLeft, Shield } from "lucide-react";
import { DriverHeaderIconButton } from "@/components/driver/operational/DriverHeaderIconButton";
import DriverMapTileLayer from "@/components/driver/mobile/DriverMapTileLayer";
import SmoothDriverMarker from "@/components/driver/mobile/SmoothDriverMarker";
import FollowDriverMap from "@/components/driver/mobile/FollowDriverMap";
import JobStopsRouteMap from "@/components/driver/jobs/JobStopsRouteMap";
import JobNavigationRouteLayer from "@/components/driver/jobs/JobNavigationRouteLayer";
import NavigationMapCamera from "@/components/driver/jobs/NavigationMapCamera";
import MapNavigationControls from "@/components/driver/jobs/map-controls/MapNavigationControls";
import DriverNavInstructionCard from "@/components/driver/jobs/DriverNavInstructionCard";
import DriverJobsMapSheet from "@/components/driver/jobs/DriverJobsMapSheet";
import { createDriverLocationIcon } from "@/components/driver/mobile/driverLocationIcon";
import { DRIVER_MAP_CLASS } from "@/lib/driverMapTheme";
import { DRIVER_MAP_LEAFLET_OPTIONS } from "@/lib/driverMapLeafletOptions";
import { DRIVER_SAFE_TOP } from "@/lib/driverSafeArea";
import { useDriverMapPosition, DEFAULT_MAP_LAT, DEFAULT_MAP_LNG } from "@/hooks/useDriverMapPosition";
import { useJobTurnByTurnNavigation } from "@/hooks/useJobTurnByTurnNavigation";
import { useFusedHeading } from "@/hooks/useFusedHeading";
import { getJobExecutionState } from "@/lib/jobExecutionState";
import { formatThenStep } from "@/lib/jobs/journeyMapTheme";
import { NAV_CAMERA_MODES } from "@/lib/navigation/navigationCamera";
import { logNavigationTelemetry } from "@/lib/navigation/navigationTelemetry";
import {
  isNavigationVoiceEnabled,
} from "@/lib/navigation/navigationVoicePrefs";
import MapUserPanListener from "@/components/driver/jobs/MapUserPanListener";
import MapLayoutFix from "@/components/driver/jobs/MapLayoutFix";
import MapLibreNavigationMap from "@/components/driver/jobs/MapLibreNavigationMap";
import {
  buildRouteAheadGeoJson,
  buildStopsGeoJson,
} from "@/lib/navigation/maplibreRouteData";

const USE_MAPLIBRE = import.meta.env.VITE_NAV_USE_MAPLIBRE === "true";

/**
 * Fullscreen jobs map — full-bleed map, instruction card + original bottom sheet.
 */
export default function DriverJobsMapView({
  driver,
  activeJob,
  onClose,
  onSafetyClick,
  onJobAction,
  actionBusy,
  onJobReload,
}) {
  const { lat: driverLat, lng: driverLng } = useDriverMapPosition(driver.current_lat, driver.current_lng);
  const mapCenterRef = useRef([
    driver.current_lat ?? DEFAULT_MAP_LAT,
    driver.current_lng ?? DEFAULT_MAP_LNG,
  ]);

  const [cameraMode, setCameraMode] = useState(NAV_CAMERA_MODES.FOLLOW_HEADING);
  const [markerHeading, setMarkerHeading] = useState(null);
  const [fitRouteTrigger, setFitRouteTrigger] = useState(0);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(isNavigationVoiceEnabled);
  const [freePanned, setFreePanned] = useState(false);
  /** Bumps Leaflet invalidateSize when chrome around the map changes. */
  const [layoutRevision, setLayoutRevision] = useState(0);

  const execution = useMemo(
    () => getJobExecutionState(activeJob, { isActive: true }),
    [activeJob],
  );

  const navigationEnabled = execution.navigationActive;
  const previewStops = useMemo(() => activeJob?.stops ?? [], [activeJob]);

  useEffect(() => {
    setLayoutRevision((n) => n + 1);
  }, [
    navigationEnabled,
    execution.phase,
    execution.currentStop?.id,
    activeJob?.id,
  ]);

  const navigation = useJobTurnByTurnNavigation({
    enabled: navigationEnabled,
    destinationStop: execution.currentStop,
    voiceEnabled: voiceEnabled && cameraMode !== NAV_CAMERA_MODES.ROUTE_OVERVIEW,
    job: activeJob,
    driver,
  });

  const nextStepLabel = useMemo(() => {
    const steps = navigation.route?.steps;
    if (!steps?.length) return null;
    const next = steps[navigation.currentStepIndex + 1];
    return formatThenStep(next);
  }, [navigation.route?.steps, navigation.currentStepIndex]);

  const displayLat = navigationEnabled && navigation.driverLocation
    ? navigation.driverLocation.latitude
    : driverLat;
  const displayLng = navigationEnabled && navigation.driverLocation
    ? navigation.driverLocation.longitude
    : driverLng;

  const fusedHeading = useFusedHeading({
    gpsHeading: navigation.driverLocation?.heading,
    gpsSpeed: navigation.driverLocation?.speed,
    enabled: navigationEnabled,
  });

  const driverHeading = navigationEnabled
    ? (fusedHeading ?? navigation.driverLocation?.heading ?? 0)
    : 0;

  useEffect(() => {
    if (navigationEnabled) {
      setCameraMode(NAV_CAMERA_MODES.FOLLOW_HEADING);
      setFitRouteTrigger(0);
      setRecenterTrigger((t) => t + 1);
      setFreePanned(false);
    }
  }, [navigationEnabled, execution.currentStop?.id]);

  useEffect(() => {
    if (!freePanned) return undefined;
    const id = window.setTimeout(() => {
      setFreePanned(false);
      setRecenterTrigger((t) => t + 1);
    }, 5000);
    return () => window.clearTimeout(id);
  }, [freePanned]);

  useEffect(() => {
    if (!activeJob?.id || !driver?.id) return;
    void import("@/services/fleet-tracking.service").then(({ ensureJobLinkedToFleetSession }) =>
      ensureJobLinkedToFleetSession(driver, {
        jobId: activeJob.id,
        vehicleId: activeJob.assignment?.vehicleId ?? activeJob.vehicleId ?? null,
      }),
    );
  }, [activeJob?.id, activeJob?.assignment?.vehicleId, activeJob?.vehicleId, driver]);

  const fixIsStale = navigationEnabled && (navigation.staleAgeMs ?? 0) > 2000;

  const driverIcon = useMemo(
    () =>
      createDriverLocationIcon(40, navigationEnabled ? markerHeading : null, {
        stale: fixIsStale,
      }),
    [navigationEnabled, markerHeading, fixIsStale],
  );

  const routeLineKey = `${activeJob?.id ?? "job"}-${execution.currentStop?.id ?? "stop"}-${navigation.leafletPositions.length}`;

  const routeAheadGeoJson = useMemo(
    () =>
      buildRouteAheadGeoJson({
        leafletPositions: navigation.leafletPositions,
        alongRouteM: navigation.alongRouteM,
      }),
    [navigation.leafletPositions, navigation.alongRouteM],
  );
  const stopsGeoJson = useMemo(() => buildStopsGeoJson(previewStops), [previewStops]);

  const handleShowEntireRoute = useCallback(() => {
    setCameraMode(NAV_CAMERA_MODES.ROUTE_OVERVIEW);
    setFitRouteTrigger((t) => t + 1);
    setFreePanned(false);
    void logNavigationTelemetry({
      driver,
      job: activeJob,
      action: "driver_route_overview",
    });
  }, [driver, activeJob]);

  const toggleCameraMode = useCallback(() => {
    setCameraMode((mode) => {
      if (mode === NAV_CAMERA_MODES.NORTH_UP) {
        setRecenterTrigger((t) => t + 1);
        return NAV_CAMERA_MODES.FOLLOW_HEADING;
      }
      setRecenterTrigger((t) => t + 1);
      return NAV_CAMERA_MODES.NORTH_UP;
    });
    setFreePanned(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setCameraMode(NAV_CAMERA_MODES.FOLLOW_HEADING);
    setRecenterTrigger((t) => t + 1);
    setFreePanned(false);
    void logNavigationTelemetry({
      driver,
      job: activeJob,
      action: "driver_recentered_map",
    });
  }, [driver, activeJob]);

  const handleUserPan = useCallback(() => {
    if (cameraMode === NAV_CAMERA_MODES.ROUTE_OVERVIEW) return;
    setFreePanned(true);
  }, [cameraMode]);

  return (
    // No CSS transform on this shell — Leaflet / MapLibre WebGL go blank when
    // an ancestor uses transform (framer-motion y/opacity wrappers).
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#F2F2F2] h-dvh max-h-dvh overflow-hidden">
      {/* Full-bleed map */}
      <div className="relative flex-1 min-h-0 w-full isolate overflow-hidden bg-[#F2F2F2]">
        {USE_MAPLIBRE && navigationEnabled ? (
          <MapLibreNavigationMap
            lat={displayLat}
            lng={displayLng}
            heading={driverHeading}
            speed={navigation.driverLocation?.speed}
            staleAgeMs={navigation.staleAgeMs}
            routeAheadGeoJson={routeAheadGeoJson}
            stopsGeoJson={stopsGeoJson}
            cameraMode={cameraMode}
            followEnabled={
              cameraMode !== NAV_CAMERA_MODES.ROUTE_OVERVIEW && !freePanned
            }
            recenterTrigger={recenterTrigger}
            fitRouteTrigger={fitRouteTrigger}
            destination={navigation.destinationLatLng}
            onUserPan={handleUserPan}
          />
        ) : (
          <MapContainer
            center={mapCenterRef.current}
            zoom={14}
            scrollWheelZoom
            dragging
            className={`absolute inset-0 w-full h-full z-0 ${DRIVER_MAP_CLASS}`}
            style={{ width: "100%", height: "100%", minHeight: "100%" }}
            whenReady={(event) => {
              const map = event.target;
              const paint = () => {
                try {
                  map.invalidateSize({ animate: false });
                } catch {
                  /* ignore */
                }
              };
              paint();
              window.requestAnimationFrame(paint);
              window.setTimeout(paint, 100);
              window.setTimeout(paint, 400);
              window.setTimeout(paint, 900);
            }}
            {...DRIVER_MAP_LEAFLET_OPTIONS}
          >
            <DriverMapTileLayer />
            <MapLayoutFix revision={layoutRevision} />
            <MapUserPanListener onUserPan={handleUserPan} />

            {navigationEnabled ? (
              <>
                <JobNavigationRouteLayer
                  routeKey={routeLineKey}
                  leafletPositions={navigation.leafletPositions}
                  destination={navigation.destinationLatLng}
                  driverLat={displayLat}
                  driverLng={displayLng}
                  stops={previewStops}
                  fitPaddingBottom={260}
                  fitOnLoad={false}
                  alongRouteM={navigation.alongRouteM}
                />
                <NavigationMapCamera
                  lat={displayLat}
                  lng={displayLng}
                  heading={driverHeading}
                  speed={navigation.driverLocation?.speed}
                  cameraMode={cameraMode}
                  followEnabled={
                    cameraMode !== NAV_CAMERA_MODES.ROUTE_OVERVIEW && !freePanned
                  }
                  routePoints={navigation.leafletPositions}
                  destination={navigation.destinationLatLng}
                  fitRouteTrigger={fitRouteTrigger}
                  recenterTrigger={recenterTrigger}
                  onMarkerHeadingChange={setMarkerHeading}
                  onUserPan={handleUserPan}
                />
              </>
            ) : activeJob && previewStops.length > 0 ? (
              <JobStopsRouteMap stops={previewStops} driverLat={driverLat} driverLng={driverLng} />
            ) : (
              <FollowDriverMap lat={driverLat} lng={driverLng} enabled />
            )}

            <SmoothDriverMarker
              lat={displayLat}
              lng={displayLng}
              icon={driverIcon}
              zIndexOffset={900}
            />
          </MapContainer>
        )}

        {/* Top chrome — back, title, safety */}
        <header
          className="absolute top-0 left-0 right-0 z-[6] pointer-events-none"
          style={{ paddingTop: `calc(${DRIVER_SAFE_TOP} + 6px)` }}
        >
          <div className="px-3 pb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 shadow-sm border border-black/5 flex items-center justify-center active:scale-95"
              aria-label="Back to jobs overview"
            >
              <ChevronLeft className="w-5 h-5 text-black" />
            </button>
            <div className="pointer-events-none px-3 py-1.5 rounded-full bg-white/95 shadow-sm border border-black/5">
              <p className="text-xs font-bold text-black">Jobs map</p>
            </div>
            <DriverHeaderIconButton
              icon={Shield}
              label="Safety"
              variant="outline"
              onClick={onSafetyClick}
              className="pointer-events-auto bg-white/95"
            />
          </div>
        </header>

        {navigation.permissionStatus === "denied" ? (
          <div
            className="absolute left-4 right-4 z-[3] rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-900"
            style={{ top: `calc(${DRIVER_SAFE_TOP} + 64px)` }}
          >
            Location unavailable — enable location services or use Google Maps / Waze below.
          </div>
        ) : null}

        {navigationEnabled ? (
          <MapNavigationControls
            cameraMode={cameraMode}
            driverHeading={driverHeading}
            onShowEntireRoute={handleShowEntireRoute}
            onToggleCompass={toggleCameraMode}
            onRecenter={handleRecenter}
            bottomStyle={{ bottom: "6.5rem" }}
          />
        ) : null}
      </div>

      {/* Bottom stack — instruction art + original white sheet */}
      <div className="relative z-[10] shrink-0">
        {navigationEnabled ? (
          <DriverNavInstructionCard
            instruction={navigation.instruction}
            nextLabel={nextStepLabel}
            maneuver={navigation.maneuver}
            loading={navigation.routeLoading}
            error={navigation.routeError}
          />
        ) : null}

        <div className={navigationEnabled ? "-mt-1" : undefined}>
          <DriverJobsMapSheet
            job={activeJob}
            driver={driver}
            onJobAction={onJobAction}
            actionBusy={actionBusy}
            nearDestination={navigation.canArrive}
            navigationMode={navigationEnabled}
            eta={navigationEnabled ? navigation.formattedDuration : activeJob?.startTime ?? ""}
            distance={navigationEnabled ? navigation.formattedDistanceToDestination : ""}
            hasNavBanner={navigationEnabled}
            onJobReload={onJobReload}
            onSheetLayoutChange={() => setLayoutRevision((n) => n + 1)}
          />
        </div>
      </div>
    </div>
  );
}
