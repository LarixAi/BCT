import { create } from "zustand";
import {
  deriveSpeedKmh,
  shouldEnableDrivingSafetyMode,
} from "@/domain/safety/vehicle-motion";

interface VehicleMotionStore {
  speedKmh: number | null;
  vehicleMoving: boolean;
  lastPosition: { latitude: number; longitude: number; recordedAt: string } | null;
  ingestPosition: (input: {
    latitude: number;
    longitude: number;
    recordedAt: string;
    speedMps?: number | null;
  }) => void;
  reset: () => void;
}

export const useVehicleMotionStore = create<VehicleMotionStore>((set, get) => ({
  speedKmh: null,
  vehicleMoving: false,
  lastPosition: null,

  ingestPosition: (input) => {
    const previous = get().lastPosition;
    const current = {
      latitude: input.latitude,
      longitude: input.longitude,
      recordedAt: input.recordedAt,
    };
    const speedKmh = deriveSpeedKmh({
      previous: previous ?? undefined,
      current,
      reportedSpeedMps: input.speedMps,
    });
    const vehicleMoving = shouldEnableDrivingSafetyMode(speedKmh);
    set({ speedKmh, vehicleMoving, lastPosition: current });
  },

  reset: () => set({ speedKmh: null, vehicleMoving: false, lastPosition: null }),
}));
