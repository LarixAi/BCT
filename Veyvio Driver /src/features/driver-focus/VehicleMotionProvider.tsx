import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isNavRoute } from "@/domain/driver/nav-routes";
import { useDriverStore } from "@/store/driver";
import { useVehicleMotionStore } from "@/store/vehicle-motion";

/**
 * Watches browser / Capacitor geolocation (including Chrome Sensors “Custom location”)
 * while a journey is in progress or the driver is on a map-nav route.
 */
export function VehicleMotionProvider() {
  const setDrivingSafetyMode = useDriverStore((s) => s.setDrivingSafetyMode);
  const ingestPosition = useVehicleMotionStore((s) => s.ingestPosition);
  const reset = useVehicleMotionStore((s) => s.reset);
  const vehicleMoving = useVehicleMotionStore((s) => s.vehicleMoving);
  const activeDutyId = useDriverStore((s) => s.activeDutyId);
  const duty = useDriverStore((s) =>
    s.activeDutyId ? s.getDuty(s.activeDutyId) : null,
  );
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onNavMap = isNavRoute(pathname);

  const trackingActive =
    onNavMap ||
    (Boolean(activeDutyId) && duty?.lifecycleStatus === "in_progress");

  useEffect(() => {
    if (!trackingActive || typeof navigator === "undefined" || !navigator.geolocation) {
      if (!trackingActive) reset();
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        ingestPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          recordedAt: new Date(position.timestamp).toISOString(),
          speedMps: position.coords.speed,
        });
      },
      () => {
        // GPS unavailable — map falls back to duty-stop estimate.
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [trackingActive, ingestPosition, reset]);

  useEffect(() => {
    setDrivingSafetyMode(vehicleMoving);
  }, [vehicleMoving, setDrivingSafetyMode]);

  return null;
}
