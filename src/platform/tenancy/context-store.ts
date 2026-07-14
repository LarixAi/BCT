import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Company, Depot, TenancyContext } from "@/types/tenancy";
import type { YardRole } from "@/types/permissions";

interface TenancyStore extends TenancyContext {
  selectCompany: (company: Company, role: YardRole) => void;
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
        return !!(s.companyId && s.depotId && s.role);
      },
    }),
    {
      name: "veyvio-yard-tenancy-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getTenancySnapshot(): TenancyContext & { role: string | null } {
  return useTenancyStore.getState();
}
