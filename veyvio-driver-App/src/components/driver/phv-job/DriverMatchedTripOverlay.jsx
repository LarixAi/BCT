import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapContainer } from "react-leaflet";
import DriverMapTileLayer from "@/components/driver/mobile/DriverMapTileLayer";
import SmoothDriverMarker from "@/components/driver/mobile/SmoothDriverMarker";
import JobStopsRouteMap from "@/components/driver/jobs/JobStopsRouteMap";
import { createDriverLocationDot } from "@/components/driver/mobile/driverLocationIcon";
import { DRIVER_MAP_CLASS } from "@/lib/driverMapTheme";
import { DRIVER_MAP_LEAFLET_OPTIONS } from "@/lib/driverMapLeafletOptions";
import { useDriverMapPosition, DEFAULT_MAP_LAT, DEFAULT_MAP_LNG } from "@/hooks/useDriverMapPosition";
import { buildMatchedTripLegs } from "@/lib/matchedTripDisplay";
import { openGoogleMapsNavigation, stopToNavDestination } from "@/lib/navigation/openExternalNavigation";
import {
  markMatchedTripSeen,
  markPhvTripNotificationRead,
} from "@/services/driver-matched-trip.service";
import DriverMatchedTripCard from "@/components/driver/phv-job/DriverMatchedTripCard";

const driverDot = createDriverLocationDot(14);

export default function DriverMatchedTripOverlay({ trip, driver, notificationId, onDismiss }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const { lat: driverLat, lng: driverLng } = useDriverMapPosition(driver?.current_lat, driver?.current_lng);

  const mapCenter = useMemo(() => {
    const pickupStop = trip?.stops?.find((s) => s.stopType === "pickup") ?? trip?.stops?.[0];
    if (pickupStop?.lat != null && pickupStop?.lng != null) {
      return [pickupStop.lat, pickupStop.lng];
    }
    return [driverLat ?? DEFAULT_MAP_LAT, driverLng ?? DEFAULT_MAP_LNG];
  }, [trip?.stops, driverLat, driverLng]);

  const legs = useMemo(
    () =>
      buildMatchedTripLegs({
        driverLat,
        driverLng,
        pickup: trip?.pickup,
        dropoff: trip?.dropoff,
        booking: trip?.booking,
      }),
    [driverLat, driverLng, trip],
  );

  const pickupStop = trip?.stops?.find((s) => s.stopType === "pickup") ?? trip?.stops?.[0];

  async function handleStartNavigation() {
    if (!trip?.id || busy) return;
    setBusy(true);

    markMatchedTripSeen(trip.id);
    await markPhvTripNotificationRead(notificationId);

    const destination = stopToNavDestination(pickupStop);
    if (destination) {
      await openGoogleMapsNavigation(destination, { driver, job: trip });
    }

    onDismiss?.();
    navigate(`/job/${trip.id}`);
    setBusy(false);
  }

  if (!trip) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={trip.id}
        className="fixed inset-0 z-[100] flex flex-col bg-black"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
      >
        <div className="relative flex-1 min-h-0">
          <MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom={false}
            className={`absolute inset-0 h-full w-full ${DRIVER_MAP_CLASS}`}
            {...DRIVER_MAP_LEAFLET_OPTIONS}
          >
            <DriverMapTileLayer />
            {trip.stops?.length ? (
              <JobStopsRouteMap stops={trip.stops} driverLat={driverLat} driverLng={driverLng} compact />
            ) : null}
            <SmoothDriverMarker lat={driverLat} lng={driverLng} icon={driverDot} />
          </MapContainer>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
        </div>

        <div className="shrink-0 bg-[#f3f3f3] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-x-hidden max-w-full">
          <DriverMatchedTripCard trip={trip} legs={legs} onStartNavigation={() => void handleStartNavigation()} busy={busy} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
