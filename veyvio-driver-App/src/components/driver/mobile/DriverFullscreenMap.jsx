/**
 * DriverFullscreenMap — Full-screen map view matching Uber Driver's map mode.
 * Shown when driver taps "expand" on the home map card.
 * Features: full map, floating top bar, right-side action buttons,
 * bottom status bar, and blue GO button.
 */
import { useState, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer } from "react-leaflet";
import { Shield } from "lucide-react";
import DriverHomeHeader from "./DriverHomeHeader";
import DriverTripDestinationBanner from "./DriverTripDestinationBanner";
import DriverGpsBanner from "./DriverGpsBanner";
import DriverSosModal from "./DriverSosModal";
import DriverMapTileLayer from "./DriverMapTileLayer";
import ActiveTripRouteLayer from "./ActiveTripRouteLayer";
import SmoothDriverMarker from "./SmoothDriverMarker";
import FollowDriverMap from "./FollowDriverMap";
import { createDriverLocationIcon } from "./driverLocationIcon";
import { DRIVER_MAP_CLASS } from "@/lib/driverMapTheme";
import { DRIVER_MAP_LEAFLET_OPTIONS } from "@/lib/driverMapLeafletOptions";
import { driverGoButtonBottom } from "@/lib/driverSafeArea";
import { useDriverMapPosition, DEFAULT_MAP_LAT, DEFAULT_MAP_LNG } from "@/hooks/useDriverMapPosition";

const driverIcon = createDriverLocationIcon(40);

function DriverFullscreenMap({
  driver,
  onClose,
  todayEarnings,
  todayTrips,
  activeBooking,
  pendingOffer,
  islandPulse,
  onIslandPulseEnd,
  onSeeWeeklySummary,
  onOpenHotAreas,
  onRoutePreviewChange,
  routePreview,
}) {
  const navigate = useNavigate();
  const openHotAreas = onOpenHotAreas || (() => navigate("/driver/hot-areas", { state: { returnToMap: true } }));
  const [showSos, setShowSos] = useState(false);
  const { lat: driverLat, lng: driverLng, gpsStatus } = useDriverMapPosition(
    driver.current_lat,
    driver.current_lng
  );
  const mapCenterRef = useRef([
    driver.current_lat ?? DEFAULT_MAP_LAT,
    driver.current_lng ?? DEFAULT_MAP_LNG,
  ]);

  return (
    <div className="absolute inset-0 z-10">
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenterRef.current}
          zoom={14}
          scrollWheelZoom
          dragging
          className={`w-full h-full ${DRIVER_MAP_CLASS}`}
          {...DRIVER_MAP_LEAFLET_OPTIONS}
        >
          <DriverMapTileLayer />
          {activeBooking && (
            <ActiveTripRouteLayer
              booking={activeBooking}
              driverLat={driverLat}
              driverLng={driverLng}
              onRoutePreviewChange={onRoutePreviewChange}
            />
          )}
          <SmoothDriverMarker lat={driverLat} lng={driverLng} icon={driverIcon} />
          {!activeBooking && (
            <FollowDriverMap lat={driverLat} lng={driverLng} enabled />
          )}
        </MapContainer>
      </div>

      <div className="absolute top-0 left-0 right-0" style={{ zIndex: 9999 }}>
        <DriverHomeHeader
          driver={driver}
          todayEarnings={todayEarnings || 0}
          todayTrips={todayTrips || 0}
          onHomePress={onClose}
          islandPulse={islandPulse}
          onIslandPulseEnd={onIslandPulseEnd}
          onSeeWeeklySummary={onSeeWeeklySummary}
          onOpenHotAreas={openHotAreas}
        />
        {activeBooking && gpsStatus !== "ok" && (
          <DriverGpsBanner status={gpsStatus} />
        )}
        {activeBooking && (
          <DriverTripDestinationBanner booking={activeBooking} routePreview={routePreview} />
        )}
      </div>

      <div
        className="absolute"
        style={{
          bottom: driverGoButtonBottom(),
          left: "max(16px, env(safe-area-inset-left, 0px))",
          zIndex: 9999,
        }}
      >
        <button
          type="button"
          aria-label="SOS and safety"
          onClick={() => setShowSos(true)}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Shield className="w-5 h-5 text-blue-600" />
        </button>
      </div>

      <DriverSosModal
        open={showSos}
        onClose={() => setShowSos(false)}
        activeBooking={activeBooking || pendingOffer}
      />
    </div>
  );
}

export default memo(DriverFullscreenMap);
