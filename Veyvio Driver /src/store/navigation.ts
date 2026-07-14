import { create } from "zustand";
import type { DutyDetail } from "@/types/duty";
import type { JourneyRoute } from "@/domain/journey/turn-by-turn-types";
import { buildStopFingerprint } from "@/domain/journey/navigation-fingerprint";
import { fetchJourneyRoute } from "@/platform/routing/fetch-osrm-route";
import { useDriverPreferencesStore } from "@/store/driver-preferences";

type RouteStatus = "idle" | "loading" | "ready" | "error";

interface NavigationStore {
  routes: Record<string, JourneyRoute | undefined>;
  status: Record<string, RouteStatus>;
  loadRoute: (dutyId: string, duty: DutyDetail) => Promise<void>;
  clearRoute: (dutyId: string) => void;
}

function routeCacheKey(dutyId: string, duty: DutyDetail): string {
  const routeFilter = useDriverPreferencesStore.getState().navigationRouteFilter;
  return `${dutyId}:${buildStopFingerprint(duty)}:${routeFilter}`;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  routes: {},
  status: {},

  loadRoute: async (dutyId, duty) => {
    const cacheKey = routeCacheKey(dutyId, duty);
    const existing = get().routes[dutyId];
    if (existing?.stopFingerprint === cacheKey && get().status[dutyId] === "ready") {
      return;
    }
    if (get().status[dutyId] === "loading") return;

    set((state) => ({
      status: { ...state.status, [dutyId]: "loading" },
    }));

    try {
      const routeFilter = useDriverPreferencesStore.getState().navigationRouteFilter;
      const route = await fetchJourneyRoute(duty, dutyId, routeFilter);
      set((state) => ({
        routes: {
          ...state.routes,
          [dutyId]: { ...route, stopFingerprint: cacheKey },
        },
        status: { ...state.status, [dutyId]: "ready" },
      }));
    } catch {
      set((state) => ({
        status: { ...state.status, [dutyId]: "error" },
      }));
    }
  },

  clearRoute: (dutyId) =>
    set((state) => {
      const routes = { ...state.routes };
      const status = { ...state.status };
      delete routes[dutyId];
      delete status[dutyId];
      return { routes, status };
    }),
}));

export function useNavigationRoute(dutyId: string) {
  return useNavigationStore((state) => state.routes[dutyId]);
}

export function useNavigationStatus(dutyId: string): RouteStatus {
  return useNavigationStore((state) => state.status[dutyId] ?? "idle");
}
