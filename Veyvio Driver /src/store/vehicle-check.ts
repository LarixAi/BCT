import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CheckItemResult,
  DefectReportDraft,
  VehicleCheckSession,
  VehicleChecksHome,
} from "@/types/vehicle-check";
import {
  buildMockVehicleChecksHome,
  createCheckSession,
  buildDemoCheckSession,
} from "@/data/mocks/vehicle-check";
import {
  allItemsAnswered,
  canSubmitCheck,
  formatCheckReference,
} from "@/domain/vehicle-check/check-helpers";
import { isOnline } from "@/platform/device/connectivity";

interface VehicleCheckStore {
  checksHome: VehicleChecksHome;
  activeSession: VehicleCheckSession | null;

  hydrateChecksHome: (home: VehicleChecksHome) => void;
  startCheck: () => VehicleCheckSession;
  loadSession: (sessionId: string) => VehicleCheckSession | null;
  setVerification: (input: {
    verified: boolean;
    odometer?: number;
    fuelLevel?: string;
    dashboardPhotoTaken?: boolean;
    mismatch?: VehicleCheckSession["verificationMismatch"];
  }) => void;
  setItemResult: (itemId: string, result: CheckItemResult) => void;
  addDefect: (defect: DefectReportDraft) => void;
  setBodyworkConfirmation: (noNewDamage: boolean) => void;
  setDeclarationHeld: (held: boolean) => void;
  submitCheck: () => { outcome: VehicleCheckSession["outcome"]; reference: string };
  resetSession: () => void;
  ensureDemoSession: () => void;
}

export const useVehicleCheckStore = create<VehicleCheckStore>()(
  persist(
    (set, get) => ({
  checksHome: buildMockVehicleChecksHome(),
  activeSession: null,

  hydrateChecksHome: (home) => set({ checksHome: home }),

  startCheck: () => {
    const home = get().checksHome;
    const session = createCheckSession(home);
    set({
      activeSession: session,
      checksHome: {
        ...home,
        activeCheckId: session.id,
        vehicle: { ...home.vehicle, gateStatus: "check_in_progress" },
        primaryActionLabel: "Continue check",
        primaryActionHref: "/checks/walkaround",
      },
    });
    return session;
  },

  loadSession: (sessionId) => {
    const session = get().activeSession;
    return session?.id === sessionId ? session : null;
  },

  setVerification: (input) =>
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          verified: input.verified,
          verificationMismatch: input.mismatch,
          odometer: input.odometer ?? s.activeSession.odometer,
          fuelLevel: input.fuelLevel ?? s.activeSession.fuelLevel,
          dashboardPhotoTaken: input.dashboardPhotoTaken ?? s.activeSession.dashboardPhotoTaken,
          phase: input.verified ? "walkaround" : "verification",
        },
      };
    }),

  setItemResult: (itemId, result) =>
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          itemResults: {
            ...s.activeSession.itemResults,
            [itemId]: {
              itemId,
              result,
              recordedAt: new Date().toISOString(),
            },
          },
        },
      };
    }),

  addDefect: (defect) =>
    set((s) => {
      if (!s.activeSession) return s;
      const defects = [...s.activeSession.defects, defect];
      const hasSafety = defects.some((d) => d.severity === "safety_critical");
      return {
        activeSession: {
          ...s.activeSession,
          defects,
          itemResults: {
            ...s.activeSession.itemResults,
            [defect.itemId]: {
              itemId: defect.itemId,
              result: "defect",
              recordedAt: new Date().toISOString(),
            },
          },
        },
        checksHome: hasSafety
          ? {
              ...s.checksHome,
              vehicle: { ...s.checksHome.vehicle, gateStatus: "vehicle_held" },
            }
          : s.checksHome,
      };
    }),

  setBodyworkConfirmation: (noNewDamage) =>
    set((s) => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          bodyworkNoNewDamage: noNewDamage,
          newDamageReported: !noNewDamage,
        },
      };
    }),

  setDeclarationHeld: (held) =>
    set((s) => {
      if (!s.activeSession) return s;
      return { activeSession: { ...s.activeSession, declarationHeld: held } };
    }),

  submitCheck: () => {
    const { activeSession, checksHome } = get();
    if (!activeSession) throw new Error("No active check session");

    const online = isOnline();
    const hasSafetyDefect = activeSession.defects.some((d) => d.severity === "safety_critical");
    const hasAnyDefect = activeSession.defects.length > 0;
    const reference = formatCheckReference();

    let outcome: VehicleCheckSession["outcome"];
    let gateStatus = checksHome.vehicle.gateStatus;

    if (hasSafetyDefect) {
      outcome = online ? "safety_critical_blocked" : "offline_blocked";
      gateStatus = "vehicle_held";
    } else if (hasAnyDefect) {
      outcome = "defect_awaiting_review";
      gateStatus = "awaiting_approval";
    } else {
      outcome = "nil_defects";
      gateStatus = "ready_for_service";
    }

    const completedSession: VehicleCheckSession = {
      ...activeSession,
      phase: "submitted",
      completedAt: new Date().toISOString(),
      outcome,
      checkReference: reference,
      syncStatus: online ? "synced" : "offline_saved",
    };

    set({
      activeSession: completedSession,
      checksHome: {
        ...checksHome,
        activeCheckId: undefined,
        vehicle: {
          ...checksHome.vehicle,
          gateStatus,
          lastCompletedCheck:
            outcome === "nil_defects"
              ? {
                  id: completedSession.id,
                  reference,
                  completedAt: new Date().toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  result: "nil_defects",
                  odometer: completedSession.odometer ?? checksHome.vehicle.mileage,
                }
              : checksHome.vehicle.lastCompletedCheck,
        },
        primaryActionLabel:
          outcome === "nil_defects"
            ? "View completed check"
            : hasSafetyDefect
              ? "Contact Operations"
              : "View report",
        primaryActionHref: "/checks/result",
      },
    });

    return { outcome, reference };
  },

  resetSession: () => set({ activeSession: null }),

  ensureDemoSession: () => {
    const home = get().checksHome;
    if (!get().activeSession) {
      set({ activeSession: buildDemoCheckSession(home) });
    }
  },
    }),
    {
      name: "veyvio-driver-vehicle-check-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        checksHome: state.checksHome,
        activeSession: state.activeSession,
      }),
    },
  ),
);

export function useCanSubmitCheck() {
  const session = useVehicleCheckStore((s) => s.activeSession);
  const accessible = useVehicleCheckStore((s) => s.checksHome.vehicle.accessibilityCapable);
  if (!session) return false;
  return canSubmitCheck(session, accessible) && allItemsAnswered(session, accessible);
}
