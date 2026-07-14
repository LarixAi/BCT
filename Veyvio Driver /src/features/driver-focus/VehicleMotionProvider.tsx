import { useEffect } from "react";
import { useDriverStore } from "@/store/driver";
import { useVehicleMotionStore } from "@/store/vehicle-motion";

export function VehicleMotionProvider() {
  const setDrivingSafetyMode = useDriverStore((s) => s.setDrivingSafetyMode);
  const ingestPosition = useVehicleMotionStore((s) => s.ingestPosition);
  const reset = useVehicleMotionStore((s) => s.reset);
  const vehicleMoving = useVehicleMotionStore((s) => s.vehicleMoving);
  const activeDutyId = useDriverStore((s) => s.activeDutyId);
  const duty = useDriverStore((s) =>
    s.activeDutyId ? s.getDuty(s.activeDutyId) : null,
  );

  const trackingActive =
    Boolean(activeDutyId) && duty?.lifecycleStatus === "in_progress";

  useEffect(() => {
    if (!trackingActive || typeof navigator === "undefined" || !navigator.geolocation) {
      reset();
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
        // GPS unavailable — driving safety mode stays off.
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      reset();
    };
  }, [trackingActive, ingestPosition, reset]);

  useEffect(() => {
    setDrivingSafetyMode(vehicleMoving);
  }, [vehicleMoving, setDrivingSafetyMode]);

  return null;
}
