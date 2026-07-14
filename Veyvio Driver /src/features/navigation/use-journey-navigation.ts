import { useEffect, useMemo, useState } from "react";
import { buildJourneyMapStops, estimateDriverPosition } from "@/domain/journey/journey-map";
import { buildStopFingerprint } from "@/domain/journey/navigation-fingerprint";
import { resolveCurrentStepIndex } from "@/domain/journey/osrm-instructions";
import {
  formatNavDistance,
  formatNavDuration,
  formatNavEta,
  type NavStep,
} from "@/domain/journey/turn-by-turn-types";
import type { NavigationRouteFilter } from "@/types/driver-filters";
import { useDriverStore } from "@/store/driver";
import { useDriverPreferencesStore } from "@/store/driver-preferences";
import {
  useNavigationRoute,
  useNavigationStatus,
  useNavigationStore,
} from "@/store/navigation";

export function useEnsureJourneyRoute(dutyId: string) {
  const duty = useDriverStore((state) => state.getDuty(dutyId));
  const loadRoute = useNavigationStore((state) => state.loadRoute);
  const fingerprint = useMemo(() => (duty ? buildStopFingerprint(duty) : ""), [duty]);
  const [routeFilter, setRouteFilter] = useState<NavigationRouteFilter>(
    () => useDriverPreferencesStore.getState().navigationRouteFilter,
  );

  useEffect(() => {
    return useDriverPreferencesStore.subscribe((state) => {
      setRouteFilter(state.navigationRouteFilter);
    });
  }, []);

  useEffect(() => {
    if (!duty) return;
    void loadRoute(dutyId, duty);
  }, [duty, dutyId, fingerprint, routeFilter, loadRoute]);
}

export function useJourneyNavigation(dutyId: string) {
  const duty = useDriverStore((state) => state.getDuty(dutyId));
  useEnsureJourneyRoute(dutyId);
  const route = useNavigationRoute(dutyId);
  const status = useNavigationStatus(dutyId);
  const loadRoute = useNavigationStore((state) => state.loadRoute);

  const driverPosition = useMemo(() => {
    if (!duty) return null;
    return estimateDriverPosition(buildJourneyMapStops(duty));
  }, [duty]);

  const currentStepIndex = useMemo(() => {
    if (!route) return 0;
    return resolveCurrentStepIndex(route.steps, route.geometry, driverPosition);
  }, [route, driverPosition]);

  const currentStep = route?.steps[currentStepIndex] ?? null;
  const nextStep = route?.steps[currentStepIndex + 1] ?? null;
  const upcomingSteps = route?.steps.slice(currentStepIndex + 1, currentStepIndex + 4) ?? [];

  return {
    duty,
    route,
    status,
    driverPosition,
    currentStepIndex,
    currentStep,
    nextStep,
    upcomingSteps,
    etaLabel: route ? formatNavDuration(route.totalDurationS) : null,
    etaClock: route ? formatNavEta(route.totalDurationS) : null,
    distanceLabel: route ? formatNavDistance(route.totalDistanceM) : null,
    reload: () => {
      if (duty) void loadRoute(dutyId, duty);
    },
  };
}

export function remainingDistanceToStep(steps: NavStep[], fromIndex: number): number {
  return steps.slice(fromIndex).reduce((sum, step) => sum + step.distanceM, 0);
}
