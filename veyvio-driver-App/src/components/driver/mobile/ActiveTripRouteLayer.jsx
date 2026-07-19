/**
 * Active trip route preview — driver → next stop (pickup or dropoff) via OSRM.
 * Pickup/dropoff markers shown; polyline follows roads (not straight line).
 */
import { useEffect, useState, useMemo, useRef } from "react";
import { Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { fetchRoadRouteWithMeta } from "@/lib/fetchRoadRoute";
import { getTripNavTarget, hasNavCoordinates } from "@/lib/googleNavLauncher";
import { offerPickupIcon, offerDropoffIcon } from "./offerMapIcons";
import { DRIVER_MAP_ROUTE_STYLE } from "@/lib/driverMapTheme";
import { coarseCoord } from "@/lib/smoothGps";

/** Fit once per trip leg — never on live driver movement (causes map flutter). */
function FitActiveTripBounds({ pickup, dropoff, dest, tripKey }) {
  const map = useMap();
  const fittedKeyRef = useRef(null);

  useEffect(() => {
    if (fittedKeyRef.current === tripKey) return;
    const staticPoints = [pickup, dropoff, dest].filter(
      (p) => p && p[0] != null && p[1] != null
    );
    if (staticPoints.length < 2) return;

    fittedKeyRef.current = tripKey;
    map.fitBounds(L.latLngBounds(staticPoints), {
      padding: [100, 48],
      maxZoom: 15,
      animate: true,
    });
  }, [map, tripKey, pickup, dropoff, dest]);

  return null;
}

export default function ActiveTripRouteLayer({
  booking,
  driverLat,
  driverLng,
  onRoutePreviewChange,
}) {
  const [route, setRoute] = useState([]);
  const onChangeRef = useRef(onRoutePreviewChange);
  onChangeRef.current = onRoutePreviewChange;

  const target = useMemo(() => getTripNavTarget(booking), [booking]);
  const leg = target?.leg;

  const pickup = useMemo(() => {
    if (booking.pickup_lat == null || booking.pickup_lng == null) return null;
    return [booking.pickup_lat, booking.pickup_lng];
  }, [booking.pickup_lat, booking.pickup_lng]);

  const dropoff = useMemo(() => {
    if (booking.dropoff_lat == null || booking.dropoff_lng == null) return null;
    return [booking.dropoff_lat, booking.dropoff_lng];
  }, [booking.dropoff_lat, booking.dropoff_lng]);

  const dest = useMemo(() => {
    if (!target || !hasNavCoordinates(target)) return null;
    return [target.lat, target.lng];
  }, [target]);

  const driverGrid = useMemo(
    () => [coarseCoord(driverLat), coarseCoord(driverLng)],
    [driverLat, driverLng]
  );

  useEffect(() => {
    if (!dest || driverLat == null || driverLng == null) {
      setRoute([]);
      onChangeRef.current?.(null);
      return;
    }

    let cancelled = false;
    onChangeRef.current?.({ leg, loading: true, distanceMi: null, durationSec: null });

    fetchRoadRouteWithMeta(driverLat, driverLng, dest[0], dest[1])
      .then((meta) => {
        if (cancelled) return;
        setRoute(meta.positions);
        onChangeRef.current?.({
          leg,
          loading: false,
          distanceMi: meta.distanceMi,
          durationSec: meta.durationSec,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRoute([[driverLat, driverLng], dest]);
        onChangeRef.current?.({ leg, loading: false, distanceMi: null, durationSec: null });
      });

    return () => {
      cancelled = true;
    };
  }, [booking.id, leg, dest, driverGrid, driverLat, driverLng]);

  if (!dest) return null;

  const linePositions =
    route.length >= 2 ? route : [[driverLat, driverLng], dest];

  const tripKey = `${booking.id}-${leg}`;

  return (
    <>
      <Polyline positions={linePositions} pathOptions={DRIVER_MAP_ROUTE_STYLE} />
      {pickup && (
        <Marker
          position={pickup}
          icon={offerPickupIcon}
          zIndexOffset={leg === "pickup" ? 600 : 400}
          opacity={leg === "pickup" ? 1 : 0.55}
        />
      )}
      {dropoff && (
        <Marker
          position={dropoff}
          icon={offerDropoffIcon}
          zIndexOffset={leg === "dropoff" ? 600 : 400}
          opacity={leg === "dropoff" ? 1 : 0.55}
        />
      )}
      <FitActiveTripBounds
        pickup={pickup}
        dropoff={dropoff}
        dest={dest}
        tripKey={tripKey}
      />
    </>
  );
}
