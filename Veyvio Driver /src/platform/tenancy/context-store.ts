import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Company, Depot, TenancyContext } from "@/types/tenancy";
import { getSessionSnapshot } from "@/platform/auth/session-store";

interface TenancyStore extends TenancyContext {
  selectCompany: (company: Company, role: string) => void;
  selectDepot: (depot: Depot) => void;
  clearContext: () => void;
  isContextComplete: () => boolean;
}

const EMPTY: TenancyContext = {
  companyId: null,
  companyName: null,
  depotId: null,
  depotName: null,
  depotCode: null,
  driverId: null,
  role: null,
};

export const useTenancyStore = create<TenancyStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      selectCompany: (company, role) =>
        set({
          companyId: company.id,
          companyName: company.name,
          role,
          driverId: getSessionSnapshot().user?.driverId ?? null,
          depotId: null,
          depotName: null,
          depotCode: null,
        }),

      selectDepot: (depot) =>
        set({
          depotId: depot.id,
          depotName: depot.name,
          depotCode: depot.code,
        }),

      clearContext: () => set({ ...EMPTY }),

      isContextComplete: () => {
        const s = get();
        return !!(s.companyId && s.depotId && s.driverId && s.role);
      },
    }),
    {
      name: "veyvio-driver-tenancy-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getTenancySnapshot(): TenancyContext {
  return useTenancyStore.getState();
}
