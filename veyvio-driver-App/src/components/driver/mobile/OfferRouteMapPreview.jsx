/**
 * Embedded pickup → dropoff map for the job offer card.
 */
import { useEffect, useState, useMemo } from "react";
import { MapContainer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRoadRoute } from "@/lib/fetchRoadRoute";
import DriverMapTileLayer from "./DriverMapTileLayer";
import { DRIVER_MAP_LEAFLET_OPTIONS } from "@/lib/driverMapLeafletOptions";
import { DRIVER_MAP_CLASS, DRIVER_MAP_ROUTE_STYLE_COMPACT } from "@/lib/driverMapTheme";
import {
  offerPickupIconCompact,
  offerDropoffIconCompact,
  driverDotIcon,
} from "./offerMapIcons";

function FitRouteBounds({ points, routePointCount }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15, animate: false });
  }, [map, routePointCount, points]);
  return null;
}

export default function OfferRouteMapPreview({ booking, driverLat, driverLng, className = "" }) {
  const [route, setRoute] = useState([]);

  const pickup = useMemo(() => {
    if (booking.pickup_lat == null || booking.pickup_lng == null) return null;
    return [booking.pickup_lat, booking.pickup_lng];
  }, [booking.pickup_lat, booking.pickup_lng]);

  const dropoff = useMemo(() => {
    if (booking.dropoff_lat == null || booking.dropoff_lng == null) return null;
    return [booking.dropoff_lat, booking.dropoff_lng];
  }, [booking.dropoff_lat, booking.dropoff_lng]);

  const hasDriver = driverLat != null && driverLng != null;

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoute([]);
      return;
    }
    let cancelled = false;
    setRoute([]);
    fetchRoadRoute(pickup[0], pickup[1], dropoff[0], dropoff[1])
      .then(pts => { if (!cancelled) setRoute(pts); })
      .catch(() => { if (!cancelled) setRoute([pickup, dropoff]); });
    return () => { cancelled = true; };
  }, [booking.id, pickup, dropoff]);

  if (!pickup || !dropoff) {
    return (
      <div className={`h-32 rounded-xl bg-gray-100 flex items-center justify-center ${className}`}>
        <p className="text-xs text-gray-400">Map unavailable</p>
      </div>
    );
  }

  const linePositions = route.length >= 2 ? route : [pickup, dropoff];
  const centerLat = (pickup[0] + dropoff[0]) / 2;
  const centerLng = (pickup[1] + dropoff[1]) / 2;
  const fitPoints = [
    ...(hasDriver ? [[driverLat, driverLng]] : []),
    ...linePositions,
  ];

  return (
    <div className={`h-36 rounded-xl overflow-hidden border border-gray-200 ${className}`}>
      <MapContainer
        key="driver-map-offer-preview"
        center={[centerLat, centerLng]}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        className={DRIVER_MAP_CLASS}
        {...DRIVER_MAP_LEAFLET_OPTIONS}
      >
        <DriverMapTileLayer />
        <Polyline positions={linePositions} pathOptions={DRIVER_MAP_ROUTE_STYLE_COMPACT} />
        {hasDriver && <Marker position={[driverLat, driverLng]} icon={driverDotIcon} />}
        <Marker position={pickup} icon={offerPickupIconCompact} />
        <Marker position={dropoff} icon={offerDropoffIconCompact} />
        <FitRouteBounds points={fitPoints} routePointCount={linePositions.length} />
      </MapContainer>
    </div>
  );
}
