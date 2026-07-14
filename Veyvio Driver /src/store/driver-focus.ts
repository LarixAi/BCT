import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeLocalStorage } from "@/platform/storage/safe-local-storage";
import type { DriverFocusSettings } from "@/types/driver-focus";
import { DEFAULT_DRIVER_FOCUS_SETTINGS } from "@/types/driver-focus";
import type { ActiveTripSnapshot, DriverFocusPermissions } from "@/types/active-trip";
import { DEFAULT_DRIVER_FOCUS_PERMISSIONS } from "@/types/active-trip";
import { driverFocusCoordinator } from "@/platform/driver-focus/driver-focus-coordinator";
import { driverFocusAudit } from "@/platform/driver-focus/driver-focus-audit";

interface DriverFocusStore {
  settings: DriverFocusSettings;
  permissions: DriverFocusPermissions;
  recoverySnapshot: ActiveTripSnapshot | null;
  updateSettings: (patch: Partial<DriverFocusSettings>) => void;
  resetSettings: () => void;
  updatePermissions: (patch: Partial<DriverFocusPermissions>) => void;
  setRecoverySnapshot: (snapshot: ActiveTripSnapshot | null) => void;
}

export const useDriverFocusStore = create<DriverFocusStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_DRIVER_FOCUS_SETTINGS,
      permissions: DEFAULT_DRIVER_FOCUS_PERMISSIONS,
      recoverySnapshot: null,

      updateSettings: (patch) => {
        const previous = get().settings;
        const next = { ...previous, ...patch };
        set({ settings: next });
        void driverFocusCoordinator.onSettingsChanged(next, previous);
      },

      resetSettings: () => {
        const previous = get().settings;
        set({ settings: DEFAULT_DRIVER_FOCUS_SETTINGS });
        void driverFocusCoordinator.onSettingsChanged(DEFAULT_DRIVER_FOCUS_SETTINGS, previous);
      },

      updatePermissions: (patch) => {
        const next = { ...get().permissions, ...patch };
        set({ permissions: next });
        if (patch.notificationsGranted === true) {
          driverFocusAudit.record("OVERLAY_PERMISSION_GRANTED", "notifications");
        }
        if (patch.locationGranted === true) {
          driverFocusAudit.record("OVERLAY_PERMISSION_GRANTED", "location");
        }
      },

      setRecoverySnapshot: (snapshot) => set({ recoverySnapshot: snapshot }),
    }),
    {
      name: "veyvio-driver-focus-v1",
      storage: createJSONStorage(() => safeLocalStorage()),
      partialize: (state) => ({
        settings: state.settings,
        permissions: state.permissions,
      }),
    },
  ),
);

export function useDriverFocusSettings(): DriverFocusSettings {
  return useDriverFocusStore((state) => state.settings);
}

export function useDriverFocusAudit() {
  return driverFocusAudit.list();
}
