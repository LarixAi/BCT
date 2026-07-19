/**
 * Pickup → dropoff route overlay on the fullscreen map (optional).
 */
import { useEffect, useState, useMemo } from "react";
import { Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { fetchRoadRoute } from "@/lib/fetchRoadRoute";
import { offerPickupIcon, offerDropoffIcon } from "./offerMapIcons";
import { DRIVER_MAP_ROUTE_STYLE } from "@/lib/driverMapTheme";

function FitOfferBounds({ points, offerId, routePointCount }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [120, 48], maxZoom: 14, animate: true });
  }, [map, offerId, routePointCount, points]);
  return null;
}

export default function OfferRouteLayer({ booking, driverLat, driverLng }) {
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
      return;
    }
    let cancelled = false;
    setRoute([]);
    fetchRoadRoute(pickup[0], pickup[1], dropoff[0], dropoff[1])
      .then(pts => { if (!cancelled) setRoute(pts); })
      .catch(() => { if (!cancelled) setRoute([pickup, dropoff]); });
    return () => { cancelled = true; };
  }, [booking.id, pickup, dropoff]);

  if (!pickup || !dropoff) return null;

  const linePositions = route.length >= 2 ? route : [pickup, dropoff];
  const fitPoints = [[driverLat, driverLng], ...linePositions].filter(p => p[0] != null);

  return (
    <>
      <Polyline positions={linePositions} pathOptions={DRIVER_MAP_ROUTE_STYLE} />
      <Marker position={pickup} icon={offerPickupIcon} zIndexOffset={500} />
      <Marker position={dropoff} icon={offerDropoffIcon} zIndexOffset={500} />
      <FitOfferBounds points={fitPoints} offerId={booking.id} routePointCount={linePositions.length} />
    </>
  );
}
