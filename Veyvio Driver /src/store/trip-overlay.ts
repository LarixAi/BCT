import { create } from "zustand";
import type { TripOverlayPayload } from "@/platform/driver-focus/adapters/stub-adapters";

export type TripOverlayMode = "off" | "web_float" | "android_pip" | "ios_live_activity";

interface TripOverlayStore {
  visible: boolean;
  mode: TripOverlayMode;
  payload: TripOverlayPayload | null;
  dutyId: string | null;
  pipDenied: boolean;
  show: (mode: TripOverlayMode, payload: TripOverlayPayload) => void;
  update: (payload: TripOverlayPayload) => void;
  hide: () => void;
  setPipDenied: (denied: boolean) => void;
}

export const useTripOverlayStore = create<TripOverlayStore>((set, get) => ({
  visible: false,
  mode: "off",
  payload: null,
  dutyId: null,
  pipDenied: false,

  show: (mode, payload) =>
    set({
      visible: true,
      mode,
      payload,
      dutyId: payload.dutyId,
    }),

  update: (payload) => {
    if (!get().visible) return;
    set({ payload, dutyId: payload.dutyId });
  },

  hide: () =>
    set({
      visible: false,
      mode: "off",
      payload: null,
      dutyId: null,
    }),

  setPipDenied: (denied) => set({ pipDenied: denied }),
}));
