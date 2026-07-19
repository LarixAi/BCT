/**
 * Route map for trip details — pickup → dropoff with blue route line.
 */
import { useEffect, useState, useMemo } from "react";
import { MapContainer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRoadRouteWithMeta } from "@/lib/fetchRoadRoute";
import DriverMapTileLayer from "./DriverMapTileLayer";
import { DRIVER_MAP_LEAFLET_OPTIONS } from "@/lib/driverMapLeafletOptions";
import { DRIVER_MAP_CLASS } from "@/lib/driverMapTheme";
import { offerPickupIcon, offerDropoffIcon } from "./offerMapIcons";

const TRIP_ROUTE_STYLE = {
  color: "#276EF1",
  weight: 6,
  opacity: 1,
  lineCap: "round",
  lineJoin: "round",
};

function FitRouteBounds({ points, routePointCount }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15, animate: false });
  }, [map, routePointCount, points]);
  return null;
}

export default function TripDetailsMap({ booking, className = "", onRouteMeta }) {
  const [route, setRoute] = useState([]);

  const pickup = useMemo(() => {
    if (booking.pickup_lat == null || booking.pickup_lng == null) return null;
    return [booking.pickup_lat, booking.pickup_lng];
  }, [booking.pickup_lat, booking.pickup_lng]);

  const dropoff = useMemo(() => {
    if (booking.dropoff_lat == null || booking.dropoff_lng == null) return null;
    return [booking.dropoff_lat, booking.dropoff_lng];
  }, [booking.dropoff_lat, booking.dropoff_lng]);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoute([]);
      onRouteMeta?.(null);
      return;
    }
    let cancelled = false;
    setRoute([]);
    onRouteMeta?.(null);

    fetchRoadRouteWithMeta(pickup[0], pickup[1], dropoff[0], dropoff[1])
      .then(meta => {
        if (cancelled) return;
        setRoute(meta.positions);
        onRouteMeta?.({
          distanceMi: meta.distanceMi,
          durationSec: meta.durationSec,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRoute([pickup, dropoff]);
        onRouteMeta?.(null);
      });

    return () => {
      cancelled = true;
    };
  }, [booking.id, pickup, dropoff, onRouteMeta]);

  if (!pickup || !dropoff) {
    return (
      <div className={`h-[200px] bg-gray-100 flex items-center justify-center ${className}`}>
        <p className="text-xs text-gray-400">Map unavailable</p>
      </div>
    );
  }

  const linePositions = route.length >= 2 ? route : [pickup, dropoff];
  const centerLat = (pickup[0] + dropoff[0]) / 2;
  const centerLng = (pickup[1] + dropoff[1]) / 2;

  return (
    <div className={`h-[200px] overflow-hidden ${className}`}>
      <MapContainer
        key={`trip-details-${booking.id}`}
        center={[centerLat, centerLng]}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
        attributionControl={false}
        className={DRIVER_MAP_CLASS}
        {...DRIVER_MAP_LEAFLET_OPTIONS}
      >
        <DriverMapTileLayer />
        <Polyline positions={linePositions} pathOptions={TRIP_ROUTE_STYLE} />
        <Marker position={pickup} icon={offerPickupIcon} />
        <Marker position={dropoff} icon={offerDropoffIcon} />
        <FitRouteBounds points={linePositions} routePointCount={linePositions.length} />
      </MapContainer>
    </div>
  );
}
