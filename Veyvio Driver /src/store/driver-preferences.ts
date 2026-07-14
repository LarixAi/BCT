import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/platform/storage/safe-local-storage";
import type {
  MapDisplayFilter,
  NavigationRouteFilter,
  TripsTodayFilter,
} from "@/types/driver-filters";

interface DriverPreferencesStore {
  navigationRouteFilter: NavigationRouteFilter;
  mapDisplayFilter: MapDisplayFilter;
  tripsTodayFilter: TripsTodayFilter;
  setNavigationRouteFilter: (filter: NavigationRouteFilter) => void;
  setMapDisplayFilter: (filter: MapDisplayFilter) => void;
  setTripsTodayFilter: (filter: TripsTodayFilter) => void;
}

export const useDriverPreferencesStore = create<DriverPreferencesStore>()(
  persist(
    (set) => ({
      navigationRouteFilter: "fastest",
      mapDisplayFilter: "standard",
      tripsTodayFilter: "all",

      setNavigationRouteFilter: (navigationRouteFilter) => set({ navigationRouteFilter }),
      setMapDisplayFilter: (mapDisplayFilter) => set({ mapDisplayFilter }),
      setTripsTodayFilter: (tripsTodayFilter) => set({ tripsTodayFilter }),
    }),
    {
      name: "veyvio-driver-preferences-v1",
      storage: createJSONStorage(() => safeLocalStorage()),
    },
  ),
);
