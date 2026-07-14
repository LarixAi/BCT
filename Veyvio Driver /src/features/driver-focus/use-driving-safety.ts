import { useMemo } from "react";
import {
  getDrivingSafetyRestrictions,
  isSafeDrivingAction,
  type DrivingSafetyAction,
} from "@/domain/safety/vehicle-motion";
import { useDriverStore } from "@/store/driver";
import { useVehicleMotionStore } from "@/store/vehicle-motion";

export function useDrivingSafety() {
  const vehicleMoving = useVehicleMotionStore((s) => s.vehicleMoving);
  const speedKmh = useVehicleMotionStore((s) => s.speedKmh);
  const drivingSafetyMode = useDriverStore((s) => s.drivingSafetyMode);
  const isRestricted = vehicleMoving || drivingSafetyMode;

  const canPerform = useMemo(
    () => (action: DrivingSafetyAction) => isSafeDrivingAction(action, isRestricted),
    [isRestricted],
  );

  return {
    vehicleMoving,
    speedKmh,
    isRestricted,
    canPerform,
    restrictions: getDrivingSafetyRestrictions(),
  };
}
